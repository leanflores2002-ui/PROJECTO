# ROMIX Admin: arquitectura y operación

## Componentes

- Catálogo: `frontend/public`, estático y sin cuentas de clientes.
- Admin: `frontend/admin`, React/Vite, autenticado exclusivamente con Supabase Auth.
- API: `backend/app`, FastAPI en Render.
- Persistencia: PostgreSQL, Storage y Auth de Supabase.

La referencia visual versionada está en `docs/assets/romix-admin-product-editor-concept.png`.

## Desarrollo local

Backend:

```bash
python -m venv .venv
pip install -r backend/requirements-dev.txt
uvicorn backend.app.main:app --reload --port 8000
```

Admin:

```bash
cd frontend/admin
npm install
npm run dev
```

Copiar `.env.example` a `.env` sin versionarlo. El admin local vive en `http://127.0.0.1:5173/admin`. Para inspeccionar únicamente el layout vacío en desarrollo se puede usar `/admin?preview=editor`; este bypass existe solo en builds DEV y no acepta guardado.

## Supabase

1. Crear el proyecto y obtener URL, connection string pooler y publishable/anon key.
2. Aplicar en orden los archivos de `supabase/migrations/` con Supabase CLI.
3. Mantener RLS habilitado. El frontend no recibe permisos directos sobre tablas.
4. Configurar `DATABASE_URL` de Render con el pooler transaccional de Supabase y SSL.
5. Configurar `SUPABASE_URL` y, durante transición de claves, `SUPABASE_JWKS_URL` o `SUPABASE_JWT_SECRET`.

La service role key es solo para backend y futuras operaciones Storage. Nunca usar prefijo `VITE_` para ese secreto.

## Crear un administrador

No existe registro público. Crear el usuario desde Supabase Dashboard/Auth o Admin API controlada. Luego vincularlo:

```sql
insert into public.admin_profiles (user_id, role, display_name, is_active)
values ('UUID-DE-AUTH-USERS', 'superadmin', 'Nombre', true);
```

Roles: `superadmin`, `admin`, `operator`. Desactivar acceso con `is_active=false`; no es necesario eliminar el usuario para una baja temporal.

## Migrar products.json

Validar sin escribir:

```bash
python scripts/migration/import_products.py --expect-products 157
```

Importar a una base vacía:

```bash
python scripts/migration/import_products.py --apply --database-url "$DATABASE_URL"
```

El importador aborta ante errores, cantidad distinta, imágenes faltantes o una tabla `products` no vacía. La base se verifica antes del commit. El backup original está en `backend/data/legacy/products.original.json`.

Los SKU importados son determinísticos y deben revisarse. El stock 5/2/0 proviene del estado histórico de talle y es provisional.

## API y seguridad

- `/api/admin/*`: requiere Bearer JWT válido y perfil admin activo.
- `/api/admin/dashboard`: métricas reales, pedidos y actividad.
- `/api/admin/products`: listado, creación y edición.
- `/api/admin/inventory/{variant_id}/adjust`: ajuste atómico con movimiento y auditoría.
- `/api/public/orders`: pedido sin cuenta, precio resuelto en servidor y stock bloqueado transaccionalmente.
- `/api/health`: liveness.
- `/api/health/ready`: readiness con PostgreSQL.

La descripción HTML se limita a párrafos, negrita, cursiva, listas y enlaces. No se guardan passwords, tokens ni secretos en `audit_logs`.

## Storage

La migración crea buckets públicos `product-images` y `banners`, con límite de 10 MB y MIME de imagen. Las rutas nuevas deberán seguir:

```text
product-images/{product-id}/{uuid}.{ext}
banners/{banner-id}/{uuid}.{ext}
```

Los registros de imágenes heredadas usan `source=legacy`, URL pública actual y `storage_path=null`. Deben copiarse y verificarse antes de cambiar a `source=storage`. La carga desde Admin todavía está deshabilitada en esta fase para evitar una implementación parcial insegura.

## Vercel público

- Root Directory: `frontend/public`
- Framework: Other
- Build Command: vacío (o generación de share pages desde raíz en un pipeline previo)
- Output Directory: `.`
- Variables: ninguna secreta; dominio futuro `romixropas.com`

Revisar `scripts/generate-share-pages.js`: actualmente su fallback sigue apuntando al dominio Netlify para preservar producción. Definir `ROMIX_SITE_URL` en el build al migrar.

## Vercel Admin

- Root Directory: `frontend/admin`
- Build Command: `npm run build`
- Output Directory: `dist`
- Variables seguras: `VITE_API_URL`, `VITE_PUBLIC_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ADMIN_PATH`
- Dominio futuro: `admin.romixropas.com`

`vercel.json`, meta robots y `robots.txt` aplican noindex. La ruta discreta no reemplaza autenticación.

## Render

- Root Directory: repositorio
- Build: `pip install -r backend/requirements.txt`
- Start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- Health: `/api/health`
- Variables: ver `.env.example`; no copiar valores reales al repositorio.
- `ALLOWED_ORIGINS` debe enumerar catálogo, admin y previews autorizados. Producción rechaza `*`.

## Backups y rollback

- Mantener backups automáticos de Supabase y verificar restauraciones.
- Exportar base antes de migraciones destructivas futuras.
- El JSON original y catálogo público siguen presentes durante la transición.
- Para rollback temprano, mantener `ROMIX_CATALOG_SOURCE=json` y no conectar todavía el pedido público al endpoint PostgreSQL.

## Troubleshooting

- `401`: falta/expiró el access token.
- `403`: el usuario no tiene `admin_profiles` activo o su rol no alcanza.
- `503 Supabase Auth`: faltan URL/JWKS/JWT secret en backend.
- `503 database`: falta `DATABASE_URL` o el pooler no está disponible.
- CORS: agregar el origin exacto, sin path, a `ALLOWED_ORIGINS`.
- Admin en blanco: comprobar `VITE_*`, consola del navegador y `/api/health`.
- Migración abortada por filas existentes: no forzar; usar una base vacía o revisar manualmente el estado.
