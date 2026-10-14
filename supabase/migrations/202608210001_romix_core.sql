begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role in ('superadmin', 'admin', 'operator')),
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  audience text not null check (audience in ('mujer', 'hombre', 'ninos')),
  status text not null default 'active' check (status in ('active', 'hidden')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audience, slug)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'hidden')),
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  name text not null check (char_length(name) between 2 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text not null,
  barcode text,
  audience text not null check (audience in ('mujer', 'hombre', 'ninos')),
  category_id uuid references public.categories(id) on delete restrict,
  season_key text,
  description_html text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  base_price numeric(12,2) not null check (base_price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  tags text[] not null default '{}',
  featured boolean not null default false,
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  legacy_payload jsonb,
  source_hash text,
  created_by uuid references public.admin_profiles(user_id) on delete set null,
  updated_by uuid references public.admin_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index products_sku_unique_idx on public.products (lower(sku));
create unique index products_legacy_id_unique_idx on public.products (legacy_id) where legacy_id is not null;
create index products_public_catalog_idx on public.products (audience, category_id, season_key, updated_at desc)
  where status = 'published' and deleted_at is null;
create index products_status_idx on public.products (status) where deleted_at is null;
create index products_name_search_idx on public.products using gin (name gin_trgm_ops);

create table public.product_price_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  price_group text not null check (price_group in ('common', 'special', 'special2')),
  amount numeric(12,2) not null check (amount >= 0),
  primary key (product_id, price_group)
);

create table public.product_size_price_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  price_group text not null check (price_group in ('common', 'special', 'special2')),
  primary key (product_id, size),
  foreign key (product_id, price_group)
    references public.product_price_groups(product_id, price_group) on delete cascade
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null default 'storage' check (source in ('legacy', 'storage')),
  storage_path text,
  public_url text not null,
  alt_text text,
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, public_url),
  check ((source = 'legacy' and storage_path is null) or (source = 'storage' and storage_path is not null))
);
create index product_images_product_id_idx on public.product_images (product_id, position);
create unique index product_images_one_primary_idx on public.product_images (product_id) where is_primary;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  size text not null check (char_length(size) between 1 and 40),
  color text not null check (char_length(color) between 1 and 80),
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_variants_identity_idx on public.product_variants (product_id, lower(color), lower(size));
create unique index product_variants_sku_unique_idx on public.product_variants (lower(sku)) where sku is not null;
create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_low_stock_idx on public.product_variants (stock, product_id) where status = 'active';

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id)
);
create index collection_products_product_id_idx on public.collection_products (product_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status text not null default 'submitted' check (status in ('submitted', 'confirmed', 'prepared', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name text not null,
  color text not null,
  size text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type text not null check (movement_type in ('incoming', 'outgoing', 'adjustment', 'order', 'cancellation')),
  quantity_delta integer not null check (quantity_delta <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  reason text,
  order_id uuid references public.orders(id) on delete set null,
  admin_user_id uuid references public.admin_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  check (stock_after = stock_before + quantity_delta)
);
create index stock_movements_variant_created_idx on public.stock_movements (variant_id, created_at desc);
create index stock_movements_order_id_idx on public.stock_movements (order_id) where order_id is not null;
create index stock_movements_admin_user_id_idx on public.stock_movements (admin_user_id) where admin_user_id is not null;

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  link_url text,
  storage_path text not null,
  public_url text not null,
  alt_text text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  position integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index banners_public_idx on public.banners (position, starts_at, ends_at) where status = 'published';

create table public.size_guides (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  audience text check (audience is null or audience in ('mujer', 'hombre', 'ninos')),
  category_id uuid references public.categories(id) on delete set null,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index size_guides_category_id_idx on public.size_guides (category_id) where category_id is not null;

create table public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.admin_profiles(user_id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid references public.admin_profiles(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_admin_user_id_idx on public.audit_logs (admin_user_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create trigger admin_profiles_set_updated_at before update on public.admin_profiles
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger banners_set_updated_at before update on public.banners
  for each row execute function public.set_updated_at();
create trigger size_guides_set_updated_at before update on public.size_guides
  for each row execute function public.set_updated_at();

alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_price_groups enable row level security;
alter table public.product_size_price_groups enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.collection_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.banners enable row level security;
alter table public.size_guides enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;

-- Los navegadores no acceden a las tablas: todo pasa por FastAPI.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('banners', 'banners', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
