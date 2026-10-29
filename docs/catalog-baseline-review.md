# Revisión del baseline del catálogo — 2026-10-15

Se compararon el catálogo de `94bf2e0` (última revisión del baseline anterior),
el de `d39fc5e` (último cambio del catálogo antes de esta tarea), y el árbol de trabajo.
La comparación completa se reproduce con `node scripts/catalog-baseline-audit.js`;
el JSON resultante queda en `reports/catalog-baseline-review.json`, sin actualizar
automáticamente el baseline. El script conserva procedencia por commit y valores anteriores/nuevos.

## Qué comprobaba la prueba anterior

El baseline se creó en `3b2675c` para una migración concreta: 157 productos en un
orden fijo, hash de campos inmutables y una lista de 57 modificaciones permitidas
de precios/grupos/talles. En `94bf2e0` se normalizaron extensiones de medios.
No era una regla comercial que el catálogo debiera tener siempre 157 productos.
Tras las altas y actualizaciones siguientes, también quedaron obsoletos hashes,
nombres, posiciones y algunos precios; cambiar solo la cantidad no arreglaba la prueba.

## Diferencias históricas comprobadas

Por identidad de nombre hay **15 nombres incorporados, 3 retirados y 15 productos
coincidentes modificados**: 157 + 15 - 3 = 169. No son 15 altas comerciales independientes:
el historial demuestra renombres y sustituciones.

| Nombre incorporado | Procedencia |
| --- | --- |
| Pantalon baggy jogging algodon rustico dama | `8bb180c` |
| Palazo algodon morley liviano dama | `ec9ed31` |
| Palazo wide-leg cey dama | `f3aadbe` |
| Short fibrana poplin liso dama | `ad907dc` |
| Short fibrana poplin estampado dama | `c120665` |
| Ciclista lycra suplex con bolsillo dama | `d8beba1` |
| Remera oversize algodon peinado dama | `3e6c668`, nombre ajustado en `f3aadbe` |
| Camisola fibrana poplin dama | `4b3ca8b` |
| Camisola fibrana poplin con manga volado dama | `4b3ca8b`, foto corregida en `20dc11e` |
| Remera algodon oversize peinado hombre | `3e6c668` |
| Remera algodon moline hombre | Renombre de molino en `f3121b4` |
| Pantalon algodon rustico recto chico | Sustitución del nombre anterior en `cce971e` |
| Calza lycra morley con bolsillos dama | `f1f21a3` |
| Calza oxford algodon con lycra dama | `d8beba1` |
| Campera corto lycra morley dama | `e4a5582` |

Nombres retirados: **Camisola fibrana dama** (`4b3ca8b`, sustituida por las dos
camisolas poplin), **Remera algodon molino hombre** (`f3121b4`, pasa a moline),
**Pantalon algodon rustico chico** (`cce971e`, pasa a recto chico).
El renombre molino→moline también ajustó el precio original de 11000 a 10000.

| Productos coincidentes modificados | Diferencia respecto a septiembre | Evidencia |
| --- | --- | --- |
| Pantalon jogger fibrana liso y estampado | special2: 9100→10200 | `ac3ff8e` |
| Capri modal | 6000→6500; grupos 6000/6800/7600→6500/7300/8100 | `ac3ff8e` |
| Capri algodon morley liviano | special 9500→9800; special2 10600; talles 9/10 y excepción declarada | `6686673`, incorporado a develop en `281afd6` |
| Bermuda fibrana liso y estampado | 6000→7000; grupos 6000/6800/7600→7000/7800/8600 | `ac3ff8e` |
| Pantalon morley liviano dama | special2: 12300→12600 | `ac3ff8e` |
| Remera algodon peinado hombre | 9000→8500; grupos 9000/9600→8500/9000; imagen y colores | `3e6c668` |
| Remera oversize algodon peinado y Remera oversize algodon peinado chico | Se retiran featured/featuredBadge | `3e6c668` |
| Capri lycra combinado | Actualización de colores; designs se sincroniza con los siete colores vigentes | `baaa036`, `d39fc5e` |
| Capri CEY | Fotos de colores | `d31f66a` |
| Short lycra estampado | Colores y diseños pasan de 13 a 8 | `8d8d958` |
| Ciclista lycra combinado | Fotos, colores y diseños pasan de 9 a 11 | `1870685` |
| Campera lycra estampado | Fotos/colores; se retiran los estampados 11–15 y luego 10 | `6686673`, `7ce5bc2`, `b83dd34` |

