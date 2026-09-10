# Entrega: stock, detalle y estadísticas

Fecha: 2026-09-10. Repositorio confirmado por el usuario: `leanflores2002-ui/Romix-`.
Rama: `feature/stock-product-details-stats`, desde `79166f2` (`fix catalogo`).
Se revisaron los commits de tema público y alineación de especificaciones previos.
No se hizo merge ni despliegue. Supabase de producción se consultó en modo lectura.

## 1. Problemas encontrados

- Dos sistemas de stock: JSON en `/api/variants` y `/api/orders`, PostgreSQL en Admin
  y `/api/public/orders`. El navegador podía considerar autoritativa la respuesta JSON.
- El PUT de producto podía sobrescribir existencias de un formulario viejo.
- Carrito WhatsApp sin confirmación de pedido en PostgreSQL; precios provenientes del cliente.
- Dashboard limitado y alterado por un módulo DOM que removía secciones.
- Cliente API convertía detalles de validación estructurados en mensajes poco útiles.
- Datos preloaded del detalle podían preceder a cambios recientes de API.
- Al adaptar datos se perdían imágenes históricas por color.
- La tabla de variantes podía provocar desbordamiento móvil, incluso por un texto accesible
  posicionado fuera de su contenedor.
- Supabase tiene tablas y datos, pero ninguna migración registrada. **No repetir core.sql**.

## 2–3. Arquitectura anterior y final

Antes: Admin → FastAPI → PostgreSQL, en paralelo a tienda/carrito → JSON y cachés.
Ahora: Admin y tienda → FastAPI → PostgreSQL para disponibilidad, pedidos, producto editable
y estadísticas. El snapshot JSON permanece para presentación durante fallos, sin stock.

Servicios añadidos: InventoryService y StatisticsService. Se conserva el adaptador de productos
`catalog_sync._build_catalog` y el cliente `src/lib/api.js`. No se crearon paneles alternativos.

## 4. Base real inspeccionada

Proyecto `gpzeftandqgafxipqhnh`. Se inspeccionaron columnas, constraints, índices, triggers,
políticas, buckets y conteos exactos. 157 productos, 5.633 variantes, 5.633 movimientos,
un administrador y cero pedidos al auditar. Buckets `product-images` y `banners` preservados.

Tablas reutilizadas: products, product_variants, stock_movements, product_images,
product_price_groups, product_size_price_groups, categories, collections, collection_products,
orders, order_items, admin_profiles y audit_logs. Banners/settings/size_guides permanecen intactos.

**Todos los movimientos existentes son importaciones iniciales del estado de products.json.**
La base es la autoridad operativa, pero esas cantidades requieren reconciliación física.
No se inventó un histórico de ventas a partir de ellas.

## 5. Migración

`supabase/migrations/20260910122433_stock_product_details_stats.sql`, generada con Supabase CLI.
Agrega barcode a variantes, request_key/request_hash a pedidos, tabla product_view_events,
índices de unicidad/consulta y permisos restringidos con RLS para eventos.

Aplicada y probada en PostgreSQL 17.6 temporal. **Pendiente de aplicar a Supabase real**.
No modifica la migración histórica, existencias, imágenes, usuarios ni buckets.

## 6. Endpoints

| Ruta | Cambio |
| --- | --- |
| GET /api/products | PostgreSQL directo; contrato público y compatibilidad visual |
| GET /api/products/{slug} | Búsqueda por referencia y ProductDetail |
| GET /api/variants | PostgreSQL directo, precio efectivo y umbral por variante |
| POST /api/orders y /api/public/orders | Un flujo transaccional, precio servidor, idempotencia |
| GET/POST/PUT /api/admin/products | Versiones, detalles, identificadores, sin sobrescribir stock |
| POST /api/admin/inventory/{id}/adjust | Sumar/quitar/establecer, motivo, control de versión |
| PATCH /api/admin/products/{id}/images | Orden de galería con auditoría y versión |
| GET /api/admin/products/{id}/preview | HTML público autenticado para producto guardado/borrador |
| GET /api/admin/dashboard | Estadísticas agregadas y rango de fechas |
| POST /api/public/products/{id}/view | Evento anónimo deduplicado por pestaña/producto |
| GET /api/admin/orders y /orders/{id} | Se montan los handlers existentes |
| PATCH /api/admin/orders/{id}/status | Cancelación devuelve stock una vez; impide reactivación |

