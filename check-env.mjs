// Run from the project folder:  node check-env.mjs
// Checks your .env setup exactly the way Next.js reads it, and checks the STRUCTURE of the two
// database URLs. It never connects to anything and NEVER prints secret values or the connection
// strings: only variable names, lengths and what looks wrong. Exit code 0 = no problems found.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const cwd = process.cwd();
const problems = [];
const note = (text) => problems.push(text);

/**
 * Structural check of a PostgreSQL connection string. Returns a list of problems.
 * The messages never contain any part of the value.
 */
export function inspectDatabaseUrl(key, value) {
  const flags = [];
  const m = value.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/i);
  if (!m) return flags; // a missing/wrong scheme is reported separately
  const rest = m[2];

  // The authority (user:password@host:port) ends at the first / ? or #.
  const end = rest.search(/[/?#]/);
  const authority = end === -1 ? rest : rest.slice(0, end);
  const afterAuthority = end === -1 ? "" : rest.slice(end);
  const at = authority.lastIndexOf("@");

  if (at === -1) {
    if (afterAuthority.includes("@")) {
      flags.push(
        "the password probably contains a / ? or # that is not URL-encoded, which cuts the URL off before the host (this is what causes \"invalid port number in database URL\"). Encode them: / = %2F, ? = %3F, # = %23",
      );
    } else {
      flags.push("there is no user:password@ part before the host");
    }
    return flags;
  }

  const userinfo = authority.slice(0, at);
  const hostport = authority.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const password = colon === -1 ? "" : userinfo.slice(colon + 1);

  if (!password) {
    flags.push("no password was found in the URL");
  } else {
    const withoutEscapes = password.replace(/%[0-9A-Fa-f]{2}/g, "");
    if (/%/.test(withoutEscapes)) flags.push("a % in the password is not followed by two hex digits (a literal % must be written %25)");
    const counts = { "@": 0, ":": 0, "[": 0, "]": 0 };
    for (const ch of withoutEscapes) if (ch in counts) counts[ch] += 1;
    const names = { "@": "@ (use %40)", ":": ": (use %3A)", "[": "[ (use %5B)", "]": "] (use %5D)" };
    const found = Object.entries(counts).filter(([, n]) => n > 0).map(([ch]) => names[ch]);
    if (found.length > 0) flags.push(`the password contains characters that should be URL-encoded: ${found.join(", ")}`);
    if (/\s/.test(password)) flags.push("the password contains a space or other whitespace");
  }

  if (!hostport) {
    flags.push("there is no host after the @");
  } else {
    const idx = hostport.lastIndexOf(":");
    if (idx !== -1) {
      const port = hostport.slice(idx + 1);
      const number = Number(port);
      if (!/^\d{1,5}$/.test(port) || number < 1 || number > 65535) {
        flags.push("the port is not a valid number (it must be digits only, like 6543 or 5432)");
      }
      if (idx === 0) flags.push("there is no host before the port");
    }
  }

  const dbName = afterAuthority.replace(/^\//, "").split(/[?#]/)[0];
  if (!afterAuthority.startsWith("/") || !dbName) flags.push("there is no database name after the host (expected /postgres)");
  void key;
  return flags;
}

function main() {
  console.log("Project folder:", cwd);
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    console.log("\nPROBLEM: there is no package.json here. Open Command Prompt INSIDE the project folder first.");
    process.exitCode = 1;
    return;
  }

  // 1. Which env files exist?
  console.log("\nEnvironment files in this folder:");
  const names = fs.readdirSync(cwd).filter((n) => n.toLowerCase().startsWith(".env"));
  if (names.length === 0) note("No .env file found. Create one by copying .env.example to .env.");
  for (const name of names) console.log(`  ${name}  (${fs.statSync(path.join(cwd, name)).size} bytes)`);
  for (const name of names) {
    if (/\.env\.(txt|rtf|docx?)$/i.test(name)) note(`"${name}" is wrong: Windows added a hidden extension. Rename it to exactly ".env" (turn on View > File name extensions in File Explorer).`);
  }
  if (names.includes(".env.example") && !names.includes(".env")) note('Only ".env.example" exists. Copy it to ".env" and fill in the values.');

  // 2. Read .env as raw bytes: check the encoding, which silently breaks the file on Windows.
  const envPath = path.join(cwd, ".env");
  const rawVars = new Map();
  if (fs.existsSync(envPath)) {
    const buf = fs.readFileSync(envPath);
    let text;
    if (buf[0] === 0xff && buf[1] === 0xfe) {
      note('".env" is saved as UTF-16 (common when created with PowerShell ">" or "echo"). Next.js cannot read it. Re-save it in Notepad: File > Save As > Encoding: UTF-8.');
      text = buf.toString("utf16le");
    } else if (buf[0] === 0xfe && buf[1] === 0xff) {
      note('".env" is saved as UTF-16. Re-save it in Notepad with Encoding: UTF-8.');
      text = "";
    } else {
      if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) console.log("\n(.env starts with a UTF-8 BOM; harmless.)");
      text = buf.toString("utf8");
    }
    console.log("\nLines in .env (values hidden):");
    text.split(/\r?\n/).forEach((line, i) => {
      const trimmed = line.replace(/^\uFEFF/, "").trim();
      if (!trimmed) return;
      if (trimmed.startsWith("#")) return console.log(`  ${i + 1}: comment`);
      const m = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
      if (!m) {
        note(`Line ${i + 1} is not in NAME=value form (starts with "${trimmed.slice(0, 6).replace(/[A-Za-z0-9]/g, "*")}"). Each setting must be on ONE line like NAME=value.`);
        return console.log(`  ${i + 1}: NOT NAME=value`);
      }
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      rawVars.set(m[1], value);
      console.log(`  ${i + 1}: ${m[1]} -> ${value ? `has a value (${value.length} characters)` : "EMPTY"}`);
    });
  }

  // 3. What Next.js itself sees.
  let seen = process.env;
  try {
    const { loadEnvConfig } = require("@next/env");
    const before = { ...process.env };
    const result = loadEnvConfig(cwd, true, { info() {}, error() {} });
    console.log("\nNext.js loads these env files:", (result.loadedEnvFiles ?? []).map((f) => f.path).join(", ") || "(none)");
    seen = process.env;
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "DIRECT_URL"]) {
      if (key in before && rawVars.has(key) && before[key] !== rawVars.get(key)) {
        note(`${key} is ALREADY set in your Windows environment, which overrides .env. Remove it: in Command Prompt run  set ${key}=  and restart, or delete it in Windows "Environment Variables".`);
      }
    }
  } catch {
    console.log("\n(Could not run Next.js's own env loader; run npm install first for a more exact check.)");
  }

  // 4. Check each required setting.
  const required = [
    ["NEXT_PUBLIC_SUPABASE_URL", "Supabase Project Settings > API > Project URL"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase API keys: the anon / Publishable key"],
    ["SUPABASE_SERVICE_ROLE_KEY", "Supabase API keys: the service_role / Secret key (server only)"],
    ["DATABASE_URL", "Supabase Connect > Transaction pooler (port 6543)"],
    ["DIRECT_URL", "Supabase Connect > Direct connection or Session pooler (port 5432)"],
  ];
  console.log("\nWhat the app will actually see:");
  for (const [key, where] of required) {
    const value = (seen[key] ?? "").trim();
    if (!value) {
      const norm = (k) => k.replace(/_/g, "").toLowerCase();
      const requiredNames = required.map(([name]) => name);
      const alt = [...rawVars.keys()].find(
        (k) => k !== key && !requiredNames.includes(k) && (norm(key).includes(norm(k)) || norm(k).includes(norm(key))),
      );
      console.log(`  ${key}: MISSING or EMPTY`);
      note(`${key} is missing or empty. Get it from: ${where}.${alt ? ` (You have "${alt}": the name must be exactly ${key}.)` : ""}`);
      continue;
    }
    const flags = [];
    if (/\[?YOUR[-_ ]?PASSWORD\]?|<[^>]+>|\bxxxx+\b|placeholder|your[-_]project/i.test(value)) flags.push("still contains a placeholder");
    // In a .env file an unquoted # starts a comment, so the loader cuts the value short.
    const raw = rawVars.get(key);
    if (raw !== undefined && raw.includes("#") && value.length < raw.length) {
      flags.unshift("contains a # which a .env file treats as the start of a comment, so the value was cut short before the app saw it (write # as %23 inside a password, or wrap the whole value in quote marks)");
    }
    if (key === "NEXT_PUBLIC_SUPABASE_URL" && !/^https?:\/\/[^/\s]+/.test(value)) flags.push("must start with https://");
    if (key === "NEXT_PUBLIC_SUPABASE_URL" && /\/(rest|auth)\/v1/.test(value)) flags.push("use only the Project URL, without /rest/v1");
    if ((key === "DATABASE_URL" || key === "DIRECT_URL") && !/^postgres(ql)?:\/\//.test(value)) flags.push("must start with postgresql://");
    if ((key === "DATABASE_URL" || key === "DIRECT_URL") && /^postgres(ql)?:\/\//.test(value)) flags.push(...inspectDatabaseUrl(key, value));
    if (key === "DATABASE_URL" && /^postgres/.test(value) && !/pgbouncer=true/.test(value)) flags.push("add ?pgbouncer=true at the end (and use port 6543)");
    if (key === "SUPABASE_SERVICE_ROLE_KEY" && seen.NEXT_PUBLIC_SUPABASE_ANON_KEY && value === seen.NEXT_PUBLIC_SUPABASE_ANON_KEY) flags.push("is identical to the anon key; it must be the different service_role / Secret key");
    if (/^["']|["']$/.test(seen[key] ?? "")) flags.push("has quote marks inside the value");
    console.log(`  ${key}: ${flags.length ? "PROBLEM" : "ok"} (${value.length} characters)${flags.length ? " - " + flags.join("; ") : ""}`);
    for (const f of flags) note(`${key}: ${f}.`);
  }

  console.log("\n" + "=".repeat(60));
  if (problems.length === 0) {
    console.log("Everything looks right. Stop the dev server (Ctrl+C) and run npm run dev again.");
  } else {
    console.log(`Found ${problems.length} thing(s) to fix:\n`);
    problems.forEach((p, i) => console.log(` ${i + 1}. ${p}`));
    console.log("\nAfter fixing: Ctrl+C, then npm run dev again. It is safe to copy this output: it contains no secret values.");
    process.exitCode = 1;
  }
}

// Run main() only when executed directly (not when imported). pathToFileURL is correct on Windows too.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
