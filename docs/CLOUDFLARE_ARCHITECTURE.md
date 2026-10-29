# ROMIX Cloudflare Architecture

## Estado y alcance

Esta implementación vive en `feature/cloudflare-rebuild` y agrega una base
Cloudflare-native en paralelo al proyecto existente. No elimina FastAPI,
Render, Supabase, el frontend legado, los productos, las imágenes ni las
migraciones PostgreSQL.

El objetivo de esta fase es que las tres aplicaciones puedan desarrollarse y
construirse por separado, que el Worker API tenga health checks y bindings
preparados, y que la futura migración sea reversible.

## Arquitectura objetivo

```text
Cloudflare DNS / CDN
  ├─ romix storefront  -> apps/storefront (Astro + Static Assets)
  ├─ romix admin        -> apps/admin (React + Vite + Static Assets + Access)
  └─ api                -> apps/api (Hono Worker)
                              ├─ D1: datos relacionales
                              ├─ R2: imágenes/banners/media
                              └─ Durable Object: coordinación de stock
```

Astro es adecuado para el storefront porque el catálogo y el SEO se benefician
del HTML generado y de JavaScript sólo donde se necesita interacción. React +
Vite queda reservado para el admin interactivo. Workers Static Assets es la
opción actual de Cloudflare; Workers Sites no se usa porque está deprecado para
nuevos proyectos.

## Estructura nueva

```text
apps/
  api/         Worker Hono, D1/R2/DO bindings y rutas API
  storefront/  Astro estático y Worker de Static Assets
  admin/       React + Vite + TypeScript + Cloudflare Vite plugin
packages/
  shared/      tipos, esquemas Zod y utilidades sin dominio de infraestructura
migrations/   migraciones D1 versionadas
docs/         arquitectura, auditoría y estrategia de migración
```

El frontend actual sigue en `frontend/`; no fue movido a `legacy/` porque aún
es la referencia operativa y de rollback.

## API Worker

`apps/api/src/index.ts` implementa:

- `GET /api/health` → `{ "status": "ok", "runtime": "cloudflare" }`.
- `GET /api/health/database` → consulta segura `SELECT 1` contra D1.
- `/api/public/*` separado para catálogo/búsqueda pública futura.
- `/api/admin/*` separado y protegido por Cloudflare Access.
- CORS por `CORS_ORIGINS`; nunca se permite `*`.
- error 404 y error handler JSON.
- validación inicial de búsqueda con Zod.

Los endpoints de productos, pedidos e inventario no se implementaron todavía:
primero hay que normalizar los datos y definir el modelo D1.

## D1

El binding `DB` está configurado en `apps/api/wrangler.jsonc` con una ruta de
migraciones compartida (`../../migrations`). La migración `0001_initial.sql`
crea sólo `settings`, un primitivo estable para bootstrap. No importa ningún
producto ni pedido.

Desarrollo local:

```text
npm run dev:api
npx wrangler d1 migrations apply romix-dev --local --config apps/api/wrangler.jsonc
```

Producción/remote requiere una base creada o provisionada en el account de
Cloudflare y una revisión explícita antes de ejecutar `--remote`.

## R2

`ASSETS_BUCKET` está preparado para el bucket `romix-assets`. Convención
propuesta, aún sin migrar:

```text
products/{product_id}/...
banners/...
media/...
```

D1 guardará metadatos y claves R2, no binarios. El binding local usa la
simulación de Wrangler; una conexión remota debe activarse conscientemente en
un entorno no productivo.

## Durable Objects

`InventoryDurableObject` sólo establece la interfaz y el binding. No participa
en pedidos todavía y responde 501 para hacer explícito que el flujo no está
habilitado. Cuando se migre el modelo de variantes, el objeto deberá serializar
reservas por variante, validar disponibilidad contra D1 y registrar
`stock_movements`; no se deben crear objetos por cada operación sin una razón
de concurrencia medida.

La configuración usa `exports` declarativo para el ciclo de vida SQLite del
Durable Object, que es el formato actual recomendado por Wrangler.

## Admin y Cloudflare Access

La app admin no tiene registro, signup ni cuentas de clientes. En producción la
recomendación es una aplicación Access sobre el hostname completo del admin.
El Worker valida que exista el contexto Access, que el audience coincida con
`ADMIN_ACCESS_AUDIENCE` y, si se configura, que el email esté en
`ADMIN_ALLOWED_EMAILS`. La URL del admin nunca es el único control.

Wrangler simula una identidad local mediante `access.dev` para que el flujo se
pueda probar sin login real. La política productiva, grupos, IdP y dominios se
configuran en Zero Trust, no en el frontend.

## Variables y secretos

- Variables no sensibles: `CORS_ORIGINS`, `ENVIRONMENT`,
  `ADMIN_ACCESS_AUDIENCE`.
- Secretos futuros: tokens de proveedores, service tokens o credenciales de
  integraciones. Se cargarán con `wrangler secret put` por environment.
- No se guardan IDs de cuenta, tokens ni secretos en esta rama.
- `.dev.vars.example` y `.env.example` sólo contienen nombres y valores locales
  seguros.

## Desarrollo y despliegue

Desde la raíz:

```text
npm install
npm run dev:api
npm run dev:storefront
npm run dev:admin

npm run lint
npm run typecheck
npm run test
npm run build

npm run deploy:api
npm run deploy:storefront
npm run deploy:admin
```

Cada app tiene su propio `wrangler.jsonc` y puede desplegarse de forma
independiente. Los dominios definitivos no están hardcodeados; se conectarán
después mediante rutas/custom domains de Cloudflare.

## Migración desde legacy

1. Congelar y auditar contratos actuales sin modificar producción.
2. Definir IDs estables y normalización de `products.json`.
3. Diseñar migraciones D1 para catálogo, imágenes y variantes.
4. Importar primero un entorno de prueba y verificar conteos, precios,
   visibilidad y rutas de assets.
5. Migrar R2 sin borrar el origen; comprobar URLs y fallbacks.
6. Implementar pedidos e inventario con pruebas de concurrencia.
7. Conectar admin Access y validar roles/auditoría.
8. Hacer una transición gradual por dominio o rutas, con rollback al legacy.

No se ejecutó ninguna importación irreversible en esta fase.

## Qué todavía no se migró

- Las tablas finales de productos, pedidos, inventario, banners y auditoría.
- El contenido de `products.json` y `product_variants.json`.
- Las imágenes del catálogo y el Storage de Supabase.
- Supabase Auth y las cuentas administrativas.
- FastAPI/Uvicorn, Render y los workflows legacy.
- La interfaz visual completa del storefront y el dashboard completo.

## Referencias oficiales consultadas

- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [React + Vite on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Astro on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)
- [D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/)
- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
