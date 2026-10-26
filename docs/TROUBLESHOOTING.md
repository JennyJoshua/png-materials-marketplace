# Troubleshooting (local development)

Server messages appear in the **command prompt window where `npm run dev` is running**. Errors there are shortened and secrets are removed, so you can copy them when asking for help.

## Registration shows "Supabase is not configured" (HTTP 503)

(`node check-env.mjs` checks your `.env` the way Next.js reads it and never prints secrets. It also checks the structure of the two database URLs.)

The server cannot find your Supabase settings.

1. The file must be named exactly `.env` and sit in the project root, next to `package.json`.
2. It must contain these names, spelled exactly, each with a value after the `=`:
   - `NEXT_PUBLIC_SUPABASE_URL` (Supabase: Project Settings, API, Project URL, like `https://abcd1234.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase: Project Settings, API, the `anon` public key)
3. **Stop the dev server (Ctrl+C) and run `npm run dev` again.** Next.js reads `.env` only when it starts.

If you have not created the Supabase project yet, do `docs/SETUP_SUPABASE.md` sections 1 to 4 first, then read section 5 before touching the database.

## Terminal shows `AuthRetryableFetchError: fetch failed`

The server found a URL but could not reach it. Check that `NEXT_PUBLIC_SUPABASE_URL` is the Project URL copied exactly, that the Supabase project is not paused, and that your internet connection or firewall allows it.

## Registration says it worked, but sign-in says the account setup is incomplete

The account exists in Supabase but the database profile could not be saved. The terminal line starting `[register: profile creation]` names the reason:

| Message contains | Meaning | Fix |
|---|---|---|
| `P2021` or "table ... does not exist" | The Phase 1 tables are not in the database you are connected to | Check that `DATABASE_URL` and `DIRECT_URL` point at the Supabase project where the migration was applied manually. **Do not run `prisma migrate deploy` against the existing live database**; read `docs/SETUP_SUPABASE.md` section 5 first |
| `P1001`, "Can't reach database server" | Wrong `DATABASE_URL`, or the host is not reachable | Re-copy the connection string; if it has special characters in the password, URL-encode them; try the session-pooler string |
| `P1000`, "Authentication failed" | Wrong database password | Reset it in Supabase and update `.env` |
| `P1012` or "Environment variable not found" | `DATABASE_URL` or `DIRECT_URL` missing | Add both to `.env` and restart |
| "The provided database string is invalid" / "invalid port number in database URL" | `DATABASE_URL` is not a valid URL. Common causes: a `/`, `?` or `#` in the password that is not URL-encoded, a non-numeric port, a stray space or quote. In a `.env` file an unquoted `#` also starts a comment and cuts the value short | Run `node check-env.mjs` (it names the problem without printing the value). Correct the value (`/` = `%2F`, `?` = `%3F`, `#` = `%23`, `@` = `%40`). For the live service see `docs/SETUP_RENDER.md` section 3 (needs the owner's approval) |

After fixing, sign in once; the profile is rebuilt automatically at sign-in.

## Sign-in or the confirmation link says the service is temporarily unavailable

You see "The service is temporarily unavailable. Please try again shortly." (or an API answers HTTP 503 with code `DATABASE_UNAVAILABLE`, or you land on `/login?error=unavailable`). Supabase accepted the request but the application could not reach its database, for example because of an invalid `DATABASE_URL`. The app ends your session so you are not left half signed in. The cause is in the server log on the line starting `[login: unexpected failure]`, `[auth callback: unexpected failure]` or `[api access: database]`; the log never contains the password. Check the database URL as described in the table above.

## Terminal shows "conflicting public file and page file ... /icon.svg"

The same icon exists in both `app/icon.svg` and `public/icon.svg`. Delete **`public/icon.svg`** and keep `app/icon.svg`. The test suite now fails with a clear message if this happens again.

## `npm install` fails while downloading Prisma engines

Prisma downloads small engine files from `binaries.prisma.sh`. Some networks block it. Try a different network or a mobile hotspot, then run `npm install` again.

## The confirmation email never arrives, or the link fails

- Supabase's built-in email sender has a very low sending limit and is meant for testing. Wait, or configure your own SMTP in Supabase.
- The link needs `http://localhost:3000/auth/callback` in Supabase, Authentication, URL Configuration, Redirect URLs.
- To test without email, you can turn **Confirm email** off in Supabase while developing, and turn it back on before launch.

## Quick checks

```bash
npm run lint
npm run typecheck
npm test
```

All three should pass before you report a problem.
