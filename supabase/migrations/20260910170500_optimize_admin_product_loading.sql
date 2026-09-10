create index if not exists products_admin_recent_idx
  on public.products (updated_at desc)
  where deleted_at is null;

create index if not exists product_variants_active_product_stock_idx
  on public.product_variants (product_id)
  include (stock)
  where status = 'active';
