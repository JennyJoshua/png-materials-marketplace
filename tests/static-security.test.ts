import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "coverage"].includes(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const rel = (f: string) => path.relative(root, f);
const sourceFiles = walk(root).filter((f) => /\.(ts|tsx)$/.test(f));

const stripSqlComments = (sql: string) => sql.replace(/--.*$/gm, "");
const stripCodeComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const migrationDir = path.join(root, "prisma", "migrations");
const migrationSql = readdirSync(migrationDir)
  .filter((d) => statSync(path.join(migrationDir, d)).isDirectory())
  .map((d) => readFileSync(path.join(migrationDir, d, "migration.sql"), "utf8"))
  .join("\n");

const PHASE1_TABLES = ["users", "customer_profiles", "supplier_profiles", "product_categories", "audit_logs"];

describe("migration: Phase 1 tables and Row Level Security (static validation)", () => {
  const created = [...migrationSql.matchAll(/CREATE TABLE "([a-z_]+)"/g)].map((m) => m[1]);

  it("creates exactly the five Phase 1 tables and no later-phase tables", () => {
    expect([...created].sort()).toEqual([...PHASE1_TABLES].sort());
    for (const later of ["products", "supplier_products", "price_history", "projects", "rfqs", "quotations", "orders", "notifications"]) {
      expect(created).not.toContain(later);
    }
  });

  it("enables RLS on every Phase 1 table", () => {
    for (const table of PHASE1_TABLES) {
      expect(migrationSql).toMatch(new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
    }
  });

  it("creates no policies, and nothing like USING (true)", () => {
    const sql = stripSqlComments(migrationSql);
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });

  it("revokes table privileges from the Supabase client roles", () => {
    expect(migrationSql).toMatch(/REVOKE ALL ON TABLE/);
    expect(migrationSql).toMatch(/'anon'/);
    expect(migrationSql).toMatch(/'authenticated'/);
  });

  it("has no password/hash/token columns and no foreign key to the Supabase auth schema", () => {
    const columns = [...migrationSql.matchAll(/^\s+"([a-z_]+)"\s+(?:TEXT|UUID|BOOLEAN|JSONB|TIMESTAMPTZ|"[A-Za-z]+")/gm)].map((m) => m[1]);
    expect(columns.length).toBeGreaterThan(20);
    for (const column of columns) expect(column).not.toMatch(/pass|hash|token|secret/i);
    expect(migrationSql).not.toMatch(/auth\.users/i);
    expect(migrationSql).not.toMatch(/REFERENCES\s+"?auth"?\./i);
  });

  it("gives users.id no database default (the id is the Supabase Auth UUID)", () => {
    const usersTable = migrationSql.match(/CREATE TABLE "users" \(([\s\S]*?)\n\);/)?.[1] ?? "";
    expect(usersTable).toMatch(/"id" UUID NOT NULL,/);
    expect(usersTable).not.toMatch(/"id" UUID NOT NULL DEFAULT/);
  });
});

describe("Prisma schema", () => {
  const schema = read("prisma/schema.prisma");

  it("declares only the five Phase 1 models", () => {
    const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
    expect(models.sort()).toEqual(["AuditLog", "CustomerProfile", "ProductCategory", "SupplierProfile", "User"]);
  });

  it("uses the pooled DATABASE_URL at runtime and DIRECT_URL for migrations", () => {
    expect(schema).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
    expect(schema).toMatch(/directUrl\s*=\s*env\("DIRECT_URL"\)/);
  });

  it("has no password fields and no relation to the Supabase auth schema", () => {
    const fields = schema.split("\n").filter((l) => /^\s+\w+\s+\w/.test(l) && !l.trim().startsWith("//"));
    for (const line of fields) expect(line.trim().split(/\s+/)[0]).not.toMatch(/pass|hash|token|secret/i);
    expect(schema).not.toMatch(/schemas\s*=/);
  });
});

describe("secrets and client/server separation", () => {
  const tracked = walk(root).filter((f) => !f.includes("package-lock.json"));

  it("never imports the service-role admin client or env secrets from a client component", () => {
    const clientFiles = sourceFiles.filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
    expect(clientFiles.length).toBeGreaterThan(0);
    for (const file of clientFiles) {
      const code = readFileSync(file, "utf8");
      expect(code, rel(file)).not.toMatch(/supabase\/admin|getServiceRoleKey|SUPABASE_SERVICE_ROLE_KEY|@\/lib\/db\/prisma|@prisma\/client/);
    }
  });

  it("only server code imports the privileged admin client", () => {
    const importers = sourceFiles
      .filter((f) => !rel(f).startsWith("tests/") && /supabase\/admin/.test(readFileSync(f, "utf8")))
      .map(rel)
      .sort();
    expect(importers).toEqual(["app/api/auth/register/route.ts"]);
  });

  it("never exposes the service-role key through a NEXT_PUBLIC_ variable", () => {
    for (const file of tracked.filter((f) => !f.includes(`${path.sep}tests${path.sep}`))) {
      if (!/\.(ts|tsx|md|mjs|json|example)$/.test(file) && !file.endsWith(".env.example")) continue;
      expect(readFileSync(file, "utf8"), rel(file)).not.toMatch(/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/);
    }
  });

  it("keeps .env.example to placeholders only (no real-looking credentials)", () => {
    const example = read(".env.example");
    for (const line of example.split("\n")) {
      if (!/^[A-Z_]+=/.test(line)) continue;
      const value = line.slice(line.indexOf("=") + 1).trim();
      expect(value, line).toBe("");
    }
    expect(example).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(example).not.toMatch(/postgres(ql)?:\/\/[^\s]+:[^\s]+@/);
  });

  it("has no hard-coded JWTs, database URLs with passwords or Supabase secret keys in source", () => {
    for (const file of sourceFiles.filter((f) => !rel(f).startsWith("tests/"))) {
      const code = readFileSync(file, "utf8");
      expect(code, rel(file)).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/);
      expect(code, rel(file)).not.toMatch(/postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`]+@[^\s"'`]+/);
      expect(code, rel(file)).not.toMatch(/sb_secret_[A-Za-z0-9_-]{10,}/);
    }
  });

  it("ignores .env files but keeps .env.example tracked", () => {
    const ignore = read(".gitignore").split("\n").map((l) => l.trim());
    for (const entry of [".env", ".env.local", ".env.*.local", "node_modules/", ".next/", "coverage/"]) {
      expect(ignore, entry).toContain(entry);
    }
    expect(ignore).toContain("!.env.example");
    expect(existsSync(path.join(root, ".env"))).toBe(false);
    expect(existsSync(path.join(root, ".env.local"))).toBe(false);
  });

  it("has no custom password or token code left (bcryptjs / jose removed)", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(all).not.toHaveProperty("bcryptjs");
    expect(all).not.toHaveProperty("jose");
    expect(all).toHaveProperty("@supabase/ssr");
    expect(all).toHaveProperty("@supabase/supabase-js");
    for (const file of sourceFiles) {
      expect(readFileSync(file, "utf8"), rel(file)).not.toMatch(/from ["'](bcryptjs|jose)["']/);
    }
  });

  it("uses getUser() for server identity and never getSession()", () => {
    for (const file of sourceFiles.filter((f) => !rel(f).startsWith("tests/"))) {
      expect(readFileSync(file, "utf8"), rel(file)).not.toMatch(/auth\.getSession\s*\(/);
    }
  });

  it("does not read an authorization role from user_metadata", () => {
    for (const file of sourceFiles.filter((f) => !rel(f).startsWith("tests/"))) {
      expect(stripCodeComments(readFileSync(file, "utf8")), rel(file)).not.toMatch(/user_metadata\??\.role/);
    }
  });
});

describe("Phase boundary", () => {
  it("has no Phase 2+ routes or APIs", () => {
    const routes = walk(path.join(root, "app")).map((f) => rel(f).split(path.sep).join("/"));
    for (const forbidden of ["products", "rfqs", "quotations", "orders", "projects", "marketplace"]) {
      expect(routes.some((r) => r.split("/").includes(forbidden)), forbidden).toBe(false);
    }
  });
});
