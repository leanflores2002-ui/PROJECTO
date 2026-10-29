# ROMIX D1 migrations

Migrations in this directory are the source of truth for the new D1 database.
They are intentionally separate from `supabase/migrations/`; the Supabase
history remains available for rollback and legacy operation.

From `apps/api`:

```text
npx wrangler d1 migrations list romix-dev --local
npx wrangler d1 migrations apply romix-dev --local
npx wrangler d1 migrations apply romix-dev --remote
```

`0001_initial.sql` is a minimal bootstrap. It does not import products or
orders and it does not attempt to reproduce the PostgreSQL schema blindly.
