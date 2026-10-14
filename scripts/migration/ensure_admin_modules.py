from __future__ import annotations

import argparse
import json
import os
import sys

import psycopg
from psycopg.rows import dict_row


REQUIRED_TABLES = (
    "orders",
    "order_items",
    "banners",
    "size_guides",
    "settings",
    "audit_logs",
)


SCHEMA_SQL = r"""
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status text not null default 'submitted',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists reference text;
alter table public.orders add column if not exists status text default 'submitted';
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists created_at timestamptz default now();
alter table public.orders add column if not exists updated_at timestamptz default now();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name text not null,
  color text not null,
  size text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

alter table public.order_items add column if not exists product_name text;
alter table public.order_items add column if not exists color text;
alter table public.order_items add column if not exists size text;
alter table public.order_items add column if not exists quantity integer;
alter table public.order_items add column if not exists unit_price numeric(12,2);
alter table public.order_items add column if not exists created_at timestamptz default now();

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  link_url text,
  storage_path text not null,
  public_url text not null,
  alt_text text not null,
  status text not null default 'draft',
  position integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners add column if not exists title text;
alter table public.banners add column if not exists body text;
alter table public.banners add column if not exists link_url text;
alter table public.banners add column if not exists storage_path text;
alter table public.banners add column if not exists public_url text;
alter table public.banners add column if not exists alt_text text;
alter table public.banners add column if not exists status text default 'draft';
alter table public.banners add column if not exists position integer default 0;
alter table public.banners add column if not exists starts_at timestamptz;
alter table public.banners add column if not exists ends_at timestamptz;
alter table public.banners add column if not exists created_at timestamptz default now();
alter table public.banners add column if not exists updated_at timestamptz default now();

create table if not exists public.size_guides (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  audience text,
  category_id uuid references public.categories(id) on delete set null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.size_guides add column if not exists key text;
alter table public.size_guides add column if not exists title text;
alter table public.size_guides add column if not exists audience text;
alter table public.size_guides add column if not exists category_id uuid;
alter table public.size_guides add column if not exists content jsonb default '{}'::jsonb;
alter table public.size_guides add column if not exists status text default 'draft';
alter table public.size_guides add column if not exists created_at timestamptz default now();
alter table public.size_guides add column if not exists updated_at timestamptz default now();

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.admin_profiles(user_id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.settings add column if not exists value jsonb;
alter table public.settings add column if not exists is_public boolean default false;
alter table public.settings add column if not exists updated_by uuid;
alter table public.settings add column if not exists updated_at timestamptz default now();

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid references public.admin_profiles(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists admin_user_id uuid;
alter table public.audit_logs add column if not exists action text;
alter table public.audit_logs add column if not exists entity_type text;
alter table public.audit_logs add column if not exists entity_id uuid;
alter table public.audit_logs add column if not exists details jsonb default '{}'::jsonb;
alter table public.audit_logs add column if not exists created_at timestamptz default now();

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists banners_public_idx on public.banners (position, starts_at, ends_at);
create index if not exists size_guides_category_id_idx on public.size_guides (category_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
"""


def inspect(connection) -> dict:
    rows = connection.execute(
        """
        select table_name
        from information_schema.tables
        where table_schema = 'public' and table_name = any(%s)
        order by table_name
        """,
        (list(REQUIRED_TABLES),),
    ).fetchall()
    existing = {row["table_name"] for row in rows}
    missing = [name for name in REQUIRED_TABLES if name not in existing]
    return {"ok": not missing, "existing": sorted(existing), "missing": missing}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check or safely create ROMIX admin module tables")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        return 2

    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        before = inspect(connection)
        print(json.dumps({"before": before}, ensure_ascii=False, indent=2))
        if args.apply:
            with connection.transaction():
                connection.execute(SCHEMA_SQL)
            after = inspect(connection)
            print(json.dumps({"after": after}, ensure_ascii=False, indent=2))
            return 0 if after["ok"] else 1
        return 0 if before["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
