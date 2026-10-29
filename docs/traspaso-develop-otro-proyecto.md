# Traspaso de cambios de ROMIX a otro proyecto

## Propósito y alcance

Este archivo explica los cambios finales de develop antes del PR hacia main y sirve como contexto para otra sesión de Codex. No implica publicar ni modificar el otro proyecto automáticamente.

Fecha: 17 de octubre de 2026. Repositorio origen: leanflores2002-ui/ROMIX.
- develop revisado: c97ca2804102f3af42d8abb8b7747dea0ed1ed1a
- main local consultado: 22c439b40e02ca638dd6d2aa9ecc348c88b54960
- Ancestro común usado para comparar: 67fcf4d7b1c16ec111f7d3d070320888ae135c05

La comparación usa las referencias locales; no se hizo fetch ni se comprobó que coincidan con las referencias remotas actuales. El parche adjunto reproduce el resultado final entre el ancestro común y develop, incluidos recursos binarios. No es una selección de todos los cambios históricos de ROMIX.

## Qué agregar y por qué

### 1. Estética y estructura visual

Se consolidó la composición de inicio en romix-home-pro.css y su bundle generado, reduciendo estilos inline y reglas duplicadas. La estética utiliza superficies planas, geometría rectangular, títulos condensados con Anton local y texto de lectura/controles con Manrope. Se mantiene el logo y la paleta de ROMIX: blanco, negro y rosa. La licencia OFL de Anton acompaña al archivo WOFF2.

Motivo: coherencia visual y una fuente de estilos más fácil de mantener. Incluye ajustes de encabezado móvil, catálogo, producto, ayuda, carrito y pie de página. Estos cambios son visuales; no se debe trasladar el catálogo, precios o identidad ROMIX a un proyecto distinto salvo pedido expreso.

Archivos principales: frontend/public/assets/css/romix-design-system.css, romix-home-pro.css, romix-header.css, romix-footer.css y las hojas específicas incluidas en el inventario. El encabezado compartido nace en frontend/src/templates/partials/header.html. La home mantiene el límite de 12 productos en escritorio y 4 en móvil.

### 2. Video principal adaptable

El primer bloque de inicio es ahora un video a todo el ancho, con título y enlace al catálogo abajo a la izquierda y un control circular de reproducción/pausa. Usa object-fit: cover, que llena el espacio recortando según el tamaño; el encuadre debe revisarse con el material del proyecto destino.

Se sirve una versión de escritorio hasta 1600x556 (1.606.184 bytes) y otra móvil 768x432 (630.174 bytes), sin audio. Se selecciona la entrega móvil hasta 960 px y se cambia de archivo si se cruza ese umbral. Las portadas WebP son independientes y permiten mostrar contenido durante la carga, sin JavaScript y ante fallos. Los originales actuales duran 10 segundos, incluido el archivo etiquetado para celulares, que es horizontal.

La carga del video se difiere hasta después de cargar la página y cuando corresponde reproducirlo. Se pausa fuera de pantalla y en pestañas ocultas, respeta la pausa manual y evita descarga automática con ahorro de datos o reducción de movimiento. Un bloqueo de autoplay conserva portada y reproducción manual. El botón tiene aria-label desde el HTML inicial y se actualiza al reproducir/pausar.

Motivo: destacar la campaña sin descargar el original pesado en cada visita ni imponer movimiento a quien lo restringe.

Fuentes: frontend/src/templates/index.html; frontend/public/assets/js/home-video.js; estilos home; scripts/optimize-home-video.js; frontend/public/videos/. El script utiliza FFmpeg para generar H.264 sin audio y sharp para portadas. FFmpeg se necesita para regenerar, no para desplegar archivos ya generados. Ver docs/home-video.md para detalles vigentes.

### 3. Carrusel de imágenes y orden de inicio

Orden principal: video, nuevos lanzamientos y carrusel promocional. Outlet permanece como primera imagen del carrusel secundario. Se quitó la sección de temporada solicitada y sus tres imágenes identificadas en el inventario; no borrar otros recursos sin comprobar referencias.

En celulares hasta 760 px, las flechas del carrusel se ubican en una franja blanca debajo de la imagen, con botones de 48x48 px y separación de los indicadores. Los controles tienen foco visible y el indicador activo expone aria-current. Se conserva el deslizamiento existente.

Motivo: evitar que las flechas tapen el banner o queden demasiado cerca de otros controles táctiles.

### 4. Pruebas y generación

Se incorporaron pruebas de video en tests/homeVideoBrowserTests.js y ajustes de regresiones para comprobar la nueva composición sin perder controles de comercio. El servidor de pruebas reconoce MP4. package.json incluye test:home-video y optimize:home-video y suma el video a test:browser.

Los cambios se realizan en frontend/src/templates y hojas fuente; scripts/sync-storefront-shells.js genera páginas públicas y el bundle de inicio. npm run build regenera además las páginas para compartir y SEO. No editar únicamente el HTML o CSS generado porque la siguiente generación puede reemplazarlo.

## Cambio descartado expresamente

NO incorporar la reubicación del nombre y precio encima de la foto del producto en celulares. Fue implementada en d2690c4c y revertida en fd5aa426 por decisión del usuario. El parche refleja el estado final revertido. No aplicar commits históricos individualmente sin considerar el revert.

## Lo que debe conservar el proyecto destino

Su logo, paleta, URLs, dominio canonical, Analytics, catálogo, precios, talles, stock, SEO, flujo de pedidos y configuración de despliegue. No agregar cuentas/usuarios, base de datos, pago online ni cambios comerciales por inferencia. Las rutas ROMIX y nombres de clases del parche son referencias de implementación, no requisitos para otra arquitectura.

