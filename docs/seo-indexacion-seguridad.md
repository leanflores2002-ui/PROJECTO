# Auditoría de SEO, indexación y seguridad

Actualización: la etapa posterior de categorías y validación de pedidos está
documentada en [categorias-y-pedidos.md](categorias-y-pedidos.md). Los resultados
y pendientes de esa etapa sustituyen los estados iniciales indicados abajo.

Revisión del 13 de octubre de 2026, realizada localmente en `develop`. Sin commit,
push ni despliegue. Dominio confirmado por el propietario:
`https://romix-ropas.vercel.app`.

## Implementación conservada

- Plantillas fuente y encabezado/pie compartidos; generación determinista de seis páginas.
- Catálogo de 169 productos, precios por grupo, variantes, ofertas y visibilidad.
- Imágenes WebP, miniaturas y derivados, carga diferida, tamaños de imágenes,
  precargas, caché del catálogo JSON, bundle CSS y menú móvil existente.
- Contacto, dirección, horarios, medios de pago y condiciones de cambios publicados.
- Imágenes sociales verificadas, escape de redirecciones y controles contra
  traversal, descargas arbitrarias y ejecución mediante PATH no confiable.

## Cambios

- `config/site.json` centraliza el origen confirmado. `ROMIX_SITE_URL` puede
  sobreescribirlo con un origen válido; no configurar allí una URL Preview.
- Las plantillas usan `%%ROMIX_SITE_ORIGIN%%`, resuelto por `sync:shells`.
  Canonical y metadatos sociales ya no apuntan a Netlify.
- El build genera sitemap con inicio, catálogo, ayuda y los 124 productos públicos:
  127 URL únicas. Usa las rutas de detalle existentes, con sus parámetros actuales.
  No incluye carrito, 404, productos ocultos ni vistas de redirección para compartir.
- Las páginas para compartir mantienen sus imágenes y redirección existentes,
  con canonical hacia el detalle y `noindex, follow`. Se generan solo para productos
  publicados y se eliminan las salidas obsoletas al regenerar.
- Carrito y 404 quedan fuera del índice. Las páginas públicas permanecen rastreables.
- Preview añade `noindex` al HTML durante el build si `VERCEL_ENV` o `CONTEXT`
  identifica un entorno distinto de producción. El código de producto conserva
  esa exclusión al actualizar sus metadatos.
- `vercel.json` añade `X-Robots-Tag: noindex, follow` a hosts distintos del principal;
  no hay una exclusión global que alcance producción. Alias adicionales quedan
  deliberadamente fuera del índice. No es protección de acceso.
- Metadatos específicos por producto, descripción y canonical coherentes con el sitemap.
  El detalle estático sigue renderizándose con JavaScript; verificar el HTML renderizado
  por Google en Search Console. No se reemplazó por otra arquitectura.
- JSON-LD `Product` usa nombre, descripción e imagen reales; no declara Offers,
  stock, puntuaciones o reseñas. No se afirma elegibilidad para resultados enriquecidos.
  `ClothingStore` en ayuda usa exclusivamente dirección, teléfono y horarios ya publicados.
- H1 accesible en inicio; contraste corregido en controles y textos detectados por axe.
  Zoom con controles independientes, acordeones cerrados sin enlaces enfocables
  y tablas de talles desplazables mediante teclado. Se conserva la disposición visual.
- Sitio estático evita consultar una API de stock inexistente. Si se integra un backend
  con el carrito estático, habilitar explícitamente `window.ROMIX_API_ENABLED = true`
  antes del código del carrito. El detalle detecta los datos precargados del backend.
- Cabeceras `nosniff`, `SAMEORIGIN` y política de referer en Vercel, Netlify y backend.
  No se agregó una CSP que pueda bloquear los scripts inline o Google Maps existentes.
- CORS del backend limita orígenes, métodos y cabeceras, sin credenciales wildcard.
  `ROMIX_CORS_ORIGINS` permite listar orígenes autorizados separados por coma.
- JSON precargado del backend se escapa para evitar cerrar etiquetas script;
  se conserva la caché del JSON. Título y descripción se generan por producto.
  TemplateResponse usa argumentos nombrados compatibles con las dependencias actuales.

## Datos y servicios observados

- Carrito, preferencias y cachés de productos/inventario se guardan en el navegador
  (localStorage/sessionStorage). No se encontró un formulario activo de pago con tarjeta.
- WhatsApp/Meta recibe el texto del pedido y los datos que la persona decida enviar
  al abrir y enviar su mensaje. El sitio no ejecuta un cobro con Mercado Pago;
  lo menciona como medio de pago a coordinar.
- Google Fonts recibe solicitudes del navegador; el mapa incrustado realiza solicitudes
  a Google Maps. El proveedor de alojamiento recibe las solicitudes HTTP.
- Redes sociales externas reciben visitas cuando se abren sus enlaces.
- No se encontraron integraciones activas de Analytics/Pixel ni envío de newsletter.
  Hay código de newsletter sin formulario activo y un widget de soporte sin incluir
  con teléfono/email de ejemplo: no activarlos sin datos confirmados.
- La búsqueda de patrones de claves privadas y tokens en archivos fuente no encontró
  coincidencias. Esto no equivale a una auditoría de todo el historial o de secretos remotos.
