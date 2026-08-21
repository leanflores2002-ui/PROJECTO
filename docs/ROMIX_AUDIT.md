# Auditoría técnica de ROMIX

Fecha: 2026-08-21. Rama de trabajo: `feature/romix-admin`.

## Resumen ejecutivo

ROMIX es hoy un catálogo estático HTML/CSS/JavaScript servido directamente o por FastAPI. `products.json` es la fuente de productos; el navegador intenta `/api/products` y vuelve al JSON si la API no responde. El carrito vive en `localStorage` y termina en WhatsApp. Existe un backend FastAPI funcional, pero el stock se guarda en un JSON local y los pedidos de ese backend no se persisten. La web pública no debe reescribirse: sus URLs, filtros, detalle, carrito, imágenes y SEO tienen consumidores reales.

El remoto Git configurado localmente es `leanflores2002-ui/PROJECTO.git`, distinto del repositorio indicado (`leanflores2002-ui/ROMIX`). No se modificó el remoto.

## Arquitectura y deployment actuales

- `frontend/public/`: sitio estático con páginas separadas (`index.html`, `catalogo.html`, `mujer.html`, `hombre.html`, `ninos.html`, `novedades.html`, `product.html`, `cart.html`, `ayuda.html`).
- `frontend/public/assets/js/`: módulos compartidos, más mucho JavaScript inline en `index.html`, `product.html` y `cart.html`.
- `frontend/public/assets/data/products.json`: 157 productos; fuente de verdad actual.
- `backend/app/main.py`: FastAPI de 491 líneas, API JSON, vistas Jinja y montaje estático.
- `netlify.toml`: deployment público actual en Netlify; ejecuta generación de páginas sociales.
- `Procfile`: arranque de FastAPI compatible con Render.
- `scripts/generate-share-pages.js`: genera 157 rutas sociales estáticas con dominio Netlify por defecto.
- No había configuración Vercel, Supabase ni variables de entorno centralizadas.

## Flujo actual del catálogo

`products-store.js` busca datos en este orden: datos precargados por Jinja, caché de memoria/sesión (TTL 5 minutos), `/api/products` y finalmente `assets/data/products.json`. Filtra `hidden`, `draft`, `inactive` y toda la temporada `verano`. FastAPI aplica también el bloqueo de verano.

`romix-catalog-pages.js` normaliza público, tipo/categoría, temporada, colores, talles e imágenes para catálogo, filtros y tarjetas. `search.js` intenta primero `/api/products` y después el JSON. `product.html` tiene su propia normalización extensa, carga por `id`, `slug` o nombre y conserva enlaces `product.html?id=...&slug=...&name=...`. FastAPI también sirve `/product/{slug}` con metadatos sociales inyectados.

## Datos reales encontrados

- 157 productos, 157 nombres y slugs derivados únicos; ningún producto posee `id`, SKU o slug persistido.
- Públicos: 110 mujer, 28 hombre, 19 niños.
- Temporadas: 45 invierno, 59 verano, 53 media estación.
- 16 tipos distintos en el JSON y 29 combinaciones público/tipo que funcionan como categorías actuales.
- 801 imágenes únicas de galería referenciadas; no faltan archivos.
- 1.099 entradas de talle y 800 entradas de color.
- La combinación cartesiana actual produce 5.633 variantes color/talle.

## Precios

Todos los productos tienen `price`. 153 poseen `priceByGroup`; cuatro no. Los grupos usados son `common`, `special` y `special2`. La resolución efectiva vive sobre todo en `product.html`: prioriza `specialSizes2`, después `specialSizes`, después `common`, aplica reglas heredadas por público/talle como fallback y finalmente vuelve a `price`.

Hay ocho productos con `superSpecialSizes`, pero el frontend actual no consume ese campo. No se le asignó una semántica nueva. El esquema separa importes (`product_price_groups`) de la asignación talle-grupo (`product_size_price_groups`) para preservar `priceByGroup` sin columnas rígidas por variante.

## Variantes y stock

El JSON declara colores y talles, no variantes explícitas. FastAPI crea el producto cartesiano `product_id + color + size`; como no hay IDs, `product_id` es el slug del nombre. El stock inicial se deriva del estado del talle: disponible=5, bajo=2, sin stock=0. En el repositorio no existe `backend/data/product_variants.json`; se crea al iniciar el backend.

`inventory.js` mantiene otra copia en `localStorage.romixVariantStock`. El carrito valida y descuenta esa copia local. Esto no es concurrencia segura ni una fuente compartida. La nueva tabla `product_variants` será la única existencia y `stock_movements` el historial. Los endpoints nuevos bloquean filas con `FOR UPDATE` y actualizan pedido, items, stock y movimientos en una transacción corta.

## Carrito y pedidos

`cart.js` migra la clave heredada `cart` a `romix_cart`, normaliza producto/color/talle, agrupa por clave y calcula totales. `cart.html` valida contra el inventario local, abre WhatsApp y limpia el carrito.

Contrario a `docs/inventory.md`, el carrito actual no llama a `/api/orders`. La ruta heredada FastAPI valida y descuenta el JSON en memoria/disco, devuelve un ID aleatorio y no guarda el pedido. La nueva ruta `/api/public/orders` sí persiste `orders`/`order_items`, toma precios del servidor y reserva stock transaccionalmente. No se conectará al carrito público hasta validar la importación y el contrato completo.

## Banners y guía de talles

- Los banners principales están hardcodeados en `index.html`; `promo-banner.js` aporta comportamiento de carrusel, no una fuente administrable.
- `size-guides.js` contiene las tablas, aliases, contenido y selección de guía en JavaScript.

Ambos componentes deben conservarse como fallback mientras se agregan endpoints y datos administrables.

