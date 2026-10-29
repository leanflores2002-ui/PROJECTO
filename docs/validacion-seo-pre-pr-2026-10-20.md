# Validación SEO antes del PR — 20 de octubre de 2026

Repositorio `leanflores2002-ui/ROMIX`, rama `develop`. Base examinada:
`14547c3d073a4a2d1dc6f061b74948fe682555be`. El árbol estaba limpio al comenzar.
Se leyó primero `auditoria-google-2026-10-20.md`, además de las instrucciones de
frontend, pruebas y revisión del baseline. No se encontraron `AGENTS.md` aplicables.
Se conservan los cambios existentes y las reversiones del usuario; no se restauró
el cambio de interfaz revertido en `fd5aa426`. Sin commit, push, merge o despliegue.
La referencia local de `main` se conserva en `faa251aa20d7bddf13abd624844e51deac319365`.

## Resultado y alcance

La expectativa pendiente del catálogo estaba desactualizada y fue revisada de forma
puntual. El SEO original tiene un Preview real del commit correcto y se comprobó
por HTTP y navegador. Esa comprobación detectó un defecto de `srcset` que se corrigió
**solo localmente**. Por tanto, el Preview de `14547c3d` no certifica la versión final
del árbol de trabajo: falta otro Preview que incluya las correcciones de esta revisión.
No se creó un despliegue ni se usó otro proyecto como sustituto.

## 1. Causa del fallo del baseline

La prueba original falló de nuevo en `Remera manga larga morley viscosa`, primero
por el campo `visible` añadido. La auditoría de **todos** los hashes mostró también
el cambio de `season`, que la primera aserción impedía ver.

| Evidencia | Resultado |
|---|---|
| Baseline frente al catálogo de `67fcf4d7` | Coincidencia completa: identidades, orden, precios y cada campo |
| `git show 330d8d76 -- frontend/public/assets/data/products.json` | Dos cambios explícitos en un solo registro |
| Catálogo anterior → actual | `season`: `media-estacion` → `invierno`; `visible`: ausente → `false` |
| Resto de la comparación | Ningún cambio en precios, grupos, talles, colores, imágenes, nombres, altas/bajas, orden u otros campos |
| Commit SEO `14547c3d` | No modificó `products.json` |

El cambio está versionado en `330d8d76008cd3541fadca71c01d0eaedff482d8`
(`Update products.json`), anterior al SEO. No hay evidencia de una modificación
accidental introducida por el trabajo SEO. No hace falta inventar una decisión
comercial: se conserva exactamente la ocultación y temporada ya versionadas.

Se actualizaron **manualmente solo los hashes de esos dos campos**, la revisión
de procedencia y la fecha. No se ejecutó un generador del baseline, ni se copiaron
todos los valores actuales, ni se ignoraron campos. Se añadió una mutación negativa
de temporada a las nueve existentes. La comparación de todos los campos y el orden
sigue activa. La procedencia detallada queda en `catalog-baseline-review.md`.

## 2. Catálogo y páginas actuales, comprobados localmente

| Medida | Valor actual |
|---|---:|
| Registros del catálogo | 169 |
| Públicos (`visible !== false`) | 123 |
| Ocultos | 46 |
| Fichas estáticas generadas y con `index.html` | 123 |
| Mujer / hombre / niños públicos | 96 / 15 / 12 |
| URLs del sitemap | 129: seis generales/categorías y 123 productos |
| Entradas de colores comprobadas en fichas estáticas | 652 |

Los 123 no son una cantidad fija impuesta por el generador. La disminución histórica
de 124 a 123 corresponde a la remera ocultada en `330d8d76`. No se eliminó un registro.
`products.json` permanece idéntico a HEAD durante esta revisión.

Auditoría de todas las fichas, sin ejecutar JavaScript:

- H1, canonical, Open Graph y esquema `Product` corresponden a su producto y al
  dominio definitivo `https://romix-ropas.vercel.app`.
