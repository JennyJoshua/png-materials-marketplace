/**
 * Tests the real command-line tool (node check-env.mjs) against crafted .env files in temporary
 * folders. The tool must find the problem, exit non-zero, and NEVER print secret values.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const script = path.resolve(__dirname, "..", "check-env.mjs");
const made: string[] = [];

const PW = "Sup3r-Secret-Pw";
const HOST = "aws-0-ap-southeast-2.pooler.supabase.com";
const url = (opts: { user?: string; password?: string; hostport?: string; db?: string; query?: string } = {}) => {
  const { user = "postgres.abcdefgh", password = PW, hostport = `${HOST}:6543`, db = "/postgres", query = "?pgbouncer=true" } = opts;
  return `postgresql://${user}:${password}@${hostport}${db}${query}`;
};

const goodEnv = (overrides: Record<string, string> = {}) => {
  const base: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value-0123456789",
    SUPABASE_SERVICE_ROLE_KEY: "service-key-value-9876543210",
    DATABASE_URL: url(),
    DIRECT_URL: url({ hostport: `${HOST}:5432`, query: "" }),
    ...overrides,
  };
  return Object.entries(base).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
};

function run(envText: string | null, files: Record<string, string> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "check-env-"));
  made.push(dir);
  writeFileSync(path.join(dir, "package.json"), '{"name":"x"}');
  if (envText !== null) writeFileSync(path.join(dir, ".env"), envText);
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
  const result = spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: dir, USERPROFILE: dir } as unknown as NodeJS.ProcessEnv });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const SECRETS = [PW, "anon-key-value", "service-key-value", "abcdefgh", HOST, "abcdefghijklmnop"];
const expectNoSecrets = (out: string) => {
  for (const secret of SECRETS) expect(out, `output must not contain ${secret}`).not.toContain(secret);
};

describe("check-env.mjs", () => {
  it("accepts a correct .env, exits 0, and prints no secret values", () => {
    const r = run(goodEnv());
    expect(r.code).toBe(0);
    expect(r.out).toContain("Everything looks right");
    expectNoSecrets(r.out);
  });

  it.each([
    ["a / in the password", `Sup3r/Secret`, /cuts the URL off before the host/],
    ["a ? in the password", `Sup3r?Secret`, /cuts the URL off before the host/],
  ])("finds the cause of 'invalid port number in database URL': %s", (_label, password, expected) => {
    const r = run(goodEnv({ DATABASE_URL: url({ password }) }));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(expected);
    expect(r.out).toContain("invalid port number in database URL");
    expectNoSecrets(r.out);
    expect(r.out).not.toContain(password);
  });

  it("finds a # in the password: a .env file treats it as the start of a comment and cuts the value short", () => {
    const r = run(goodEnv({ DATABASE_URL: url({ password: "Sup3r#Secret" }) }));
    expect(r.code).toBe(1);
    expect(r.out).toContain("treats as the start of a comment");
    expect(r.out).toContain("write # as %23");
    expectNoSecrets(r.out);
    expect(r.out).not.toContain("Sup3r");
  });

  it("accepts the same password when the # is written as %23", () => {
    expect(run(goodEnv({ DATABASE_URL: url({ password: "Sup3r%23Secret" }) })).code).toBe(0);
  });

  it("accepts a # inside a quoted value (the loader keeps it)", () => {
    const env = goodEnv().replace(/^DATABASE_URL=(.*)$/m, (_m, v: string) => `DATABASE_URL="${v.replace(PW, "Sup3r#Secret")}"`);
    const r = run(env);
    expect(r.out).not.toContain("start of a comment");
  });

  it("flags a port that is not a number", () => {
    const r = run(goodEnv({ DATABASE_URL: url({ hostport: `${HOST}:65x4` }) }));
    expect(r.code).toBe(1);
    expect(r.out).toContain("the port is not a valid number");
    expectNoSecrets(r.out);
  });

  it("flags a port above 65535", () => {
    const r = run(goodEnv({ DIRECT_URL: url({ hostport: `${HOST}:70000`, query: "" }) }));
    expect(r.out).toContain("the port is not a valid number");
  });

  it("flags an @ or : in the password that should be URL-encoded, without printing it", () => {
    const r = run(goodEnv({ DIRECT_URL: url({ password: "pa@ss:word1", hostport: `${HOST}:5432`, query: "" }) }));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/should be URL-encoded: @ \(use %40\), : \(use %3A\)/);
    expect(r.out).not.toContain("pa@ss");
  });

  it("accepts a password whose special characters are properly URL-encoded", () => {
    const r = run(goodEnv({ DATABASE_URL: url({ password: "pa%40ss%2Fword%23%3F1" }) }));
    expect(r.code).toBe(0);
  });

  it("flags a stray % that is not an escape", () => {
    const r = run(goodEnv({ DATABASE_URL: url({ password: "100%sure" }) }));
    expect(r.out).toContain("a % in the password is not followed by two hex digits");
  });

  it("flags a leftover [YOUR-PASSWORD] placeholder", () => {
    const r = run(goodEnv({ DATABASE_URL: url({ password: "[YOUR-PASSWORD]" }) }));
    expect(r.code).toBe(1);
    expect(r.out).toContain("still contains a placeholder");
  });

  it("flags a missing database name and a missing password", () => {
    expect(run(goodEnv({ DIRECT_URL: url({ db: "", query: "" }) })).out).toContain("no database name after the host");
    const noPw = `postgresql://postgres.abcdefgh@${HOST}:5432/postgres`;
    expect(run(goodEnv({ DIRECT_URL: noPw })).out).toContain("no password was found");
  });

  it("flags a runtime URL without ?pgbouncer=true", () => {
    const r = run(goodEnv({ DATABASE_URL: url({ query: "" }) }));
    expect(r.out).toContain("add ?pgbouncer=true");
  });

  it("reports missing variables by name, with a hint for a near-miss name", () => {
    const env = goodEnv().replace("NEXT_PUBLIC_SUPABASE_URL=", "SUPABASE_URL=");
    const r = run(env);
    expect(r.code).toBe(1);
    expect(r.out).toContain("NEXT_PUBLIC_SUPABASE_URL is missing or empty");
    expect(r.out).toContain('You have "SUPABASE_URL"');
    expectNoSecrets(r.out);
  });

  it("detects a UTF-16 .env and a hidden .env.txt extension", () => {
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(goodEnv(), "utf16le")]);
    const dir = mkdtempSync(path.join(tmpdir(), "check-env-"));
    made.push(dir);
    writeFileSync(path.join(dir, "package.json"), '{"name":"x"}');
    writeFileSync(path.join(dir, ".env"), utf16);
    const a = spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } as unknown as NodeJS.ProcessEnv });
    expect(a.stdout).toContain("saved as UTF-16");
    expect(a.stdout).not.toContain(PW);

    const b = run(null, { ".env.txt": goodEnv() });
    expect(b.out).toContain("Windows added a hidden extension");
  });

  it("does nothing when imported (only runs when executed directly)", () => {
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", `const m = await import(${JSON.stringify(pathToFileURL(script).href)}); console.log(typeof m.inspectDatabaseUrl)`], {
      encoding: "utf8",
      cwd: tmpdir(),
    });
    expect(r.stdout.trim()).toBe("function");
  });
});
