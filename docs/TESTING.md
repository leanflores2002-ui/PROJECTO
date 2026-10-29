# Pruebas funcionales de ROMIX

Trabajo realizado en `develop`, sin commit, push, despliegue ni envíos reales.

## Ejecución

Usar Node 24 y las dependencias de `package-lock.json`. En PowerShell con políticas
restrictivas usar `npm.cmd` en lugar de `npm`.

- `npm test`: regenera las plantillas y ejecuta los 27 grupos JS. Conserva todos los
  grupos originales, continúa después de un fallo y termina con código distinto de
  cero si cualquiera falla. Cada proceso tiene un límite de dos minutos.
- `npm run test:regressions`: Analytics, precios compartidos y persistencia del carrito.
- `npm run test:browser`: servidor estático en puerto efímero, comercio, menú y
  `buttonLabelTests` (nombres accesibles, iconos renderizados, teclado y foco).
  Usa Chromium por defecto; `ROMIX_BROWSER=firefox` o `webkit` selecciona otro motor
  si está instalado. Requiere el navegador correspondiente de Playwright.
  No requiere iniciar el sitio por separado. `ROMIX_TEST_URL` permite usar otro servidor
  para el grupo de menú; por defecto todo es local.
- `npm run test:backend`: instalar `backend/requirements.txt`, `pytest` y `httpx` en
  un entorno virtual y activarlo. Ejecuta pedidos, visibilidad, compartir y SEO.
- `npm run check:ts`: comprobación de tipos.
- `npm run check:products`: validación de campos y referencias de imágenes, sin
  imponer una cantidad fija de productos.
- `npm run test:formats`: formato real de cada archivo referenciado, preservación
  SHA-256 de originales y dimensiones de las copias de entrega/derivados.
- `npm run audit:media-review`: inventario amplio y clasificación de medios. Un
  faltante del catálogo, formato incorrecto o derivado inválido produce salida 1;
  referencias de fixtures/documentación y oportunidades de archivo se informan aparte.

Para evidencia visual, `ROMIX_SCREENSHOTS=1` guarda capturas de producto, carrito y
catálogo en el directorio temporal del sistema; también acepta un directorio existente.
Las capturas no se versionan. Los puertos y procesos de navegador se cierran incluso
si falla una aserción. No se agrega ejecución dinámica de texto a las pruebas nuevas.

Se conserva un único workflow para PR hacia `develop` y ejecución manual: JS,
tipos, catálogo, backend y navegador. No cambia configuraciones externas ni contiene
despliegues. El fallo de un grupo no impide correr los otros y hace fallar el job.

## Cobertura funcional revisada

| Área | Existente reutilizada | Aporte nuevo |
| --- | --- | --- |
| Precios | Descuentos, originales, alias API y precios de variantes | Excepciones declaradas, grupos infantiles, precios no finitos, precio especial en compra real |
| Carrito | Mensaje de pedido y estabilidad | Combinar variantes iguales; separar producto/color/talle aunque llegue una clave falsa; modificar, eliminar y vaciar; cantidades inválidas; recuperar persistencia y JSON corrupto; fallar al guardar/migrar; cantidad incremental de Analytics |
| WhatsApp | Texto decodificado sin precios | Popup real interceptado; `opener=null`; validación de stock; vacío; bloqueo y excepción sin perder carrito; reintento |
| Compartir | Generación, hash de versión, seguridad y host de Preview | Texto completo en WhatsApp/correo/Telegram; payload nativo sin URL separada; capacidades; cancelación y error; Clipboard API y alternativa real `execCommand`; foco devuelto al copiar |
| Catálogo | Secciones, colores, filtros, ocultos, rutas, orden recomendado | Identificadores únicos sin cantidad fija; búsqueda con mayúsculas y sin acentos; combinación de sección/categoría/talle/color/precio; ordenar, cargar más y ocultos; teclado y recuperación de foco |
| Analytics | Formato Arguments que procesa gtag; una inicialización; URL/referrer sin parámetros privados; vistas sin duplicar; WhatsApp como consulta | Se integra al comando principal y se verifica cantidad recién agregada desde el carrito; localhost sin solicitudes a Google |
| SEO/medios | Sitemap, canonical, ocultos, categorías, Preview, referencias reales, dimensiones de derivados, plantillas | Se integra prueba de derivados al comando principal; imágenes visibles y ausencia de desbordamiento en producto/carrito/catálogo |
| API | Fixtures temporales; enteros positivos; suma de duplicados; atomicidad al rechazar; fallo de persistencia; concurrencia | Se reutilizan las 19 pruebas sin duplicarlas y se incorpora ejecución en CI |