- El JSON precargado se comparó en profundidad con **cada campo** del producto,
  incluidos precios por grupo, excepciones, colores y talles. No se perdieron variantes.
- Los precios estáticos corresponden al formateador existente y los talles y colores
  declarados están presentes. Las pruebas de precios conservan casos independientes
  para talles comunes, especiales, infantiles y excepciones declaradas.
- Las imágenes principales de las 123 fichas tienen archivo real; los controles de
  medios verificaron también las referencias y formatos del catálogo completo.
- Catálogo y las tres categorías enlazan únicamente las fichas públicas de su alcance.
  No quedan fichas generadas de los 46 productos ocultos ni URLs suyas en el sitemap.
- Las URLs antiguas siguen funcionando en las muestras de las tres secciones y
  declaran el mismo canonical después de renderizar. La consolidación de esas URLs
  heredadas sigue dependiendo de JS; no se añadió una redirección HTTP por producto.
- La ruta antigua de un producto oculto muestra “No se encontró el producto” y
  `noindex`. Que esa ruta genérica responda 200 sigue siendo una limitación de la
  arquitectura estática anterior; no se incluyó en el sitemap.

Se ejecutaron builds completos de Preview y luego producción. Las 132 páginas HTML
generadas (nueve shells/categorías y 123 fichas) recibieron la exclusión de Preview.
La generación siguiente para producción eliminó `romix-preview` y no heredó
`noindex` en las páginas públicas. Carrito y 404 conservan su exclusión intencional.
Los canonical permanecen en el dominio definitivo en ambos entornos.
Los hashes de las 123 fichas de producción antes y después de esa secuencia son
idénticos: la regeneración conserva las correcciones.

## 3. Preview real: identidad y HTTP

- Proyecto: `romix`, ID `prj_M0w3DNjknZtHROdmTwLWdWof1sG8`.
- Despliegue: `dpl_FBAmdRXEmd84ydbwqmKjLpeq2T5p`, estado `READY`, rama `develop`.
- Commit: **`14547c3d073a4a2d1dc6f061b74948fe682555be`**.
- URL inmutable: <https://romix-4y0na3phc-ct-7472s-projects.vercel.app/>.
- Repositorio de los metadatos: `leanflores2002-ui/ROMIX`.
- Se verificó por separado que producción corresponde a `main`, commit `faa251aa…`.
  El proyecto parecido `romix-public` pertenece a `PROJECTO` y fue descartado.

La primera solicitud anónima redirigió al login de Vercel. No era un error de ROMIX.
Se usó el acceso temporal autorizado del conector, sin desactivar la protección,
cambiar reglas de acceso ni incluir credenciales en archivos versionados.

En las **129 URLs** del sitemap se comprobó HTTP 200, canonical al dominio definitivo,
`<meta name="robots" content="noindex, follow">` y
`X-Robots-Tag: noindex, follow`. Las 123 fichas contienen contenido y esquema iniciales.
El catálogo JSON y `product-url.js` servidos coinciden byte a byte con las fuentes
del commit local. La ficha estática de la remera ocultada devuelve 404. La página
para compartir examinada conserva `noindex` y canonical hacia la ficha.

### Navegador en ese Preview

Chromium, 1440×900 y 390×900, con destinos externos interceptados:

| Recorrido | Resultado |
|---|---|
| Inicio, catálogo y las tres categorías | Contenido, imágenes visibles y ausencia de desbordamiento comprobados |
| Búsqueda real `baggy`, filtro de precio y reinicio | Correctos en ambas medidas |
| Producto de cada sección, cambio de color y selección de talle por teclado | Correctos; precio visible y entrada de variante en carrito |
| Agregar, recargar, Comprar ahora | Conserva carrito y navega a `/cart.html` desde rutas anidadas |
| Aumentar y disminuir cantidad, quitar producto | Estado del carrito comprobado después de cada acción |
| Compartir por WhatsApp y abrir WhatsApp desde carrito | Popup real y texto comprobados; solicitudes interceptadas antes de contactar WhatsApp |
| URLs antiguas y ocultos | Canonical y exclusión comprobados en las muestras |
| Lectura sin JavaScript | Fichas de las tres secciones en escritorio y celular |
| Teclado móvil | Apertura con Enter, Tab dentro del menú y Escape con retorno de foco |
| Axe WCAG A/AA | Cero infracciones detectadas en 12 combinaciones: seis páginas × dos medidas |
| Excepciones JS, solicitudes fallidas, respuestas de error en el recorrido | Ninguna |

