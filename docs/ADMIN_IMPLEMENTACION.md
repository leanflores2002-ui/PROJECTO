# Administración ROMIX

Rama: `feature/admin-products-analytics`. Base: PROJECTO `3e4c280` después de copiar ROMIX.

## Qué incluye

- **Panel**: inventario actual, métricas operativas, gráfico GA4 y últimos cambios.
- **Productos**: creación, duplicación, publicación/ocultamiento, nombre, descripción propia,
  precio base/anterior/grupos, identificadores, categoría, público, temporada, etiquetas,
  material, composición, cuidados, calce, origen, características, colores y talles.
  Stock por variante con motivo y control de versión para evitar sobrescribir ajustes concurrentes.
- **Fotos**: elección desde la computadora, vista previa, progreso, principal, orden,
  eliminación y reemplazo. Guardadas en el bucket `romix-products` de Supabase Storage.
  El reemplazo agrega el nuevo archivo antes de quitar el anterior. Las operaciones de galería
  se guardan inmediatamente; los campos del producto requieren Guardar cambios.
- **Análisis**: usuarios del período, sesiones, páginas vistas, gráfico diario, productos vistos,
  unidades agregadas al carrito y clics de WhatsApp. En el editor se consulta también el producto
  seleccionado. Sin conexión no se inventan cifras. GA4 no certifica ventas ni personas físicas;
  el tag actual no emite purchase. Los informes pueden tardar y aplicar umbrales.
- **Usuarios**: el propietario (`superadmin`) puede invitar editores, administradores y lectores.
  El correo lleva a `/admin/activate` para elegir contraseña. No hay registro público ni
  promoción a propietario desde el cliente. Si la creación del perfil falla después del correo,
  la cuenta Auth queda sin acceso: revisar el servicio, no reenviar a ciegas.
- **Notificaciones**: auditoría persistente de productos, descripciones, precios, stock, imágenes
  y nuevas cuentas. Badge de cambios recientes, revisado cada 30 segundos. La lectura se guarda
  por usuario en este navegador; no sincroniza leídos entre dispositivos. El contador muestra
  hasta los 25 cambios recientes, y el historial tiene paginación.

La tienda mantiene su layout y recursos. Se eliminó la generación de descripciones genéricas:
una descripción vacía permanece vacía. Se prioriza la API sobre el JSON; un respaldo local no
se presenta como stock confirmado. La edición no se hace escribiendo en los archivos versionados.
Con DATABASE_URL configurada, catálogo, detalle y disponibilidad se consultan desde PostgreSQL.
Sin esa variable continúa la tienda de archivos, pero el admin informa falta de configuración.

## Reutilizar Supabase anterior

El conector encontró `Romix` (`gpzeftandqgafxipqhnh`) INACTIVE el 14/10/2026. No se reactivó,
no se ejecutaron migraciones, no se enviaron invitaciones ni se escribieron datos remotos.

1. Reactivar ese proyecto y revisar el esquema existente en lectura. Los tres SQL restaurados
   son los históricos; **no aplicar el baseline otra vez ni resetear la base**. Comparar columnas
   y migraciones aplicadas antes de decidir qué falta.
2. Configurar variables backend del `.env.example`: DATABASE_URL (con SSL/pooler según proyecto),
   SUPABASE_URL, SERVICE_ROLE_KEY privada, JWKS/JWT, PUBLIC_FRONTEND_ORIGIN,
   ADMIN_FRONTEND_ORIGIN y ALLOWED_ORIGINS exactos. Uvicorn puede leer el archivo con
   `--env-file .env`; el código no carga .env por sí solo.
3. Confirmar `admin_profiles`, productos/variantes/precios/imágenes, auditoría y bucket romix-products.
   Mantener los UUID, legacy_id y los paths. La clave privada nunca va en una variable VITE.
4. Confirmar que la cuenta del propietario tenga un perfil activo con rol superadmin mediante
   un proceso administrativo privado del proyecto, usando el UUID correcto. No se asigna ese rol
   automáticamente por correo o por registrarse en Auth.