Al montar `admin_extra` también quedan accesibles sus handlers existentes de escritura de
categorías y colecciones, protegidos por rol. No se duplicaron los GET existentes.
`/api/health`, configuración de Render, Vercel y autenticación Supabase permanecen compatibles.

## 7–10. Comportamiento y compatibilidad

Ver [STOCK_ARCHITECTURE.md](STOCK_ARCHITECTURE.md) y [PRODUCT_DATA_FLOW.md](PRODUCT_DATA_FLOW.md).

- Stock: locks ordenados, transacción, versiones y movimientos/auditoría; respuesta confirmada.
- Detalle: descripción/specifications, imágenes por color, precio efectivo por variante,
  campos editables y vista previa del HTML público en iframe aislado.
- Estadísticas: SQL real, rangos de días completos de Argentina; stock actual independiente
  del rango; ventas sólo de pedidos completados; sin datos se indica explícitamente.
- Legacy: JSON, aliases de producto, exportador de snapshot y funciones de stock JSON sin
  rutas ni startup que las invoquen. Se conservan para retiro gradual, no como autoridad.
- La vista previa requiere guardar primero. Las reservas no caducan automáticamente;
  se liberan cancelando el pedido mediante la ruta administrativa existente.

## 11. Archivos

Backend: admin_api.py, admin_extra.py, catalog_sync.py, config.py, database.py, main.py,
public_api.py, security.py; nuevos inventory_service.py, statistics_service.py y product_schemas.py.

Admin: App.jsx, Statistics.jsx, admin-enhancements.js, product-focus.js, styles.css y lib/api.js.
Público: products-store.js, inventory.js, cart.js, cart.html y product.html.
Configuración: .env.example y render.yaml. Documentación: backend/README.md, los tres documentos
STOCK/PRODUCT y notas de vigencia en ROMIX_ADMIN.md, ROMIX_AUDIT.md e inventory.md.
Tests: backend/tests/test_orders.py, test_inventory_integration.py, Admin lib/api.test.js,
tests/cartOrderTests.js. La migración nueva se lista arriba. No se alteraron imágenes.

## 12–15. Validación

Entorno: PostgreSQL 17.6 aislado, FastAPI `http://localhost:8000`, Vite
`http://localhost:5173/admin`, Chromium. Browser plugin no disponible; se usó Playwright
temporal, sin agregar dependencias de QA al proyecto. Las escrituras de prueba fueron locales.

| Validación | Resultado |
| --- | --- |
| Backend pytest, con PostgreSQL real temporal | 20 tests aprobados |
| Concurrencia de pedidos | Una reserva aceptada y otra rechazada, sin stock negativo |
| Reintento y aliases | Mismo pedido, un descuento, precio del servidor |
| Ajustes, motivos, rollback, permisos y versiones | Aprobados |
| Creación, edición, imágenes, preview privado y estadísticas | Aprobados |
| Cancelación repetida | Devuelve stock una sola vez |
| Admin npm run lint | Aprobado |
| Admin npm test | 10 tests aprobados |
| Admin npm run build | Aprobado |
| npm test raíz | DOM/axe de Mujer, Hombre, Niños y Catálogo; carrito, colores e imágenes aprobados |
| Ocho páginas × 1440×900 y 390×844 | Sin páginas vacías, errores JS ni desbordamiento horizontal |
| Admin dashboard/editor/inventario responsive | Aprobado después de corregir contención de tablas |
| Admin editar material → guardar → API pública | Cambio visible, aprobado |
| Admin sumar stock | Anterior/movimiento/nuevo confirmados por API |
| Vista previa | Mismo HTML público, sin compras ni acceso a almacenamiento del Admin |
| Tienda agotado → variante disponible → carrito → pedido | Aprobado; WhatsApp interceptado, no se envió mensaje |
| Fallback API/DB no disponible | Catálogo visible; “Consultar disponibilidad”; no stock del navegador |
| Buscador | “calza” devuelve productos/categorías reales |
| Filtro de catálogo | Calzas: 29 resultados, primera página de 12 productos de esa categoría |
| Reejecución de migración en PostgreSQL local | Aprobada; conserva cantidad de variantes y suma de stock |