Las pruebas JS mezclan unidades y comprobaciones de integración existentes. Las nuevas
de persistencia usan JSDOM con el archivo real, sin servidor ni código extraído por eval.
Las pruebas de navegador ejercitan DOM, eventos, foco y ventanas del navegador real.
Los adaptadores de compartir y portapapeles se instrumentan para observar payloads y
provocar errores; no equivalen a verificar el panel del sistema operativo.

## Defectos corregidos

1. El carrito convertía cero, negativos y fracciones en unidades válidas. Ahora
   rechaza valores que no sean enteros positivos seguros, conservando cadenas numéricas
   usadas por inputs. No se inventa un límite comercial de 99 o un stock inexistente.
2. Una clave recibida podía fusionar variantes diferentes. La identidad se calcula
   siempre a partir de producto, color y talle.
3. La migración borraba el carrito legado aunque fallara la escritura del nuevo.
   Se conserva el dato recuperable cuando falla la persistencia.
4. Dos colores con la misma imagen podían terminar como el primer color de la galería.
   Se conserva el color elegido al sincronizar galería y selectores; regresión en navegador.
5. Una excepción al abrir/navegar la ventana de WhatsApp dejaba el botón bloqueado.
   Ahora conserva el carrito, cierra la ventana incompleta si puede y permite reintentar.
6. Los precios no finitos podían publicarse en la tarjeta compartida. Se omiten.

Se editaron las plantillas de producto/carrito y se regeneraron sus salidas públicas.
En la primera tarea no se modificaron catálogo ni inventario. En la revisión de
pendientes se corrigieron únicamente referencias de formato de imagen, sin cambios
comerciales ni de inventario.

## Informe anterior, antes de resolver pendientes (2026-10-15)

- Pasan las regresiones nuevas, tipos, plantillas, galería, mensaje de carrito,
  precios, filtros, rutas, medios, seguridad, SEO y categorías al ejecutarlos directamente.
- `npm.cmd test`: **25 de 26 grupos pasaron** en la corrida final completa, con
  salida 1 por `catalogSyncTests`. Esto cuenta grupos, no es un porcentaje de cobertura.
- `python -m pytest backend/tests/test_orders.py -q -p no:cacheprovider`: **19 passed**.
  Pasan también los tres scripts backend. Se usó `%TEMP%/romix-qa-venv`, porque el
  Python global no tenía FastAPI ni pytest. Hay advertencias de deprecación de
  TestClient/httpx y `on_event`; no se cambió el backend por ellas.
- `node scripts/check-products.js`: **169 productos y 849 imágenes principales
  validadas**, con 148 advertencias que requieren revisión separada.
- `node tests/commerceBrowserTests.js`: pasa a 1440 y 390 px. Producto → color →
  talle → carrito → cambiar cantidad → WhatsApp, compartir y filtros. Imágenes visibles,
  contenido inicial y desbordamiento se comprueban en las tres vistas. Los errores
  de ejecución se capturan. Las capturas se guardan fuera del repositorio.
  Se usó Playwright instalado porque el plugin Browser no estaba disponible.
- `node tests/megaMenuBrowserTests.js`: pasa en escritorio 1366/1440/1920 y móvil
  360/390/430/768, incluyendo Escape, navegación y vuelta atrás.