5. Configurar en Supabase Auth las URL permitidas del admin y `/admin/activate`, el envío de
   correos y las políticas de contraseña. Probar una invitación en staging con un destinatario autorizado.
6. El catálogo JSON actual tiene 169 productos. La DB anterior puede contener otra versión;
   inventariar y reconciliar IDs, imágenes y existencias antes de activar la API en producción.
   El importador histórico es para DB vacía y crea stock provisional; no sincroniza ventas
   ni restaura inventario real. No ejecutarlo con --apply sobre la DB operativa.

## Google Analytics

El tag existente es `G-JJB0XY6PPR`, activo únicamente en romix-ropas.vercel.app.
**No es el ID de propiedad de la Data API.**

1. Obtener el ID numérico de la propiedad GA4 y definir GA4_PROPERTY_ID sólo en backend.
2. Habilitar Google Analytics Data API y autorizar una cuenta de servicio con permiso de lectura
   en esa propiedad. Configurar GOOGLE_APPLICATION_CREDENTIALS apuntando a su archivo privado
   (o Application Default Credentials del proveedor). No subir ese archivo a Git ni al navegador.
3. Confirmar recepción de page_view/view_item/add_to_cart/whatsapp_order_click y luego revisar
   `/api/admin/analytics` autenticado. La lectura usa API oficial con caché de cinco minutos.
4. Los usuarios totales se obtienen del informe del período, no sumando usuarios diarios.
   Las unidades agregadas al carrito no equivalen a personas. Los clics de WhatsApp no equivalen
   a mensajes enviados ni pedidos pagados. Los más pedidos se aproximan por interés del carrito;
   para ventas reales deben usarse pedidos completados o instrumentar confirmaciones verificables.

Referencias: https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart
y https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema

## Ejecutar y publicar

Backend: instalar `backend/requirements-dev.txt` en un venv y ejecutar desde raíz
`python -m uvicorn backend.app.main:app --env-file .env --host 127.0.0.1 --port 8000`.

Admin: en `frontend/admin`, instalar con `npm ci`, copiar `.env.example` a `.env.local`,
completar las variables públicas y ejecutar `npm run dev`. Abrir `/admin/`.
En producción VITE_API_URL y VITE_PUBLIC_SITE_URL deben ser las URL reales, no localhost.

`npm --prefix frontend/admin run build` genera dist. FastAPI sirve ese build en `/admin/`
cuando existe al arrancar. Si se publica el admin por separado en Vercel, usar Root Directory
frontend/admin, output dist y su configuración de rewrites; VITE_API_URL debe señalar FastAPI.

Para la tienda estática en Vercel, definir **ROMIX_API_ORIGIN** como el origin HTTPS del backend
durante el build público (`npm run build`). El generador produce romix-api-config.js y los helpers
de catálogo/inventario usan esa URL. Si se sirve todo desde FastAPI, dejarla vacía para mismo origin.
Configurar CORS antes de probarlo. Las consultas de API no se cachean como snapshots estáticos.
No cambia el tag de Analytics ni habilita métricas en localhost.

No se desplegó ni se modificó main. Los valores de prueba del navegador son interceptados y
no forman parte de `.env.example` ni del código de producción.

## Validación y límites

19 tests React, 25 backend y flujos de navegador con servicios simulados: edición nombre/precio,
subida local, gráficos, invitación, notificaciones/leídos y navegación móvil. Build y lint del admin.
No validan escrituras reales de DB/Storage/GA4 ni recepción del correo, porque falta reactivar/configurar servicios.
La suite pública tiene un baseline previo que exige 157 productos aunque HEAD contiene 169;
no se cambió ese baseline ni el catálogo para esconder el fallo. Las pruebas de estabilidad se
adaptaron al nuevo contrato API primero y caché v8; el resto de pruebas públicas se ejecutó por separado.

La galería existente relaciona imágenes con el producto, no ofrece edición de asociaciones
por color individuales. Conservar y revisar las imágenes históricas por color al reconciliar el catálogo.
El checkout público actual continúa con su flujo WhatsApp; no se agregó una pasarela de pagos.
