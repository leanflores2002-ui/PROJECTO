# ROMIX: rastreo, indexación y visibilidad

Revisión del 20 de octubre de 2026 (Argentina). Repositorio `leanflores2002-ui/ROMIX`, rama `develop`. Estado inicial limpio; remoto comprobado. No se encontraron archivos `AGENTS.md` aplicables en el proyecto ni en los directorios ascendentes examinados. Se leyeron las instrucciones de frontend/backend, los generadores, configuración y auditorías anteriores. No se modificó `main`, ni se hizo commit, push, merge o despliegue. Este informe reemplaza las observaciones de producción de auditorías anteriores; no supone que sus pendientes sigan iguales.

## Diagnóstico

**No se comprobó un bloqueo general de rastreo en producción. Sí se comprobaron limitaciones del HTML inicial de productos y referencias inconsistentes a sus URLs. El estado real de indexación y la causa del posicionamiento no pueden confirmarse sin Search Console.**

| Área | Evidencia de producción | Conclusión |
|---|---|---|
| Acceso HTTP | Inicio 200; las 130 URLs del sitemap publicado respondieron 200, sin `X-Robots-Tag: noindex` | Rastreables en las solicitudes realizadas; no prueba que Googlebot reciba siempre lo mismo |
| Redirecciones | HTTP → HTTPS 308; `/mujer.html`, `/hombre.html`, `/ninos.html` → sus directorios con 308 | Correctas en la muestra |
| Robots | `/robots.txt` 200, `User-agent: *`, `Allow: /`, sitemap del dominio correcto | Sin bloqueo global declarado |
| Sitemap | `/sitemap.xml` 200, 130 URLs: seis generales/categorías y 124 productos | Accesible; envío/procesamiento por Google no confirmado |
| Inicio | Título `ROMIX - Indumentaria Deportiva & Urbana`, descripción, H1, canonical `/`, enlaces a categorías en HTML | Contenido básico disponible sin JS; recomendaciones de productos dependen de JS |
| Categorías | `/mujer/`, `/hombre/`, `/ninos/`: 200, título/descripción/H1 y canonical propios; 97/15/12 productos estáticos respectivamente | Buena base de descubrimiento sin JS |
| Catálogo general | `/catalogo.html`: título y canonical propios, pero sin fichas de producto en HTML inicial | Listado dependiente de JS; corregido localmente |
| Productos | Muestra de mujer, hombre y niños: mismo título `ROMIX - Detalle`, descripción genérica, sin H1/canonical/JSON-LD inicial, solo esqueleto | Dependencia de renderizado JS para identificar cada producto; corregida para las URLs canónicas nuevas en local |
| Compartir | Ejemplo `/share/pantalon-baggy-jogging-algodon-rustico-dama/`: 200, metadatos propios, `noindex, follow`, canonical al detalle, navegación mediante JS y enlace alternativo | Exclusión intencional; no debe incorporarse al sitemap |
| Duplicados | `/index.html` 200 con canonical `/`; productos admiten combinaciones `id`, `slug`, `name`, `buy` y seguimiento | Inicio consolidado por canonical; productos requerían referencias coherentes |
| Errores | Ruta inexistente: HTTP 404 con `noindex`; `/product.html?id=no-existe`: HTTP 200 con esqueleto | Ruta genérica de producto puede producir soft 404; su exclusión depende de JS cuando no encuentra producto |

Muestra de detalles consultados, con IDs derivados de nombres como los usados por la generación publicada:

- `/product.html?id=pantalon-baggy-jogging-algodon-rustico-dama`
- `/product.html?id=babucha-rustico-con-lycra-hombre`
- `/product.html?id=remera-oversize-algodon-peinado-chico`