- Fallo conservado: `catalogSyncTests` exige 157 productos y hay 169. Además compara
  posiciones y hashes de una migración histórica. No se actualizó el snapshot sin
  evidencia de autorización de cada cambio; `npm test` y CI deben seguir marcando fallo.
- Fallo fuera de la suite principal: `node tests/buttonLabelTests.js` exige SVG
  inline en el HTML fuente y falla ante marcadores actuales `data-romix-icon`.
  Se conserva, sin debilitar expectativas. `romixIconButtonTests` sí pasa.

## Límites funcionales conservados

- La disponibilidad actual de motores y los pasos manuales se detallan al final.
  Clipboard API se instrumentó; el fallback ejecuta el comando real pero no lee
  el portapapeles del sistema.
- Se verifican ventanas reales de WhatsApp con destinos interceptados, sin enviar
  mensajes. El bloqueo se provoca devolviendo null y la excepción mediante SecurityError;
  no se cambió la configuración del bloqueador del navegador.
- La disponibilidad desconocida mantiene la consulta por WhatsApp existente. Los
  fallbacks de precios por grupo ausente requieren una política comercial explícita
  antes de cambiarlos. Faltan más fixtures de datos incompletos en la vista de producto.
- Se verifican filtros combinados, orden y carga incremental con fixtures. Quedan
  pendientes combinaciones exhaustivas y recorrido de teclado completo del menú.
- Analytics verifica comandos gtag y ausencia de solicitudes en localhost; no se
  envían eventos reales a Google ni se verifica su ingestión. Preview se prueba en
  unidad/integración, sin visitar una implementación remota.
- Las imágenes comprobadas en navegador pertenecen a fixtures locales; la auditoría
  del catálogo real comprueba archivos por separado. No se recorrieron todos los productos.
- El lock de pedidos protege hilos dentro de **un proceso**. No protege varios workers,
  procesos o instancias que escriban el mismo JSON. No se afirma atomicidad distribuida;
  para ello hace falta almacenamiento transaccional compartido.

Commit sugerido: `test: ampliar regresiones de comercio y automatizar QA en develop`.

## Archivos modificados

- Implementación: `frontend/public/assets/js/cart.js`, `scripts/share-prices.js`,
  `frontend/src/templates/{cart,product}.html` y sus dos salidas públicas.
- Pruebas nuevas: `tests/cartPersistenceTests.js`, `tests/commerceBrowserTests.js`,
  `tests/catalogIdentityTests.js` y `tests/helpers/browserServer.js`.
- Pruebas ampliadas: `tests/sharePriceTests.js`, `tests/analyticsTests.js`,
  `tests/megaMenuBrowserTests.js`.
- Ejecución/documentación: `scripts/test-suite.js`, `package.json`,
  `.github/workflows/tests.yml` y este documento.

## Revisión de pendientes — estado vigente (2026-10-15)

### Baseline

La investigación y la lista completa de altas, nombres retirados, modificaciones y
commits están en [catalog-baseline-review.md](catalog-baseline-review.md).
Se comprobó la procedencia del catálogo vigente: 15 nombres incorporados, 3 retirados
y 15 productos coincidentes modificados desde `94bf2e0`. El saldo es 169 productos.
Hay renombres y sustituciones; no se consideran todas altas/bajas comerciales nuevas.
Los cambios eran posteriores a una prueba de migración de 57 productos de septiembre.

Se reemplazó ese baseline histórico por un snapshot revisado con hashes SHA-256 de
todos los campos, valores explícitos de precios/grupos/talles, identidad y orden.
Nueve mutaciones en memoria comprueban que siguen detectándose cambios no revisados.
No se fija una constante de cantidad ni se regenera el baseline al ejecutar tests.
La reparación técnica de medios se registra aparte y no modifica decisiones comerciales.

### Clasificación de las 148 advertencias de imágenes

| Causa principal | Cantidad original | Resultado |
| --- | ---: | --- |
| Archivo/referencia de producto inexistente | 0 | Ningún producto o variante requiere una foto faltante |
| Fotografía incorrecta/inconsistente confirmada | 0 | No se sustituyó ninguna foto por elección comercial |
| Formato, dimensiones o peso | 148 | Los 148 archivos eran PNG con extensión `.webp`, y pesaban más de 1,5 MiB |
| Originales sin uso, duplicados u optimización opcional entre esas 148 | 0 | Se informan oportunidades adicionales por separado |