No se enviaron mensajes ni pedidos reales. El clic de pedido solo abrió un destino
interceptado y modificó el almacenamiento de la sesión de prueba. La revisión de
accesibilidad es una muestra automatizada, no una certificación completa.

**Hallazgo en Preview:** aparecieron advertencias `Failed parsing 'srcset'` y
`Dropped srcset candidate "images/products/Calza_algodon"`. El nombre real de algunas
imágenes contiene espacios y se insertaba sin codificar en un candidato `srcset`.
Las imágenes fallback cargaban, pero el navegador descartaba esa fuente.
También se registra el aviso esperado de “producto no encontrado” al probar un oculto.

## 4. Correcciones adicionales y su validación local

1. Codificación de espacios y comas en candidatos individuales `srcset`, preservando
   escapes `%20` existentes, nombres de archivo, variantes e imágenes fallback.
   Se aplicó en el constructor compartido de imágenes y en las actualizaciones
   dinámicas de catálogo y detalle. Versiones de assets actualizadas y HTML regenerado.
2. Regresión de imagen: espacios/comas, ausencia de doble codificación y conservación
   del fallback. La prueba de navegador SEO ahora falla si recibe advertencias de `srcset`.
3. La prueba `buttonLabelTests` falló intermitentemente al comprobar retorno de foco
   inmediatamente después de cambiar `aria-expanded`. El encabezado lo restaura
   mediante `requestAnimationFrame`. La prueba aislada pasó después sin cambiar
   la aplicación, confirmando la carrera. Se agregó una espera acotada por la condición
   real de foco, conservando la aserción. No se cambió la navegación del sitio ni
   se añadió un sleep arbitrario.

El recorrido ampliado con datos reales también se ejecutó en local en ambas medidas.
No presentó advertencias `srcset`, excepciones JS, peticiones fallidas o errores HTTP.
Los dos avisos de producto no encontrado son los ocultos probados deliberadamente.
La corrección de `srcset` **no está en el Preview de `14547c3d`**; se necesita probar
otro Preview para certificar la versión final.

## 5. Pruebas: estado y límites

- Fallo inicial de `catalogSync`: reproducido, dos diferencias identificadas y revisión
  puntual documentada; pasó después de la corrección de la expectativa.
- `npm test`: **28/28 grupos aprobados**, reejecutado después de las correcciones técnicas.
- Auditoría estática ampliada de las 123 fichas y 46 ocultos: aprobada.
- Builds completos Preview → producción, aislamiento y comparación de hashes: aprobados.
- Backend: **19/19 pruebas de pedidos**, más visibilidad estacional, compartir y SEO aprobados.
  Se usó el entorno temporal existente y `PYTHONDONTWRITEBYTECODE=1`, sin alterar inventario.
  El intento inicial en sandbox falló al crear fixtures temporales por permisos; la
  reejecución autorizada pasó. Advertencias de deprecación de dependencias, sin fallos.
- TypeScript y comprobación de catálogo: aprobados; 169 productos y 849 imágenes
  principales/referencias validadas por `check:products`.
- Auditoría funcional ampliada local y Preview: aprobada en ambas medidas, con el
  hallazgo de consola de Preview descrito por separado.
- Accesibilidad del Preview: 12 análisis Axe sin infracciones detectadas.

