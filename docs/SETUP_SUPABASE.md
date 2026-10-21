# Supabase setup (manual steps for the project owner)

Nothing in this repository can create your Supabase project or apply the migration for you. Do these steps once. **Never put real credentials in GitHub.**

Status note (2026-10-21): the live project already exists and the Phase 1 migration was applied manually. If you are working on that project, read section 5 before running any Prisma migration command.

## 1. Create the project

1. Sign in at supabase.com and create a new project. Choose the region closest to your users.
2. Set a strong database password and save it in a password manager. You will need it for the connection strings.

## 2. Collect the values you need

In the Supabase dashboard:

| What | Where | Goes into |
|---|---|---|
| Project URL | Project Settings, API | `NEXT_PUBLIC_SUPABASE_URL` |
| anon (public) key | Project Settings, API | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key (**secret**) | Project Settings, API | `SUPABASE_SERVICE_ROLE_KEY` |
| Transaction pooler string | Connect, Transaction pooler (port 6543) | `DATABASE_URL` (keep `?pgbouncer=true`) |
| Direct or session pooler string | Connect, Direct connection (port 5432) | `DIRECT_URL` |

The direct database host may be IPv6-only on the free tier. If your computer or Render cannot reach it, use the **Session pooler** connection string for `DIRECT_URL` instead. Replace the password placeholder in each string with your database password. The service_role key bypasses all security rules: it is server-only, never prefixed `NEXT_PUBLIC_`, never pasted into chat or committed.

## 3. Add the values locally

Copy `.env.example` to `.env` (Prisma reads `.env`; Next.js reads it too) and fill in the values. `.env` is git-ignored.

## 4. Configure Authentication

In Authentication:

1. Providers, Email: keep **Email** enabled.
2. Turn **Confirm email** on (recommended). The app works with it on or off.
3. Set the minimum password length to **10** to match the app's rule.

Reported current configuration (2026-10-21): email enabled, email confirmation enabled, anonymous sign-ins disabled. The application's own validation enforces a minimum of 10 characters. Whether the Supabase-side minimum length and the URL settings below are set is not recorded here.
4. URL Configuration:
   - **Site URL**: your production URL (for example `https://your-service.onrender.com`). Use `http://localhost:3000` while developing.
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://<your-service>.onrender.com/auth/callback` (and your custom domain's `/auth/callback` later).
5. Optional: configure custom SMTP before launch. Supabase's built-in email sender is heavily rate-limited and meant for testing.

Password reset is also handled by Supabase Auth. The app has no reset page yet (planned for a later phase).

## 5. Database migration: current state and the Prisma baseline

### Current state (reported 2026-10-21)

- The Phase 1 migration SQL (`prisma/migrations/20261005000000_phase1_foundation/migration.sql`) was **applied manually** to the live Supabase database.
- The category seed ran successfully: exactly 15 product categories exist and are ACTIVE.
- The migration is **not yet recorded** in Prisma's `_prisma_migrations` history. The baseline described below is outstanding.

### Warning: do not rerun the migration on the live database

Until the baseline is done, **never run these against the existing live database**:

- `npx prisma migrate deploy`
- `npx prisma migrate dev`
- `npx prisma migrate reset`
- `npx prisma db push`

Prisma has no record that the migration was applied. `migrate deploy` would try to run the SQL again and fail because the objects already exist. `migrate dev`, `migrate reset` and `db push` can change or erase live data. Never use the live database URL as a shadow database. The same applies to the `npm run db:migrate` and `npm run db:migrate:deploy` shortcuts.

### Baseline procedure (outstanding)

Do this from your own computer once the Prisma environment works (`npm install` completed and `.env` filled in). Stop at any step that gives a result you do not expect, and ask before continuing.

1. Check that `.env` points at the intended Supabase project. Do not print or paste the connection strings.
2. `npx prisma validate`. This only checks the schema file. It does not touch the database.
3. `npx prisma migrate status`. This inspects the database and does not apply anything. It is expected to report that the migration is not recorded in Prisma's history. That is the known gap. If it fails to connect, fix the connection first (docs/TROUBLESHOOTING.md) and stop.
4. Optional read-only comparison of the live `public` schema with the schema file:

   ```bash
   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
   ```

   Exit code 0 means they match. Prisma does not model CHECK constraints, RLS or privileges, so those are not compared here; they are checked in section 6.
5. Only if steps 3 and 4 look right, record the existing migration as applied:

   ```bash
   npx prisma migrate resolve --applied 20261005000000_phase1_foundation
   ```

   This records the migration in Prisma's history. It is not intended to run the migration SQL again.
6. Run `npx prisma migrate status` again. It should now report that the database is up to date with the migration.
7. Recommended follow-up (not yet done): Prisma keeps its history in a `_prisma_migrations` table in the `public` schema, which Supabase exposes through its API. Check that table's RLS state with the query in section 6. If RLS is off, enable it and revoke the `anon` and `authenticated` privileges, the same default-deny rules as the five Phase 1 tables.

Optional: if you want the status comment at the top of `migration.sql` corrected (it still says "unapplied"), do that **before** step 5, because Prisma records the migration file's checksum when it is baselined.

Only after the baseline are future migrations applied with `prisma migrate deploy`, one reviewed migration at a time.

### A brand-new, empty database only

For a new Supabase project that has none of the five Phase 1 tables (for example a separate test project), apply the migration with `npx prisma migrate deploy` and then run `npm run db:seed`. Do not do this on the existing live database.

## 6. Row Level Security check (done once; repeat after every migration)

Reported result (2026-10-21): RLS enabled and checked on all five Phase 1 tables, no policies, and table privileges revoked from `anon` and `authenticated`. That is default-deny at the database. It does not on its own prove that the whole application is secure.

To repeat the check, in the Supabase SQL editor run:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by 1;
-- expect relrowsecurity = true for users, customer_profiles, supplier_profiles,
-- product_categories and audit_logs. If a _prisma_migrations table exists (after the
-- baseline), it should be true too (see section 5, step 7)

select count(*) from pg_policies;   -- expect 0 for these tables
```

Then confirm the REST API is closed: `curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?select=*" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"` should return an empty list or a permission error, never user rows.

## 7. Create the first administrator (controlled manual step)

Nobody can pick ADMIN at registration, and no admin password is ever stored in the repository.

1. Register through the website as a normal customer using the administrator's real email, and confirm the email.
2. Check that this is the intended person. In the SQL editor run (replace the email):

   ```sql
   update users set role = 'ADMIN', status = 'ACTIVE' where email = 'admin@example.com';
   ```

3. Sign out and in again. The dashboard is now `/admin/dashboard`.

To remove admin rights later, set the role back to `CUSTOMER`.

## 8. Storage (future)

Phase 1 creates **no bucket**. When uploads are added (supplier logos, product images, verification documents), create the buckets then: verification documents in a private bucket read through short-lived signed URLs; logos and product images may use a public-read bucket with writes only from server code. See ARCHITECTURE.md A10.