## Cómo usar el paquete

1. Leer esta guía e inspeccionar el inventario antes de editar.
2. Revisar la rama, cambios locales e instrucciones del proyecto destino. Conservar el trabajo existente.
3. Si es otro checkout de ROMIX con una base compatible, revisar el parche y usar git apply --check antes de considerar aplicarlo. Esa comprobación solo valida compatibilidad del parche, no el funcionamiento.
4. Si es una aplicación diferente, portar los comportamientos por componente. No aplicar el parche completo: contiene HTML generado, marca ROMIX, rutas y videos propios.
5. Regenerar los derivados y páginas con las herramientas del destino; actualizar su mecanismo de versiones/caché.
6. Ejecutar pruebas equivalentes y revisar móvil/escritorio. Informar lo aplicado, lo omitido y por qué. No hacer commit, push, merge ni despliegue sin autorización.

## Validación realizada en ROMIX

Sobre el código final revisado antes de crear esta documentación:
- 27/27 grupos JavaScript aprobados con npm test.
- 19 pruebas de pedidos aprobadas; también visibilidad por temporada, compartir y SEO del backend.
- npm run check:ts y generación de páginas aprobados.
- npm run test:browser aprobado: comercio 1440/390 px, menú, nombres accesibles/iconos/teclado/foco y cinco escenarios de video (normal escritorio/móvil, reducción de movimiento, ahorro de datos, fallo de carga).
- Corrección detectada: faltaba aria-label inicial del botón de video; corregida en plantilla y HTML generado, sin cambiar su aspecto.
- Backend ejecutado con dependencias en una carpeta temporal porque Python no las tenía disponibles. Aparecieron advertencias de deprecación de FastAPI/Starlette, sin fallos.
- Se usó Chromium mediante Playwright porque Browser no estaba disponible. No se comprobó Safari real, Firefox, CI remoto ni el despliegue de producción. No se enviaron pedidos reales. Las pruebas no garantizan ausencia absoluta de defectos.

## Prompt listo para el otro proyecto

Leé TRASPASO-DEVELOP-ROMIX.md y archivos-modificados.txt. Usá cambios-develop.patch como evidencia del cambio final, no como orden de sobrescribir este proyecto. Primero inspeccioná la arquitectura e instrucciones locales. Identificá qué partes de estética, video adaptable, rendimiento, accesibilidad y carrusel móvil ya están implementadas y preservalas. Adaptá solo lo pertinente a este proyecto, explicando qué agregar y por qué, conservando sus datos, marca, rutas y funcionalidades. No restaures la reubicación del nombre y precio del producto: fue descartada. No traslades contenido comercial de ROMIX sin autorización. Verificá carga, pausa, portadas, ahorro de datos, reducción de movimiento, cambios de tamaño, controles táctiles, teclado y regresiones de comercio. Antes de modificar comportamientos de negocio no definidos, pedí aclaración. Dejá los cambios revisables e informá pruebas y límites. No hagas commit, push, merge ni publiques.

## Inventario exacto del cambio final

A = agregado, M = modificado, D = eliminado. Rutas relativas al repositorio origen.

M	docs/design-system.md
A	docs/home-video.md
M	frontend/public/404.html
M	frontend/public/assets/css/romix-catalog-pages.css
M	frontend/public/assets/css/romix-design-system.css
M	frontend/public/assets/css/romix-footer.css
M	frontend/public/assets/css/romix-header.css
M	frontend/public/assets/css/romix-help.css
M	frontend/public/assets/css/romix-home-bundle.css
M	frontend/public/assets/css/romix-home-pro.css
M	frontend/public/assets/css/romix-minimal-theme.css
M	frontend/public/assets/css/romix-pricing.css
M	frontend/public/assets/css/romix-product-detail.css
M	frontend/public/assets/css/romix-shell-base.css
A	frontend/public/assets/fonts/Anton-OFL.txt
A	frontend/public/assets/fonts/anton-latin.woff2
A	frontend/public/assets/js/home-video.js
M	frontend/public/assets/js/romix-catalog-pages.js
M	frontend/public/ayuda.html
M	frontend/public/cart.html
M	frontend/public/catalogo.html
M	frontend/public/hombre/index.html
D	frontend/public/images/ROPA_DEPORTIVA.png
D	frontend/public/images/optimized/ROPA_DEPORTIVA-1440.webp
D	frontend/public/images/optimized/ROPA_DEPORTIVA-960.webp
M	frontend/public/index.html
M	frontend/public/mujer/index.html
M	frontend/public/ninos/index.html
M	frontend/public/product.html
A	frontend/public/videos/Athletes_training_in_industrial_gym_romix.mp4
A	frontend/public/videos/Athletes_training_in_industrial_gym_romix_celulares.mp4
A	frontend/public/videos/ROMIX_Training_Panoramico_escritorio.mp4
A	frontend/public/videos/romix-principal-mobile-poster.webp
A	frontend/public/videos/romix-principal-mobile.mp4
A	frontend/public/videos/romix-principal-poster.webp
A	frontend/public/videos/romix-principal.mp4
M	frontend/src/templates/404.html
M	frontend/src/templates/ayuda.html
M	frontend/src/templates/cart.html
M	frontend/src/templates/catalogo.html
M	frontend/src/templates/index.html
M	frontend/src/templates/partials/header.html
M	frontend/src/templates/product.html
M	package.json
A	scripts/optimize-home-video.js
M	tests/cardVariantTests.js
M	tests/commerceBrowserTests.js
M	tests/helpers/browserServer.js
A	tests/homeVideoBrowserTests.js
M	tests/storefrontStabilityTests.js