Los problemas de formato y peso corresponden a los **mismos 148 archivos**, no a 296
advertencias independientes. Antes de publicar conviene corregir el formato anunciado
de las imágenes referenciadas. La mera superación del umbral de peso es una mejora
de rendimiento, no prueba por sí sola una foto inválida o un bloqueo de publicación.

Se generaron 148 copias de entrega verdaderamente WebP (`*_delivery.webp`, máximo
1600 px, calidad 82 del optimizador existente), 148 miniaturas y 148 swatches nuevos.
Se cambiaron exclusivamente rutas de imagen en 24 productos, y se regeneraron las
tres categorías estáticas. `config/product-media-formats.json` registra fuente,
formato real y hashes de fuente y entrega. Los 148 originales y todos los derivados
previos permanecen intactos: `git diff` no cambia ninguna imagen preexistente.
La regresión comprueba los 850 archivos distintos referenciados y esa preservación.

Las fuentes originales suman 324.106.372 bytes y sus nuevas entregas principales
18.130.868 bytes. Las 444 copias nuevas suman 24.139.244 bytes: al conservar originales
y derivados previos aumenta el almacenamiento total; disminuye el peso solicitado
por el catálogo. No se borró ni excluyó ningún original del despliegue.

Auditoría final del catálogo: **0 referencias faltantes, 0 imágenes inválidas,
0 formatos incorrectos, 0 derivados faltantes/sobredimensionados y 0 advertencias
de peso de imágenes principales**. No se promete mantener cero advertencias para
futuras altas; la auditoría debe conservar su capacidad de avisar.

La revisión más amplia distingue:

- **20 candidatos por nombre de archivo**, revisados en una plancha de imágenes:
  15 estampados de Short fibrana poplin estampado dama (el nombre del archivo omite
  la palabra estampado), el negro de Ciclista lycra suplex con bolsillo dama, dos
  archivos con sufijo negra en vez de negro, y los dos cuellos Gris melange cuyo
  archivo dice gris. Las fotos revisadas son coherentes con esos nombres; no se
  confirmó una fotografía incorrecta. No es una validación visual de todos los productos
  ni de la correspondencia comercial de cada número de estampado.
- **0 grupos de duplicados exactos por SHA-256**. Esto no descarta fotos parecidas.
- **20 candidatos opcionales de archivo**, sin borrar: seis originales de variantes
  retiradas (`campera_lycra_estampado_negro` y `short_lycra_estampado_9` a `_13`), sus
  doce derivados thumbs/swatches y dos logos optimizados antiguos. Son candidatos
  de uso, no una autorización para eliminarlos.
- La búsqueda textual genérica también encuentra fixtures deliberadamente inexistentes,
  ejemplos de documentación, un dump antiguo con `images/placeholder.jpg`, y una foto
  de local en un `<template>` que no se instancia (`images/local/romix-local.webp`).
  No son imágenes faltantes del catálogo público. La foto del local solo requiere una
  decisión si se quiere activar ese bloque: se necesita una foto real del comercio.
- Se corrigió el fallback inexistente de `catalog-tabs.js` con un placeholder neutro
  integrado; una regresión de navegador comprueba que se decodifica, sin elegir una foto
  comercial sustituta. Ese renderer no está incluido en las páginas principales actuales.

Los reportes detallados se reproducen con `npm run audit:media-review` en
`reports/product-media-after.json` y `reports/product-media-review.json`. El clasificador
incluye swatches y reconoce derivados referenciados implícitamente y originales
preservados; una búsqueda textual de rutas sin esos criterios sobreestima los huérfanos.

### Iconos, accesibilidad y navegador

