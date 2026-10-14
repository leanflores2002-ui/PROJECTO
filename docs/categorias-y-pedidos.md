# Categorías SEO y validación de pedidos

Cambios locales en `develop`, sin commit, push ni publicación. Dominio principal
conservado: `https://romix-ropas.vercel.app`.

## Categorías

- `/mujer/`: 97 productos públicos; `/hombre/`: 15; `/ninos/`: 12.
- La plantilla de catálogo y sus componentes compartidos generan las tres páginas.
  Todas incluyen sus productos y enlaces de detalle en el HTML inicial; el mismo
  catálogo interactivo añade filtros, ordenación y el control de cargar más.
- Título, descripción, H1, texto introductorio, canonical y Open Graph propios.
  Sitemap: 130 URL únicas (124 productos, tres categorías, inicio, catálogo y ayuda).
- `catalog-sections.js` comparte clasificación y publicación entre cliente y generador.
  Las miniaturas utilizan el resolver existente; se conservan carga diferida y dimensiones.
- Encabezado, pie, inicio, catálogo y atajos de búsqueda enlazan las nuevas rutas.
  Las URL anteriores `catalogo.html?sections=...` siguen funcionando, incluidos
  filtros combinados, búsquedas y orden. No se generan páginas para cada filtro.
  Cada combinación en una categoría conserva el canonical de esa categoría.
- Los antiguos `/mujer.html`, `/hombre.html`, `/ninos.html` redirigen a las rutas
  nuevas mediante configuración versionada para Vercel y Netlify. No se alteraron paneles.
- Las rutas anidadas resuelven recursos y navegación desde el origen mediante
  `<base href="/">` y `document.baseURI`. No duplican datasets ni código de filtros.
- El listado generado se conserva si falla la carga del catálogo; los enlaces
  siguen disponibles y se informa que los filtros no están disponibles temporalmente.
- Preview aplica noindex también a las categorías; producción no lo aplica a sus
  páginas públicas. Carrito y páginas de compartir mantienen noindex.
- Se corrigieron contraste del enlace activo del menú y visibilidad de “Ver más”
  cuando el atributo hidden indica que no quedan productos.
- La exclusión existente de copy-paste de Sonar se extiende solamente a las tres
  nuevas salidas HTML deterministas. Sus fuentes y el análisis de errores y seguridad
  permanecen activos; no se cambió el quality gate.

## Imágenes y CSS

Se conservó la eliminación del propietario de los estampados 8–12 del Capri.
La validación de medios pasa con 1.579 referencias y 856 WebP canónicos. No se
restauraron variantes ni fotos; los precios y demás datos del catálogo se conservaron.
El chequeo general de productos pasa, aunque informa advertencias previas de
peso de imágenes originales. Los derivados siguen pasando sus pruebas.

La prueba de galería verifica existencia del CSS, parámetro de versión y coherencia
entre plantilla y salida generada, sin fijar `v=18`. Se mantienen los tokens de caché
y se incrementaron los correspondientes a los assets modificados en esta etapa.

## Pedidos

- Los fixtures usan archivos temporales de productos y variantes y restauran las
  variables globales al terminar. Ninguna prueba modifica datos comerciales reales.
- `qty` debe ser un entero JSON positivo; se rechazan booleanos, cadenas, decimales,
  cantidades nulas, negativas o cero mediante HTTP 400. Items inválidos también dan 400.
- Se acumulan cantidades por variante normalizada antes de comprobar disponibilidad.
- Se valida todo antes de reservar. La memoria se actualiza solo después de persistir
  el snapshot completo mediante archivo temporal y reemplazo atómico en el mismo directorio.
- El RLock existente cubre validación, persistencia y publicación de la memoria, evitando
  sobreventa entre solicitudes concurrentes dentro de un único proceso.
- 19 pruebas cubren los casos originales, cantidades inválidas, variantes repetidas,
  fallos sin reservas parciales, concurrencia y error de escritura.
- No se conectó el frontend a `/api/orders`: sigue coordinando pedidos por WhatsApp.
  Las pruebas interceptan la apertura; no envían mensajes, cobran ni crean pedidos reales.

Limitaciones conservadas: el JSON y el lock son locales a un proceso. No garantizan
consistencia entre múltiples workers, instancias o servidores. Antes de habilitar esa
arquitectura hay que definir persistencia compartida y reservas transaccionales, fuera
de este alcance. No se amplió el sistema para registrar pedidos, calcular importes en
servidor o aceptar pagos. El inventario de respaldo 5/2/0 sigue sin ser prueba de stock real;
no debe activarse comercialmente sin inventario verificado. La sustitución atómica evita
JSON truncado, pero no promete durabilidad ante todas las fallas del sistema de archivos.

## Verificación y pendientes

Las pruebas de medios, galería CSS, rutas, filtros, variantes, ofertas, carrito WhatsApp,
visibilidad, orden recomendado, estabilidad, previews sociales, resolución de imágenes,
seguridad, SEO y categorías pasan. TypeScript compila y las pruebas de derivados pasan.
Las regresiones Python de compartir, visibilidad y seguridad HTTP/JSON también pasan.

20 de las 21 pruebas de la cadena JavaScript pasan al ejecutarlas individualmente;
el único fallo de esa cadena es el baseline indicado abajo. En Playwright/Chromium
se verificaron inicio, catálogo, categorías, producto, carrito y ayuda en 1440×900 y
390×900: sin errores de consola, HTTP fallidos, imágenes rotas, desbordamientos ni
violaciones axe WCAG A/AA en las vistas revisadas. Se ejercitaron filtros, limpiar,
ordenación, cargar más, búsqueda, enlaces de producto, menú y WhatsApp interceptado.
Con JavaScript desactivado, Mujer conserva sus 97 productos y enlaces en el HTML.
Las 130 rutas del sitemap responden HTTP 200 en el servidor local. Las capturas y
scripts de comprobación están fuera del repositorio.

Se ejecutó el build completo con entorno Preview y se comprobó en navegador que
inicio, catálogo, las categorías, ayuda, carrito y producto conservan noindex.
Luego se regeneró producción, cuya salida pública quedó sin la marca de Preview.

Permanece el fallo previo de `catalogSyncTests`: el baseline espera 157 productos y
el catálogo actual contiene 169. No se actualizó automáticamente. Por eso `npm test`
se detiene allí; las demás pruebas se ejecutaron individualmente.
La prueba adicional `buttonLabelTests`, fuera de esa cadena, también falla con HEAD:
exige SVG inline en el HTML, aunque el sistema actual genera iconos desde data-romix-icon.
No se modificó para ocultar el fallo; las comprobaciones actuales de iconos y navegador
son independientes. Persisten avisos de deprecación de FastAPI/Starlette en Python.

Las verificaciones de esta etapa son locales. No se desplegaron las nuevas categorías
ni las correcciones de pedidos. El Preview consultado en la etapa diagnóstica anterior
no contiene estos cambios nuevos. El estado de producción no se deduce de los tests.

Antes de publicar mediante un proceso autorizado: verificar build `npm run build`,
salida `frontend/public`, origen configurado y entorno de producción. Luego comprobar
HTTP 200 de categorías y sitemap, canonical propio, ausencia de noindex en producción
y noindex en Preview/carrito. Las redirecciones de plataforma requieren verificación
en el despliegue real; el servidor estático local no ejecuta las reglas de Vercel/Netlify.
Search Console sigue requiriendo acceso del propietario: verificar la propiedad,
enviar sitemap e inspeccionar páginas. No se comprobó indexación en Google.
