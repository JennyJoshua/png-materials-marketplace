# Supabase setup (manual steps for the project owner)

Nothing in this repository can create your Supabase project or apply the migration for you. Do these steps once. **Never put real credentials in GitHub.**

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
4. URL Configuration:
   - **Site URL**: your production URL (for example `https://your-service.onrender.com`). Use `http://localhost:3000` while developing.
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://<your-service>.onrender.com/auth/callback` (and your custom domain's `/auth/callback` later).
5. Optional: configure custom SMTP before launch. Supabase's built-in email sender is heavily rate-limited and meant for testing.

Password reset is also handled by Supabase Auth. The app has no reset page yet (planned for a later phase).

## 5. Apply the database migration

The Phase 1 migration is **generated but unapplied**. From your computer (Node 20.9 or newer):

```bash
npm install
npx prisma migrate deploy     # applies prisma/migrations/20261005000000_phase1_foundation
npm run db:seed               # inserts the 15 product categories (safe to repeat)
```

Before applying, you can compare the migration with the schema:

```bash
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <a scratch database url> --exit-code
```

Exit code 0 means they match. Use `migrate deploy` (not `migrate dev`) against Supabase.

## 6. Verify Row Level Security (live)

In the Supabase SQL editor run:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by 1;
-- expect relrowsecurity = true for users, customer_profiles, supplier_profiles,
-- product_categories and audit_logs (and _prisma_migrations may show false; that is fine)

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
