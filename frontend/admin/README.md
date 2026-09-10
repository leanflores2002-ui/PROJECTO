# ROMIX Admin

React 19 + Vite. Las operaciones de catálogo, imágenes e inventario pasan por el
cliente `src/lib/api.js` hacia FastAPI; Supabase JS se utiliza únicamente para Auth.

## Desarrollo y validación

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

`dist/` es el único directorio de publicación. No importar imágenes del frontend
público: las miniaturas y la galería usan URLs devueltas por la API.
Mantener las variables VITE existentes; no colocar credenciales de backend en Vite.

## Componentes y contratos

- `App` carga login y validación; `AppShell` se descarga después de autorizar.
- `ProductsPage` / `useProducts`: paginación de servidor 25/50/100, debounce de 300 ms,
  cancelación de búsquedas y deduplicación de lecturas simultáneas sin caché persistente.
- `ProductEditor`: pestañas General, Imágenes, Variantes e Inventario. Compara el
  formulario con la última versión guardada y protege navegación/logout/cierre de pestaña.
- `ImageManager`: cola local de archivos, progreso de transporte y confirmación de API.
  Reutiliza Storage mediante FastAPI; el orden usa PATCH de imágenes. Reemplazar primero
  sube el archivo nuevo, luego conserva principal/posición y elimina el anterior.
  Si falla una etapa, muestra error y conserva las imágenes ya confirmadas.
- `Inventory`: el diálogo confirma la operación del servidor. No modifica el stock de
  forma optimista y conserva el control `expected_updated_at`.
- `ResourcePage`: categorías, colecciones, pedidos, banners, guías y configuración.
  Usuarios y actividad son consultas paginadas; crear cuentas continúa siendo un
  proceso controlado de Supabase Auth. No se agregó eliminación física de productos.
- `Feedback` y `components/ui`: shadcn/Radix para foco modal, pestañas, confirmaciones,
  campos y skeletons; Sonner para notificaciones. `admin-ux.css` define la adaptación ROMIX.

Los scripts DOM `admin-enhancements`, `product-focus`, `admin-modules` y `content-modules`
se retiraron tras migrar sus funciones. No reintroducir observadores globales para alterar
el DOM de React. Los listeners de cierre se registran y eliminan con el ciclo de vida.

## Compatibilidad de backend

El listado ahora incluye `image_url`, calculado desde la galería existente. Se agregaron
GET `/api/admin/admins` y `/api/admin/audit-logs`, restringidos a admin/superadmin y paginados.
No hay cambios de esquema, stock, precios, pedidos ni autorización de rutas existentes.
Desplegar también estas lecturas del backend para habilitar ambos módulos.

Las pruebas de navegador deben usar productos temporales y un entorno local/staging.
La validación local usa Auth y Storage simulados, con FastAPI y PostgreSQL reales locales;
no equivale a una prueba contra Vercel, Render o Supabase de producción.
