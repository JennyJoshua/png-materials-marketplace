-- PNG Marketplace - Phase 1 READ-ONLY database checks
--
-- Every statement below is a plain SELECT. Nothing here changes data, tables, privileges, RLS,
-- Supabase settings or Prisma's migration history. Run it in the Supabase SQL editor.
-- When you share the results, copy ONLY the result rows. Never paste connection strings, keys
-- or passwords. See docs/PHASE_1_VERIFICATION_REPORT.md for what each result should look like.

-- 1. Prisma migration history (public._prisma_migrations)
--    If this errors with "relation does not exist", Prisma has no history table yet.
--    applied_steps_count: usually 0 when a migration was recorded with `migrate resolve --applied`,
--    and 1 when Prisma itself ran the SQL.
select migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count,
       (logs is not null) as has_logs
from public._prisma_migrations
order by started_at;

-- 2. Columns of the five Phase 1 tables
select table_name, ordinal_position as pos, column_name, udt_name as type,
       is_nullable as nullable, column_default as default_value
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users', 'customer_profiles', 'supplier_profiles', 'product_categories', 'audit_logs')
order by table_name, ordinal_position;

-- 3. Constraints (primary keys, unique, foreign keys, checks)
select conrelid::regclass::text as table_name, conname as constraint_name, contype as kind,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid::regclass::text in ('users', 'customer_profiles', 'supplier_profiles', 'product_categories', 'audit_logs')
order by 1, 2;

-- 4. Indexes
select tablename as table_name, indexname as index_name, indexdef as definition
from pg_indexes
where schemaname = 'public'
  and tablename in ('users', 'customer_profiles', 'supplier_profiles', 'product_categories', 'audit_logs')
order by 1, 2;

-- 5. Enum types
select t.typname as enum_name, string_agg(e.enumlabel, ', ' order by e.enumsortorder) as labels
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typnamespace = 'public'::regnamespace
group by t.typname
order by t.typname;

-- 6. Row Level Security, for EVERY table in the public schema (including _prisma_migrations)
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by c.relname;

-- 7. Policies (expected: none on the five Phase 1 tables)
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 8. What the public API roles can do on each public table (expected: no rows at all)
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 9. Row counts only (no personal data is returned)
select 'users' as table_name, count(*) as row_count from public.users
union all select 'customer_profiles', count(*) from public.customer_profiles
union all select 'supplier_profiles', count(*) from public.supplier_profiles
union all select 'product_categories', count(*) from public.product_categories
union all select 'audit_logs', count(*) from public.audit_logs
order by 1;

-- 10. Product categories (expected: 15 rows, all ACTIVE)
select count(*) as total, count(*) filter (where status = 'ACTIVE') as active
from public.product_categories;