Las URLs completas del sitemap, con `slug` y `name`, también se comprobaron dentro de las 130 respuestas HTTP. La prueba HTTP no ejecuta JS. **No se obtuvo el HTML renderizado por Google ni su canonical elegido.** Google puede renderizar JavaScript, pero una ficha estática elimina esa dependencia para el contenido principal; ver [documentación de Google sobre JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

### Inconsistencia de identidad de producto

Muchos registros no tienen `id` explícito. El generador usaba el nombre normalizado; el catálogo interactivo sintetizaba `sección-nombre`. A su vez, el canonical y la URL para compartir podían agregar ese ID al slug. Ejemplo: el mismo pantalón podía enlazarse con `id=pantalon-baggy-…` o `id=mujer-pantalon-baggy-…`, y con slugs distintos. Es una inconsistencia comprobada entre las fuentes del generador y el código servido, **no evidencia de que Google ya haya indexado todos esos duplicados**.

Además, la resolución anterior de `id` solo buscaba `item.id`: los registros sin ID dependían de que también se suministrara un `slug` o nombre coincidente. Se corrigió la resolución de las formas heredadas para registros sin ID, sin cambiar los identificadores del carrito.

### Producción y Preview

Producción permite indexación en las respuestas examinadas. La configuración existente de `vercel.json` conserva `X-Robots-Tag: noindex, follow` para hosts distintos de `romix-ropas.vercel.app`. El build conserva `romix-preview` y `noindex, follow` cuando `VERCEL_ENV`/`CONTEXT` identifica Preview; las fichas estáticas nuevas también reciben esa exclusión. No se añadió `Disallow: /`: el robot necesita poder leer `noindex`.

**Preview real no confirmado por HTTP:** no se dispuso de una URL Preview identificada y autorizada del proyecto. Se verificó la configuración y el HTML generado en pruebas; falta comprobar un despliegue Preview real. No se cambiaron opciones externas de Vercel ni protecciones de acceso.

## Identidad del negocio y búsquedas públicas

El sitio publica actividad deportiva/urbana, ropa para mujer, hombre y niños, dirección `Concordia 514 local B`, CABA, teléfono y horarios en ayuda. También enlaza Instagram `romixdamasalbertina` y Facebook `ROMIX-concordia-514`. Estos datos ya existían: se conservaron sin afirmar que su vigencia comercial haya sido validada. Se vinculó el JSON-LD `ClothingStore` con esos mismos perfiles mediante `sameAs` y un `@id` estable. No se agregaron direcciones, horarios, reseñas, stock, puntuaciones ni condiciones comerciales.

El nombre ROMIX es ambiguo en búsquedas generales. El conector de búsqueda pública se consultó con:

- `site:romix-ropas.vercel.app`
- `"romix-ropas.vercel.app"`
- `ROMIX ropa Argentina`
- `"ROMIX" "indumentaria" "CABA"`
- `"ROMIX" "Concordia 514"`

El dominio no apareció en las respuestas recibidas del conector; aparecieron marcas y entidades ajenas, y un directorio histórico con comercios llamados Romix y otras direcciones. **No se vinculó ese directorio con este negocio ni se copiaron sus datos.** Las respuestas no proporcionan una medición de posición en Google Argentina.

También se intentaron las cuatro primeras combinaciones relevantes directamente en Google con `hl=es`, `gl=ar` (dominio exacto, `site:`, marca/actividad/CABA y marca/dirección). Google devolvió una página que pide redirección/JavaScript, sin resultados utilizables por esa vía. No se presentan esas respuestas como una SERP vacía ni como una posición comprobada. La ausencia en el conector o en `site:` **no demuestra desindexación**; Google documenta que [el operador `site:` no devuelve necesariamente todas las URLs indexadas](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site).

La falta de impresiones podría deberse a exclusión, canonical alternativo, descubrimiento insuficiente o poca visibilidad para las consultas; no hay datos autorizados para distinguir esas causas. Tampoco se evaluaron backlinks, historial de dominio o competidores con una herramienta de rendimiento. Confirmar que los perfiles sociales publicados enlacen al sitio es un pendiente del propietario, no una modificación realizada aquí.

## Correcciones locales

1. Generación de **123 fichas públicas** en `/productos/<slug>/`, usando el catálogo local actual y la plantilla original de detalle. Cada HTML incluye título, descripción, H1, imagen real, talles, colores, precios derivados de las reglas existentes, canonical, Open Graph y JSON-LD `Product`. No se inventaron `Offer`, disponibilidad ni reseñas. Los controles interactivos existentes reemplazan el contenido inicial al ejecutar JS.
2. Una función compartida para URLs de producto en build y navegador: sitemap, categorías, catálogo interactivo, inicio, búsqueda, relacionados, canonical y páginas para compartir apuntan a la misma ficha. No se usan `name`, `slug`, `id` o seguimiento en las URLs canónicas nuevas. `buy=1` conserva su función sin formar parte del canonical.
3. Conservación de `/product.html?...` para enlaces antiguos. El canonical se actualiza hacia la ficha estática al ejecutar JS. No se implementó una redirección HTTP individual por producto: esa consolidación de URLs heredadas todavía depende del renderizado. Las nuevas URLs no dependen de ese mecanismo.
4. Catálogo general con todos los productos públicos enlazados en HTML inicial; si falla la carga del JSON, se conserva el listado. Las categorías mantienen su alcance y sus títulos. Las fichas estáticas conservan su contenido principal si falla la carga interactiva.
5. Sitemap regenerado con **129 URLs**: seis generales/categorías y 123 productos. Producción tiene 124 productos públicos y el catálogo local tiene 123; **esta tarea no modificó `products.json`, visibilidad, precios ni imágenes originales**. La diferencia preexistente entre producción y local explica el total distinto.
6. Exclusión Preview aplicada también a las fichas nuevas. Compartir continúa con `noindex, follow` y sus imágenes sociales verificadas. Backend conserva sus metadatos, ahora con canonical hacia la misma ficha.
7. `sameAs` en la entidad existente usando únicamente los enlaces sociales ya publicados.

Los archivos de `/productos/`, `/share/` y sus recursos sociales son salidas reproducibles del build y permanecen ignorados por Git. **La entrega debe ejecutar `npm run build` y servir `frontend/public`**; copiar solamente archivos versionados sin build no incluye las fichas generadas. No se cambió la configuración remota para hacerlo.

No se tocaron diseño/CSS fuente, catálogo, precios, reglas de ofertas, persistencia, WhatsApp, Analytics, imágenes originales, videos ni optimizaciones de medios. Los cambios en HTML público se regeneraron desde las fuentes.

## Pruebas y límites

- `npm run test:seo`: sitemap/origen, ocultos, alcance de categorías, todas las fichas estáticas, correspondencia entre fuente y salida, identidad del canonical tras normalización, esquema, enlaces y aislamiento Preview.
- `node tests/storefrontTemplateTests.js`: fuentes y HTML público sincronizados.
- `npm run test:share`: imágenes y páginas para compartir; 169 imágenes primarias revisadas por la prueba existente.
- `npm run test:security`: traversal, redirecciones, XSS, límites y política de ejecutables.
- `npm run check:ts`: pasó.
- `npm run test:regressions`: Analytics, precios compartidos y persistencia del carrito; pasó.
- Backend: `product_share_backend_tests.py` y `seo_backend_tests.py` pasaron usando el Python del entorno temporal existente `romix-qa-venv`, sin instalar paquetes ni alterar inventario. El Python del sistema no tenía FastAPI/Starlette. Se restauró el bytecode versionado que la ejecución había regenerado.
- Playwright/Chromium local, **1440×900 y 390×900**: categorías → producto → seleccionar talle → agregar al carrito → recargar → Comprar ahora → carrito; mensajes de WhatsApp con enlace válido para compartir; canonical estable en URL heredada con parámetros redundantes; las tres secciones probadas con y sin JavaScript. Prueba nueva `productSeoBrowserTests.js` pasó en ambas medidas. Se adaptaron las resoluciones de URLs relativas para que imágenes y navegación sigan funcionando desde los directorios nuevos.
- Regresiones de comercio existentes en las mismas medidas: pasaron tras actualizar los selectores que esperaban las antiguas URLs. No se enviaron pedidos, mensajes ni eventos de Analytics reales; destinos externos interceptados.
- Se revisaron capturas de la ficha interactiva y de la ficha sin JS. No se encontró desbordamiento horizontal en las medidas probadas ni excepciones JS en el flujo nuevo. Los recursos externos se interceptaron: esto no prueba su disponibilidad real.
- El plugin Browser no está disponible en esta sesión; se usó Playwright instalado. El sandbox inicialmente impidió iniciar Chromium (`spawn EPERM`); se ejecutó con el permiso de proceso correspondiente y completó las pruebas.
- `git diff --check`: sin errores de whitespace.
- Suite completa `npm test`: **27/28 grupos pasaron**. El único fallo es `catalogSync`: el baseline no incluye el campo `visible` que el catálogo ya contiene en `Remera manga larga morley viscosa`. Catálogo, baseline, test y helper coinciden con HEAD y no fueron modificados por esta tarea; se conserva este desajuste previo, sin actualizar el baseline ni cambiar visibilidad para ocultar el fallo.

Las pruebas locales no certifican lo que recibe Googlebot en producción ni sustituyen la inspección de URL. Los archivos de evidencia HTTP, resultados de búsqueda, logs y capturas se guardaron en el directorio temporal del sistema, fuera del repositorio.

## Search Console: datos pendientes, por prioridad

No hay conector de Search Console ni sesión de navegador accesible en esta sesión. No se inspeccionó ninguna propiedad ni se modificó configuración externa.

1. **Acceso y propiedad correcta.** Mostrar el selector de propiedad para `https://romix-ropas.vercel.app/` y su estado de verificación. Si no existe, el propietario puede verificar una propiedad de prefijo URL; no se necesita reclamar DNS de todo `vercel.app`. No enviar credenciales ni tokens en el informe.
2. **Inspección de URL de producción.** Para inicio, `/mujer/`, una URL completa de producto del sitemap publicado y su variante observada en enlaces internos: compartir resultado indexado y prueba en vivo. Datos necesarios: estado y motivo de exclusión, último rastreo, agente, rastreo permitido, recuperación, indexación permitida, sitemap/página de referencia, canonical declarado y **elegido por Google**. Adjuntar HTML y captura de “Ver página rastreada/probada”. Esto permite distinguir renderizado, duplicados y falta de descubrimiento.
3. **Indexación → Páginas.** Totales, evolución, fecha de actualización y ejemplos de URLs para: descubierta/rastreada sin indexar, alternativa con canonical, duplicada, bloqueada por robots/noindex, soft 404 y errores de servidor. Separar datos de URLs actuales de URLs históricas o Preview.
4. **Indexación → Sitemaps.** Captura del sitemap enviado, fecha de envío, última lectura, estado, errores y cantidad de páginas descubiertas. Antes de cualquier despliegue aprobado, el sitemap público es el de 130 URLs; después, comprobar el total que corresponda al catálogo desplegado, sus fichas y canonicals, y reenviar solo si procede. No se envió nada desde esta tarea.
5. **Seguridad y acciones manuales.** Pantallas completas de “Acciones manuales” y “Problemas de seguridad”, incluido el estado sin incidencias si corresponde. No se supone que estén limpias.
6. **Rendimiento → Resultados de búsqueda.** Exportar últimos tres meses y comparación con el período anterior, tipo Web, con clics, impresiones, CTR y posición media. Pestañas Consultas, Páginas, Países y Dispositivos; filtrar después marca/variantes y Argentina. Cero impresiones y mala posición son situaciones distintas; los datos permitirán evaluar visibilidad real.
7. **Después de un despliegue autorizado, fuera de esta tarea:** verificar por HTTP la ficha estática, canonical, sitemap, producción sin noindex y Preview con noindex. Inspeccionar las nuevas URLs, las heredadas y los canonicals elegidos. Solicitar indexación solo de URLs válidas si procede y observar los informes; no solicitarla para compartir, carrito o Preview.

No se garantiza indexación, plazo de rastreo ni posición. La mejora local elimina dependencias e inconsistencias comprobables; su efecto requiere un despliegue posterior autorizado y datos de Google.

## Archivos y commit sugerido

Fuentes y configuración:

- `.gitignore`, `package.json`
- `frontend/public/assets/js/product-url.js` (nuevo), `catalog-tabs.js`, `romix-catalog-pages.js`, `search.js`
- `frontend/src/templates/index.html`, `product.html`, `ayuda.html`
- `scripts/generate-product-pages.js` (nuevo), `generate-share-pages.js`, `generate-seo.js`, `generate-category-pages.js`, `sync-storefront-shells.js`, `test-suite.js`
- `backend/app/main.py`

Salidas públicas versionadas regeneradas:

- `frontend/public/index.html`, `catalogo.html`, `product.html`, `ayuda.html`, `cart.html`, `404.html`
- `frontend/public/mujer/index.html`, `hombre/index.html`, `ninos/index.html`
- `frontend/public/sitemap.xml`

Pruebas e informe:

- `tests/productSeoTests.js`, `tests/productSeoBrowserTests.js` (nuevos)
- `tests/commerceBrowserTests.js`, `sharePreviewTests.js`, `shareSecurityTests.js`, `product_share_backend_tests.py`
- `docs/auditoria-google-2026-10-20.md`

Commit sugerido (no creado): `fix(seo): prerender product pages and unify canonical URLs`