La suite backend muestra un aviso de deprecación de Starlette/httpx, sin fallos.
Los tests axe históricos filtran dos avisos de fixture sobre título/idioma; no equivalen
a una auditoría exhaustiva de accesibilidad del sitio completo.

## 16. Riesgos y límites pendientes

- Reconciliar físicamente las existencias importadas; no se corrigieron números sin evidencia.
- Desplegar migración, API, Admin y público coordinadamente. Clientes antiguos de stock/PUT
  deben actualizarse; reciben validación/conflicto en lugar de escribir valores obsoletos.
- Sin caducidad automática de reservas ni integraciones de pago; no presentar reservas como ventas.
- Tracking mide aperturas por pestaña/producto y no es analítica antifraude ni visitantes únicos.
- Se preservó Storage. No se subieron/eliminaron archivos reales ni se hizo una prueba de carga
  autenticada contra producción. La ordenación se probó en PostgreSQL local.
- No hubo prueba sobre Vercel/Render desplegados ni navegadores físicos iOS/Android.
- Advisors existentes: pg_trgm en public ([detalle](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public))
  y protección de contraseñas filtradas desactivada ([detalle](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
  RLS sin policies es intencional para tablas sin acceso de navegador; se preservó.

## 17. Despliegue exacto

1. Revisar esta rama. No mezclar automáticamente con main.
2. En Supabase Romix, aplicar **sólo** el contenido de la migración nueva en una transacción,
   mediante apply_migration o SQL Editor. No ejecutar core.sql y no usar db reset/db push a
   ciegas: el historial remoto está vacío aunque las tablas existen. Si se adopta CLI con
   historial, reconciliar primero el baseline auditado sin reejecutar su DDL.
3. Verificar en SQL: `select barcode from public.product_variants limit 1;`
   `select request_key, request_hash from public.orders limit 1;`
   `select count(*) from public.product_view_events;` y RLS habilitado para eventos.
4. Desplegar el backend de esta rama en Render usando el build/startCommand de render.yaml.
   Conservar DATABASE_URL, SUPABASE_URL y JWT/JWKS/Storage existentes. Definir
   PUBLIC_FRONTEND_ORIGIN, ADMIN_FRONTEND_ORIGIN y ALLOWED_ORIGINS con los dominios reales.
   ROMIX_CATALOG_SOURCE=database describe el nuevo flujo; poner json no reactiva stock legado.
5. Verificar `/api/health` y `/api/health/ready`, `/api/products` y `/api/variants`.
   Comparar una variante con PostgreSQL, sin mutarla.
6. Desplegar Admin desde frontend/admin en Vercel: `npm ci`, `npm run build`, salida dist.
   Mantener VITE_API_URL, VITE_PUBLIC_SITE_URL, VITE_SUPABASE_URL,
   VITE_SUPABASE_PUBLISHABLE_KEY/ANON_KEY y VITE_ADMIN_PATH existentes.
7. Publicar frontend/public junto con API o en su alojamiento actual con el proxy `/api/*`
   hacia Render. Invalidar caché de HTML/JS; el JSON se conserva como fallback.
8. Iniciar sesión y revisar listado/dashboard. Guardar un producto de prueba y comprobar su
   detalle. Ajustar una variante de prueba con motivo, revisar movimiento y cancelar el pedido
   de prueba para devolver stock. Validar móvil antes de habilitar el flujo a clientes.
9. Ante problemas, mantener las columnas/tablas aditivas. Volver a una UI anterior no debe
   reactivar los endpoints JSON de stock. Mantener pedidos deshabilitados hasta corregir la API.

Comandos de validación: `python -m pytest backend/tests -q -p no:cacheprovider` con
ROMIX_TEST_DATABASE_URL apuntando a localhost/romix_qa ya migrada; `npm test` en raíz;
`npm run lint`, `npm test`, `npm run build` en frontend/admin. Las integraciones se omiten
explícitamente si no se configura la DB temporal; no apuntarlas a producción.
