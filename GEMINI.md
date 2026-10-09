# PNG Materials Marketplace: Gemini Project Rules

Mobile-first building-materials marketplace for Papua New Guinea. It connects
customers, hardware/building-material suppliers and admins.

## Stack (locked, do not change without being asked)
- Next.js, React, TypeScript, PWA-ready, REST/JSON API
- Prisma + Supabase PostgreSQL
- Supabase Auth (no app-level password system) and Supabase Storage
- Hosting: GitHub -> Render (frontend + backend) -> Supabase. Vercel is not used.
- Roles: CUSTOMER, SUPPLIER, ADMIN

## Current phase
Phase 1 (Foundation) only. Do NOT build Phase 2 or later features.
Phase 1 tables: users, customer_profiles, supplier_profiles,
product_categories, audit_logs. Each later phase adds its own tables and migration.
Deferred for the future: payments, delivery, AI.

## Security rules
- The database profile is the authoritative role. Never trust user_metadata for roles.
- Admin accounts must never be selectable at public registration.
- Row Level Security (RLS) must be on every public table.
- Never print, log or commit secrets. Do not read or edit .env files.

## How to work
- First explain what you plan to change, then change only what is needed.
- Keep changes small and focused. Fix only what the task asks for.
- Run `npm run lint` and `npm run build` after changes and report the results.
- Never run destructive commands (rm -rf, git reset --hard, git push --force,
  prisma migrate reset, dropping tables) without asking first.
- Never change prisma/schema.prisma or add migrations unless asked, and list any
  manual migration steps I must run myself.
- Do not edit anything in .github/.
- Work on a new git branch, not main. Commit with clear messages.

## Folders
app, components, docs, handovers, lib, prisma, public, tests.
Put notes and plans in docs/ or handovers/.

## Style
- TypeScript strict, small components, mobile-first layouts.
- Short, plain explanations. List new vs changed files at the end.
