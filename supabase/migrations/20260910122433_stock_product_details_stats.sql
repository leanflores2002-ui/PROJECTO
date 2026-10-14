begin;

-- Existing schema was inspected on gpzeftandqgafxipqhnh. Do not rerun the core migration.
alter table public.product_variants add column if not exists barcode text;
create unique index if not exists product_variants_barcode_unique
  on public.product_variants (barcode) where barcode is not null and barcode <> '';

alter table public.orders add column if not exists request_key uuid;
alter table public.orders add column if not exists request_hash text;
create unique index if not exists orders_request_key_unique on public.orders(request_key);

create table if not exists public.product_view_events (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete restrict,
  event_key uuid not null unique,
  created_at timestamptz not null default now()
);
comment on table public.product_view_events is
  'Detail views received by FastAPI. Random per-tab event key; no IP, referrer, identity or fingerprint.';
alter table public.product_view_events enable row level security;
revoke all on public.product_view_events from anon, authenticated;
grant select, insert on public.product_view_events to service_role;
grant usage, select on sequence public.product_view_events_id_seq to service_role;
create index if not exists product_view_events_product_created_idx
  on public.product_view_events(product_id, created_at);
create index if not exists product_view_events_created_idx on public.product_view_events(created_at);
create index if not exists stock_movements_created_type_idx on public.stock_movements(created_at, movement_type);

commit;