La primera cadena local de navegador se interrumpió en el retorno de foco y no llegó
a los grupos posteriores. Ese resultado no se presenta como una aprobación completa.
La reejecución final de `npm run test:browser` terminó con salida 0: **los cinco
grupos aprobaron** (comercio, mega menú, controles accesibles/teclado/foco, video de
inicio y SEO de productos). Incluye escritorio/celular y los cinco escenarios de
video, entre ellos movimiento reducido, ahorro de datos y error de descarga simulado.
No quedan pruebas fallidas en las ejecuciones finales de los grupos realizados.
Los primeros validadores temporales también requirieron ajustar dos supuestos del
arnés (el carrito no usa un elemento `main` y una mención de `romix-preview` dentro
de JS no es una etiqueta meta). Se corrigieron esos validadores usando el DOM;
no se modificó la aplicación para ocultar esas falsas alarmas.
No se probaron Firefox, WebKit, dispositivos físicos, el panel nativo de compartir
del sistema operativo ni la disponibilidad real de los destinos externos interceptados.
No se inspeccionó Google Search Console ni se deduce indexación a partir de estas pruebas.

Se usó Playwright instalado porque el plugin Browser no está disponible. Los scripts
ampliados, logs JSON, respuestas y capturas quedaron en el directorio temporal, con
prefijo `romix-pr-`; no contienen tokens en los informes. El archivo temporal de acceso
se elimina al terminar la comprobación.

## 6. Archivos modificados en esta revisión

- `tests/catalogSyncBaseline.json`: revisión puntual de dos hashes y procedencia.
- `tests/catalogSyncTests.js`: regresión negativa de temporada.
- `docs/catalog-baseline-review.md`: evidencia histórica y decisión de conservación.
- `frontend/public/assets/js/romix-image-utils.js`, `romix-catalog-pages.js`: candidatos `srcset`.
- `frontend/src/templates/product.html`: codificación de fuentes y versión de dependencia.
- `frontend/src/templates/index.html`, `cart.html`, `catalogo.html`: versiones de assets.
- `frontend/public/index.html`, `product.html`, `cart.html`, `catalogo.html`,
  `mujer/index.html`, `hombre/index.html`, `ninos/index.html`: regenerados desde las fuentes.
- `tests/imageUtilsTests.js`, `productSeoBrowserTests.js`: regresiones del defecto observado.
- `tests/buttonLabelTests.js`: espera de foco por condición, misma aserción.
- `docs/validacion-seo-pre-pr-2026-10-20.md`: este informe.

No se modificaron catálogo, precios, stock, variantes, imágenes originales, CSS de
diseño, Analytics, configuración de Vercel ni reversiones de interfaz.

## 7. Pendientes antes del PR y después de publicar

Antes de considerar la versión final lista para producción:

1. Revisar el diff local, especialmente la actualización limitada del baseline y la
   corrección de imágenes. No queda una decisión comercial nueva pendiente.
2. Disponer de un Preview que incluya **este diff**, confirmar su commit y repetir
   especialmente imágenes/console, cache de assets, teclado, carrito y `noindex`.
   El Preview actual acredita el SEO de `14547c3d`, pero conserva el defecto corregido
   localmente. No se hizo push ni despliegue para producir uno nuevo.

Después de una publicación autorizada:

1. Comprobar HTTP, sitemap y canonical del dominio productivo, sin `noindex` en las
   páginas públicas, manteniendo la restricción de Preview.
2. En Search Console, revisar propiedad correcta y procesamiento del sitemap.
3. Inspeccionar inicio, categorías, fichas nuevas y URLs antiguas: indexación permitida,
   HTML renderizado, último rastreo y canonical elegido por Google.
4. Revisar Páginas/errores/soft 404 y ejemplos de duplicados o no indexados.
5. Revisar Acciones manuales y Problemas de seguridad; luego Rendimiento por consultas,
   páginas, país y dispositivo. Solicitar indexación solo de URLs válidas si procede.

No se afirma que ROMIX ya esté indexado ni se garantizan posiciones, plazos o indexación.