Exigir SVG inline en las fuentes era obsoleto: el registro Lucide local hidrata
`data-romix-icon` y genera iconos para elementos dinámicos. `romixIconButtonTests`
conserva sus verificaciones del registro. `buttonLabelTests` se incorpora al grupo de
navegador, donde verifica el árbol accesible y el resultado renderizado en las seis
páginas principales, incluidos panel de agregado, cantidad y eliminación de carrito.
No depende de cadenas HTML exactas para las etiquetas ni considera los puntos CSS
del carrusel como iconos ausentes. Menú y búsqueda se abren con Enter, se cierran con
Escape y se verifica el foco; las cantidades y eliminación se accionan con teclado.

Una corrida del flujo de filtros detectó una carrera de la prueba: se enfocaba el
input antes del `requestAnimationFrame` que entrega foco al drawer. Se espera ahora
esa transferencia real de foco antes de pulsar Space, conservando la aserción y sin
reintentos automáticos ni clicks forzados.

Herramientas instaladas: Node 24.11.1, Playwright 1.63.0 y Chromium build 1243.
Se probó el lanzamiento de Chromium, Firefox y WebKit. Chromium arranca; los ejecutables
de Firefox build 1543 y WebKit build 2359 no existen en la caché instalada. Tampoco se
encontró una instalación estándar de Firefox en Program Files. No se descargaron motores.
Browser plugin no disponible; se usó el Playwright instalado.

No se pudo comprobar Firefox, WebKit, Safari real, dispositivos físicos ni el panel
nativo del sistema. WebKit automatizado, cuando esté disponible, **no equivale a Safari real**.
Los payloads nativos y cancelaciones/errores se prueban con adaptadores instrumentados.
Los destinos de WhatsApp, Analytics, mapas y demás solicitudes externas se interceptan;
los enlaces de correo se inspeccionan sin abrir el cliente. No se enviaron datos reales.

### Workflow y validación remota

Se revisó `.github/workflows/tests.yml`: PR con base `develop`, disparo manual,
`contents: read` como único permiso, raíz del repositorio, Node 24, Python 3.13,
JS bloqueado por package-lock mediante `npm ci`, dependencias backend, instalación
Chromium y comandos de JS, tipos, catálogo, backend y navegador. Los procesos devuelven
código no cero al fallar. El job tiene límite de 15 minutos y ejecuta los otros grupos
aunque uno falle, salvo cancelación. No hay despliegues ni comandos de envío.
Se explicitan Chromium y `PYTHONDONTWRITEBYTECODE=1` para no modificar bytecode versionado.
Python mantiene las dependencias no fijadas que ya tenía el proyecto; siguen las
advertencias de deprecación de TestClient/httpx y `on_event`.

Se validó la sintaxis YAML con PyYAML y se ejecutaron localmente los comandos de
comprobación equivalentes, reutilizando dependencias existentes. No se reprodujo la
instalación limpia ni el sistema Ubuntu del runner. La consulta del conector GitHub
para `0f12d8173e68e4d2a9c57d825d9cc943e5ef4e6b` devolvió `workflow_runs: []`.
Los cambios de esta revisión no tienen commit/push: **GitHub Actions sigue pendiente**.
No se creó PR, se disparó un workflow remoto ni se cambió configuración externa.

### Pasos manuales pendientes

1. Con los motores instalados por una persona, ejecutar en PowerShell:
   `$env:ROMIX_BROWSER='firefox'; npm.cmd run test:browser`, y luego con `'webkit'`.
   En bash: `ROMIX_BROWSER=firefox npm run test:browser` y su equivalente webkit.
   El harness mantiene destinos externos interceptados y falla si el motor no existe.
2. Para Safari real, servir localmente con
   `python -m http.server 4173 --bind 127.0.0.1 --directory frontend/public` en macOS
   y abrir `http://127.0.0.1:4173`. Revisar producto → color → talle → carrito,
   cantidades, menú/filtros con teclado, Escape/foco y anchuras 390/1440. No pulsar
   Enviar pedido ni enlaces de WhatsApp/Telegram/correo en esta comprobación manual.
