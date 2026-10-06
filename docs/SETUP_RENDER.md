# Render deployment guide

**Deployment has not been performed.** This is the plan for when the project owner is ready.

```
GitHub repository -> Render Web Service -> Next.js app -> Supabase (Auth, PostgreSQL, Storage)
```

## 1. Prerequisites

- The Supabase project exists and the migration is applied (docs/SETUP_SUPABASE.md).
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
| `NEXT_PUBLIC_SITE_URL` | Your production URL, for example `https://your-service.onrender.com` |

`NEXT_PUBLIC_*` values are baked in at build time. If you change them, trigger a new deploy.

## 4. Migrations

Apply migrations deliberately, not on every start. For Phase 1, run `npx prisma migrate deploy` from your own computer against the Supabase `DIRECT_URL`. If Render's network cannot reach an IPv6-only direct host, use the session-pooler string.

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