- `npm audit`: cero vulnerabilidades informadas. Python tiene requisitos sin versiones
  fijadas ni lockfile; falta una base reproducible y auditoría de la instalación de producción.

## Verificación

- Generación pública y de compartir completada: 124 productos publicados.
- 16 de los 19 tests JavaScript existentes pasaron al ejecutarlos individualmente.
  La cadena `npm test` se corta ante el primer fallo previo; no se alteraron esos tests.
- `test:seo`: 127 URL, exclusión de ocultos, origen, canonical y aislamiento Preview.
- TypeScript: `check:ts` pasó. Pruebas Python de compartir, visibilidad y regresiones
  de seguridad HTTP/JSON pasaron con dependencias instaladas solo en una carpeta temporal.
- Playwright/Chromium: inicio, catálogo, ayuda, carrito, producto y 404 en 1440×900
  y 390×900. Contenido visible, sin overlays, sin errores de consola, sin peticiones
  fallidas y sin desbordamiento horizontal en la ejecución final con servidor Node local.
  Axe WCAG A/AA no reportó violaciones en esas vistas. No es una certificación completa.
- Navegación catálogo → producto en ambas medidas y test de menú móvil/escritorio pasaron.
  Las 127 rutas del sitemap respondieron 200 localmente; los enlaces estáticos internos
  de las seis páginas tienen archivos de destino. Capturas fuera del repositorio.
- Las primeras pruebas con el servidor Python local tuvieron rechazos de conexiones;
  se repitieron con servidor Node. No se modificaron pruebas para ignorar esos errores.

Fallos previos conservados:

1. `catalogSyncTests`: baseline de 157 productos frente a los 169 actuales.
2. `productGalleryTests`: exige literalmente CSS `v=18`; HEAD ya tenía `v=19`.
   Los CSS afectados ahora usan `v=20` para invalidar cachés.
3. `mediaStorageTests`: falta, entre otras referencias posibles,
   `images/products/capri_lycra_combinado_estampado_8.webp` (swatch).
   Hace falta la imagen original correcta; no se sustituyó ni inventó una variante.
4. Los dos tests Python de pedidos usan `p1`, pero el cargador recarga el catálogo real
   y responde “Producto p1 inexistente”. También fallan ejecutando el backend original de HEAD.

## Pendientes del propietario y configuración externa

- Confirmar cobertura, costo y plazo de envíos/retiros. No hay una política detallada publicada.
- Completar condiciones de devoluciones/reintegros y resolver la diferencia entre
  cambios por 15 días y la FAQ que invita a solicitar devolución. No se inventó texto legal.
- Confirmar titular/responsable, canal de privacidad, finalidad, conservación y tratamiento
  de datos para redactar el aviso de privacidad y políticas que correspondan.
- Verificar que dirección, horarios, teléfono y medios de pago publicados siguen vigentes.
- El backend genera cantidades de stock de respaldo (5/2/0) a partir de estados generales.
  No son evidencia de inventario real. Antes de habilitar esa API en producción, proporcionar
  inventario real y revisar autenticación, límites y reservas de pedidos. Producción consultada
  responde 404 en `/api/variants`; el storefront muestra disponibilidad a confirmar.
- Revisar en Vercel Root Directory, Build Command (`npm run build`), Output Directory
  (`frontend/public`), `ROMIX_SITE_URL` y producción/Preview. Esta sesión no cambió el panel,
  la rama de producción, protección de despliegues ni publicó ningún entorno.
- Los hosts antiguos de Netlify deben redirigir al dominio principal o retirarse desde su
  cuenta. Cambiar archivos del repositorio no modifica un despliegue antiguo ya publicado.
- La consulta HTTP de producción encontró inicio 200 con canonical antiguo, robots 200,
  sitemap 404, API de variantes 404 y ruta inexistente 404. Los cambios locales aún no están allí.
  Las cabeceras nuevas requieren verificar producción y Preview después de un despliegue autorizado.

## Google Search Console

1. En tu cuenta, añadir la propiedad de prefijo URL `https://romix-ropas.vercel.app/`.
   Usar prefijo URL evita necesitar control DNS sobre el dominio compartido `vercel.app`.
2. Elegir verificación por archivo HTML o etiqueta meta. El archivo/valor exacto lo entrega
   Google; incorporarlo en las fuentes/generación sin reemplazar la página de inicio.
3. Después de publicar estos cambios por el proceso autorizado, enviar
   `https://romix-ropas.vercel.app/sitemap.xml` en Sitemaps.
4. Inspeccionar inicio, catálogo, ayuda y una URL de producto del sitemap; ejecutar la
   prueba en vivo y revisar canonical seleccionado, HTML renderizado y capacidad de indexación.
5. Verificar también una URL Preview: debe estar excluida por `noindex` y producción no.
   No bloquear el rastreo mediante robots.txt porque Google necesita leer la exclusión.
6. Solicitar indexación si procede y revisar los informes de páginas y sitemap con el tiempo.
   No se comprobó indexación en tu cuenta ni se prometen posiciones o fechas de indexación.

Referencias: [noindex de Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing),
[configuración Vercel](https://vercel.com/docs/project-configuration/vercel-json),
[datos Product](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).