Los cambios son explícitos en los diffs de commits ya incorporados a develop;
no se infirieron precios desde imágenes ni se inventó stock. Esta revisión acepta
ese estado versionado como catálogo vigente, sin modificar sus decisiones comerciales.
No queda una modificación comercial de origen desconocido que requiera confirmación.

## Baseline actualizado y controles conservados

`tests/catalogSyncBaseline.json` pasa al esquema 2 y registra esa revisión, precios,
grupos, talles y SHA-256 de **cada campo de cada producto**. Se ordenan las claves
de objetos para no confundir formato JSON con cambios de datos; se conserva el orden
de arrays. La identidad y el orden de productos siguen verificándose.
No existe una constante arbitraria de 169 en la prueba.

La prueba rechaza altas/bajas no revisadas, identidad duplicada, cambios de orden,
precios, grupos especiales, excepciones, talles, fotos, visibilidad, campos añadidos
o retirados. Se comprueba además con nueve alteraciones deliberadas sobre copias
en memoria que esos cambios producen fallo. Continúan las pruebas independientes de
identidad pública, archivos referenciados, generación y sincronización de plantillas.
No se regenera el baseline al ejecutar tests.

Esta tarea introduce solo un cambio técnico adicional al catálogo: las referencias
de 148 fuentes PNG con extensión WebP se sustituyen por copias de entrega realmente
WebP en 24 productos. La correspondencia y los hashes están en
`config/product-media-formats.json`; los originales se conservan. El baseline incorpora
esas referencias reparadas, manteniendo intactos nombres, precios, colores y talles.

Para una futura actualización se debe revisar el diff comercial y su procedencia,
actualizar explícitamente los valores/hashes afectados y ejecutar la suite; nunca
copiar ciegamente un resultado nuevo para silenciar un fallo.

## Revisión puntual del 20 de octubre de 2026

El fallo posterior de `catalogSync` se reprodujo antes de modificar esta expectativa.
El baseline coincidía con todos los campos y el orden del catálogo de `67fcf4d7`.
La comparación completa contra el catálogo actual de `14547c3d` encontró solo dos
diferencias, ambas introducidas explícitamente en `330d8d76008cd3541fadca71c01d0eaedff482d8`
(`Update products.json`), para **Remera manga larga morley viscosa**:

- `season`: `media-estacion` → `invierno`.
- `visible`: ausente (público por defecto) → `false`.

Los 169 nombres, su orden, precios, grupos, talles, variantes, imágenes y restantes
campos coinciden. Los productos públicos pasan de 124 a 123 por esa ocultación;
no es una pérdida de fichas causada por SEO. El commit SEO no cambió el catálogo.
No se revierte la decisión versionada ni se modifica información comercial.

Se revisaron y actualizaron **manualmente solo los dos hashes afectados**, y la
procedencia/fecha del baseline. No se ejecutó una regeneración automática del snapshot.
El hash JSON de `"invierno"` es
`de83bb0f633e4697f11ae34ba48af981d5034d45f0d09e598523511316e829e7`;
el de `false` es
`fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa`.
Se mantiene la comparación de cada campo y se agrega una mutación negativa de
temporada a las nueve comprobaciones existentes. No se ignora visibilidad,
temporada, altas/bajas, orden o cambios comerciales para conseguir un resultado verde.