3. Para el panel nativo real, abrir un producto en un navegador con `navigator.share`
   disponible. Abrir Otras opciones, comprobar nombre/precios/enlace y cancelar sin elegir
   destinatario: no debe aparecer éxito. Para comprobar copia, pegar solo en un editor
   local vacío y contrastar el texto; repetir denegando permiso de portapapeles. No enviar.
4. Cuando estos cambios se publiquen por el usuario en un PR hacia develop, revisar
   el job ROMIX tests, sus comandos y logs completos. Una corrida local no confirma CI.

No queda una decisión comercial necesaria para las correcciones realizadas. La foto
del local, la eliminación de archivos opcionales y una validación de paneles/dispositivos
reales requieren información o intervención del usuario si se desean abordar.

### Resultados finales de esta revisión

| Comando o comprobación ejecutada | Resultado |
| --- | --- |
| `npm.cmd test` | **27/27 grupos**, salida 0; incluye baseline y formatos |
| `npm.cmd run test:browser` con Chromium | Comercio a 1440/390, menú en siete tamaños y etiquetas a 1440/390: pasan |
| `node tests/buttonLabelTests.js` tras agregar Tab/Shift+Tab | Ambas anchuras pasan; foco contenido en el drawer y recuperado al cerrar |
| Pytest de pedidos con Python del entorno temporal | **19 passed**, tres advertencias de deprecación |
| Scripts backend de visibilidad, compartir y SEO | Los tres pasan |
| `npm.cmd run check:ts` | Pasa |
| `node scripts/check-products.js --json` | 169 productos, 849 imágenes principales distintas; warnings/errors vacíos |
| `npm.cmd run audit:media-review` | Salida 0; sin problemas del catálogo, 20 candidatos opcionales y 0 duplicados exactos |
| `node tests/catalogSyncTests.js` y `node tests/productFormatTests.js` al finalizar | Pasan |
| PyYAML con BaseLoader y revisión del workflow | YAML válido; PR develop/manual, permiso read y límite 15 min |
| Diff del catálogo tras revertir en memoria el mapa de rutas | Coincide exactamente con HEAD: datos comerciales intactos |
| `git diff --check` y sintaxis de scripts nuevos | Pasan; Git avisa conversión LF/CRLF, no errores de whitespace |

Los comandos Python se ejecutaron con `%TEMP%/romix-qa-venv/Scripts/python.exe` y
`PYTHONDONTWRITEBYTECODE=1`; no se cambió el Python global ni las dependencias instaladas.
La corrida inicial de navegador con la carrera de foco falló y se corrigió como se
explica arriba; las corridas posteriores completas pasaron. No quedan grupos ejecutados
fallidos. Firefox/WebKit/Safari y GitHub Actions son verificaciones pendientes, no
resultados aprobados ni evidencia de compatibilidad total.

| Evidencia de navegador | Alcance real |
| --- | --- |
| Identidad/contenido | Rutas locales, título de producto, seis páginas con controles presentes |
| Vista inicial y overlay | Capturas inspeccionadas de menú desktop/móvil; sitio estático, sin overlay de framework observado |
| Errores | Cero `pageerror` en los tres grupos; el menú comprueba también cero errores de consola |
| Capturas | `%TEMP%/romix-mega-{desktop,mobile}.png` y producto/carrito/catálogo a 1440/390 |
| Interacción | Variante→carrito→popup real interceptado, compartir, filtros, teclado y foco |

Archivos de esta revisión: baseline/prueba/helper de catálogo, informe de procedencia,
prueba de formatos, manifiesto y tres scripts de investigación/reparación, auditoría y
validador de productos, `catalog-tabs.js`, catálogo y tres salidas de categorías,
los tres grupos de navegador, runner JS, package.json, workflow y este documento.
Se añaden 444 archivos de entrega/derivados (24,1 MB) y se conserva toda imagen previa.
El inventario, los precios y los cambios de implementación anteriores permanecen intactos.

Commit sugerido para esta revisión: `test: resolver baseline, formatos de medios y accesibilidad de controles`.