## Archivos críticos a preservar

- `frontend/public/assets/data/products.json` y su backup exacto.
- `products-store.js`, `romix-catalog-pages.js`, `product.html`, `cart.js`, `cart.html`, `inventory.js`, `search.js` y `slugify.js`.
- `romix-image-utils.js`, imágenes de producto, thumbs, mobile, banners y videos.
- `size-guides.js`, `romix-header.js`, `romix-footer.js` y URLs públicas existentes.
- Endpoints heredados y plantillas de `backend/app/main.py` durante la transición.
- Scripts de generación de imágenes y páginas sociales.

## Deuda técnica y riesgos

- Lógica duplicada de productos/precios/stock en archivos HTML y JS grandes; `product.html` supera 190 KB.
- Stock derivado, no real, y dos copias mutables (servidor JSON y navegador).
- Pedidos backend no persistidos y endpoint no consumido por el frontend.
- `allow_origins=["*"]` estaba activo con credenciales.
- Dominios Netlify, WhatsApp y SEO hardcodeados en varios archivos.
- Backend README decía que no había backend, pese a existir FastAPI.
- No existía `.gitignore`; hay 1.699 archivos de `node_modules` ya versionados. Agregar ignore evita nuevos archivos, pero no se desversionaron archivos existentes.
- `product_dump.txt`, snapshots temporales y `tmp_products_prev.json` parecen deuda, pero no se eliminaron.
- `romix-inventario/` contiene únicamente `dist` y `node_modules` ignorados, sin fuente reutilizable.
- Cuatro productos carecen de `priceByGroup`; ocho contienen `superSpecialSizes` sin consumidor.
- La importación inicial genera SKU determinístico porque el origen no tiene SKU. Debe revisarse desde Admin.
- Los 5/2/0 de stock son provisionales; deben contrastarse con inventario físico antes del corte.
- Cambiar slugs rompería producto, compartir y SEO. La migración los preserva de forma determinística.

## Tests antes de cambios

- `pageTests.js`: pasa (DOM y axe para Mujer, Hombre, Niños y Catálogo).
- `colorNameTests.js`: pasa.
- `imageUtilsTests.js`: pasa.
- `cartOrderTests.js`: fallaba porque esperaba `orderCartWhatsApp`, función ya inexistente, y no cargaba recursos locales de JSDOM.
- Backend no podía ejecutarse: el entorno no tenía FastAPI/pytest instalados y `requirements.txt` no incluía pytest.

La prueba del carrito se actualizó para cargar los scripts reales y accionar el botón real. El mensaje WhatsApp vuelve a conservar tipo y total, comportamiento que la prueba histórica exigía.

## Esquema Supabase propuesto

La migración crea solo entidades justificadas por datos o flujos actuales: `admin_profiles`, `categories`, `collections`, `products`, `product_price_groups`, `product_size_price_groups`, `product_images`, `product_variants`, `collection_products`, `orders`, `order_items`, `stock_movements`, `banners`, `size_guides`, `settings` y `audit_logs`.

Usa UUID, `timestamptz`, `numeric` para dinero, constraints de estado/stock, índices sobre consultas reales y claves foráneas indexadas. No existe tabla `customers`. `legacy_payload` y `source_hash` son trazabilidad de migración, no una segunda fuente operativa.

RLS queda habilitado y se revocan permisos directos de `anon` y `authenticated`: navegador → FastAPI → PostgreSQL. Los buckets públicos permiten lectura de imágenes publicadas; las escrituras usarán FastAPI con service role, nunca el navegador.

## Estrategia de migración

1. Conservar JSON y backup con SHA-256 idéntico.
2. Aplicar migraciones versionadas.
3. Ejecutar `python scripts/migration/import_products.py` (validación sin escritura).
4. Revisar las 12 advertencias de precio/talles.
5. Ejecutar con `--apply` una sola vez sobre una base vacía.
6. Verificar conteos de producto, categoría, imagen, variante y grupo dentro de la misma transacción.
7. Revisar SKU y stock provisional en Admin contra inventario físico.
8. Probar catálogo, detalle, filtros, carrito y pedidos en staging.
9. Cambiar `ROMIX_CATALOG_SOURCE` solo después de paridad.
10. Mantener fallback JSON durante una ventana de rollback; retirarlo en una fase posterior y explícita.

## Autenticación y autorización

El frontend usa únicamente URL y publishable/anon key para `signInWithPassword`; no ofrece signup. Envía el access token a FastAPI. El backend verifica firma, issuer, audience y expiración mediante JWKS (con fallback legado HS256 si se configura) y después exige un `admin_profiles` activo. Los roles iniciales son `superadmin`, `admin` y `operator`. Ninguna decisión administrativa depende de un booleano del navegador.

## Estructura progresiva

```text
frontend/public/       catálogo actual, preservado
frontend/admin/        React + Vite, deployment Vercel independiente
backend/app/           FastAPI y APIs pública/admin
supabase/migrations/   esquema reproducible
scripts/migration/     validación/importación
backend/data/legacy/   backup original del JSON
docs/                  auditoría, operación y deployment
```

## Plan de fases

1. Auditoría y línea base (completada).
2. Configuración, CORS, health, pool y migración base (implementada).
3. Supabase Auth, perfil admin y protección backend (implementada como base).
4. Shell, login, dashboard, listado y editor inicial (implementado).
5. Ejecutar migración en staging y reconciliar stock/SKU (requiere proyecto Supabase).
6. Storage, carga/reordenado/eliminación de imágenes y banners.
7. Conectar catálogo público progresivamente a `/api/public/*`.
8. Completar categorías, colecciones, pedidos, guías, actividad y reportes útiles.
9. QA de seguridad, accesibilidad, responsive, migración y producción.
