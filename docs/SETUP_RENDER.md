# Render deployment guide

**Deployment status: unconfirmed in the available evidence.** This guide is the plan and checklist. Do not treat the service as deployed, or as not deployed, until the status is confirmed and recorded in docs/REVIEW.md.

```
GitHub repository -> Render Web Service -> Next.js app -> Supabase (Auth, PostgreSQL, Storage)
```

## 1. Prerequisites

- The Supabase project exists and the Phase 1 migration was applied manually. Prisma's migration history is not yet baselined (docs/SETUP_SUPABASE.md section 5).
- The code is pushed to GitHub (`JennyJoshua/png-materials-marketplace`, branch `main`).

## 2. Create the web service

1. In Render, choose New, Web Service, and connect the GitHub repository.
2. Runtime: **Node**. Branch: `main`.
3. Build command:

   ```
   npm ci && npm run build
   ```

   (`postinstall` runs `prisma generate` automatically.)
4. Start command:

   ```
   npm start
   ```

   Next.js listens on the `PORT` Render provides.
5. Health check path: `/`.
6. Set `NODE_VERSION` to `20` or `22` (the app needs Node 20.9 or newer).

## 3. Environment variables

Set these in the service's Environment settings (never in the repository):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler, port 6543, `?pgbouncer=true` |
| `DIRECT_URL` | Direct or session-pooler string. Only needed where migrations run |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server only |
| `NEXT_PUBLIC_SITE_URL` | Required for hosted deployments behind a proxy. Set the public `https://` URL before building. |

`NEXT_PUBLIC_*` values are baked in at build time. If you change them, trigger a new deploy. `DATABASE_URL` is read when the server runs.

For authentication confirmation redirects, set `NEXT_PUBLIC_SITE_URL` to the public site origin (for example `https://your-service.onrender.com`) before building. The callback uses only the scheme, host and port; paths and query strings are discarded. Missing or invalid values fall back to the request origin and produce a one-time configuration warning, but that fallback may be an internal Render address. Rebuild/redeploy after changing this variable because `NEXT_PUBLIC_*` values are baked in at build time.

### Checking `DATABASE_URL` without revealing it

A Render log on 2026-10-23 showed "The provided database string is invalid ... invalid port number in database URL" and the cause was not established. To check the current value's structure:

1. On your own computer, open the Render dashboard, Environment, and copy the `DATABASE_URL` and `DIRECT_URL` values into your **local** `.env` (never into chat, an issue, a commit or a screenshot).
2. Run `node check-env.mjs`. It never connects and never prints the values. It reports problems such as an unencoded `/`, `?` or `#` in the password, a non-numeric port, or a missing database name.
3. If it reports nothing, the URL is well formed. The problem is then elsewhere (for example a wrong password or an unreachable host).

### Correcting a bad value (needs the owner's approval)

Nothing here has been changed. If the checker finds a problem, the simplest safe correction is:

1. In Supabase, reset the database password to one made of letters and digits only (no special characters), so no URL-encoding is ever needed. This invalidates the old password for every client, including the live service, so do steps 2 and 3 straight away, at a quiet time.
2. Copy the fresh connection strings from Supabase (Connect). Replace the password placeholder. Keep `?pgbouncer=true` on the transaction-pooler string (port 6543) used as `DATABASE_URL`.
3. Paste the new values into Render's `DATABASE_URL` and `DIRECT_URL` fields and save. Render restarts the service. Update your local `.env` too.
4. Run `node check-env.mjs` locally, then watch the Render logs for database errors.

If you keep the existing password instead, URL-encode its special characters (`/` = `%2F`, `?` = `%3F`, `#` = `%23`, `@` = `%40`, `:` = `%3A`).

## 4. Migrations

Do not add any migration command to the Render build command or start command.

The Phase 1 migration was applied manually to the live database. **Do not run `prisma migrate deploy`, `migrate dev`, `migrate reset` or `db push` against it** until Prisma's migration history is baselined (docs/SETUP_SUPABASE.md section 5). After that, later migrations are applied deliberately, one reviewed migration at a time, from your own computer against the Supabase `DIRECT_URL`. If Render's network cannot reach an IPv6-only direct host, use the session-pooler string.

## 5. Supabase URL configuration for production

In Supabase, Authentication, URL Configuration:

- Site URL: your production URL.
- Redirect URLs: add `https://<your-service>.onrender.com/auth/callback`.

Without this, confirmation emails cannot return users to the app.

## 6. After the first deploy: checks to run yourself

- Open `/register`, create a customer, confirm the email, and land on `/customer/dashboard`.
- Open `/admin/dashboard` while signed in as that customer: you must be redirected away.
- Sign out and open `/customer/dashboard`: you must be sent to `/login`.

## 7. Known production notes

- The in-memory rate limiter is per instance and resets on restart (ARCHITECTURE.md A9).
- Add a Content-Security-Policy header before launch.
- Render's free tier sleeps idle services; the first request after a sleep is slow.
