## Flujo de inventario y pedidos

### Estado actual del sitio publico (legado)

- `backend/data/product_variants.json` es el inventario compatible con el backend legado. Si no existe, se genera desde `products.json` con stock base segun estado (`out` = 0, `low` = 2, resto = 5).
- `GET /api/variants` devuelve ese stock y `POST /api/orders` valida y descuenta variantes del archivo JSON.
- El navegador mantiene ademas `localStorage.romixVariantStock` mediante `assets/js/inventory.js`.
- El checkout publico actual finaliza abriendo WhatsApp y no llama a `POST /api/orders`; por eso el stock del backend legado y el stock local pueden divergir. Este comportamiento se preserva para no alterar el sitio publico durante la migracion.

### Flujo nuevo en PostgreSQL

- `POST /api/public/orders` recibe `productId`/`variantId`/`qty`, bloquea las variantes involucradas, vuelve a calcular precios del lado servidor y crea pedido, items, movimientos y descuentos de stock en una sola transaccion.
- El stock no puede quedar negativo y solo se aceptan productos publicados y variantes activas.
- El admin ajusta stock mediante `POST /api/admin/inventory/{variant_id}/adjust`; cada cambio queda registrado en `stock_movements` y `audit_logs`.
- La migracion y la operacion del nuevo flujo estan documentadas en `docs/ROMIX_ADMIN.md`.

### Transicion segura

1. Validar el catalogo con `python scripts/migration/import_products.py --check`.
2. Aplicar `supabase/migrations/202608210001_romix_core.sql` y luego ejecutar el importador con `--apply` sobre una base vacia.
3. Verificar conteos y stock antes de cambiar el frontend publico al endpoint nuevo.
4. Mantener `products.json` y `product_variants.json` como respaldo hasta completar la prueba de paridad y el corte.

### Tests

- `backend/tests/test_orders.py` conserva la cobertura del flujo legado.
- `backend/tests/test_admin_auth.py` cubre autenticacion, autorizacion y saneamiento del admin.
- `backend/tests/test_product_migration.py` cubre la validacion del catalogo de origen.
