# VERCEL STORAGE AUDIT

Fecha: 2026-09-10. Repositorio efectivo: `leanflores2002-ui/Romix-`, confirmado por el usuario. Rama: `chore/vercel-storage-optimization`, creada desde `origin/main` (`989ecf5`).

## Estado y alcance

**Auditor?a local completada; auditor?a autenticada de Vercel pendiente. READY FOR MAIN: NO.**

No hay herramienta Vercel conectada, CLI autenticada, `VERCEL_TOKEN`, v?nculo `.vercel/project.json` ni navegador disponible en esta sesi?n. Se solicit? conectar Vercel/iniciar sesi?n sin compartir secretos en el chat. No se pueden verificar ajustes reales ni inventar IDs, cantidades o tama?os de deployments.

El pedido exige verificar la configuraci?n real antes de modificar c?digo. Por eso esta rama s?lo incorpora documentaci?n: no modifica `.vercelignore`, rewrites, Vite, datos, infraestructura ni pol?ticas de despliegue. Los builds experimentales quedan fuera del repositorio.

## 1. Configuraci?n real pendiente de acceso

| Campo | ROMIX Admin | romix-public |
| --- | --- | --- |
| Root Directory real | No verificado; esperado `frontend/admin` | No verificado; esperado `frontend/public` |
| Framework Preset real | No verificado; c?digo usa Vite | No verificado; sitio est?tico, Other esperado |
| Build Command real | No verificado; esperado `npm run build` | No verificado; sin build necesario para HTML est?tico |
| Output Directory real | No verificado; esperado `dist` | No verificado; ra?z del proyecto esperada |
| Install Command real | No verificado; `npm ci` probado | No verificado |
| Production Branch real | No verificado; `main` esperado | No verificado; `main` esperado |
| Ignored Build Step real | No verificado | No verificado |
| Variables VITE reales | Presencia, ?mbito y valores no verificados | No se utiliza Vite en el c?digo p?blico |
| ?ltimo deployment: ID y tama?o | No disponible | No disponible |
| Deployments Production / Preview | No disponible / no disponible | No disponible / no disponible |
| Source/upload real remoto | No disponible | No disponible |

Variables Admin que deben revisarse por nombre y entorno, sin revelar valores: `VITE_API_URL`, `VITE_PUBLIC_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` o `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PATH`. Nunca colocar service_role en variables VITE.

El build local Admin no contiene cat?logo, directorios de productos/thumbs, v?deos ni node_modules. Esto confirma el artefacto local; **no certifica el source/upload ni el deployment remoto**, que dependen del Root Directory efectivo y del m?todo de despliegue.

## 2. Mediciones antes y despu?s

Medici?n equivalente a `du` mediante suma de tama?os de archivos; bytes l?gicos, sin redondeo por bloques de disco, compresi?n de transporte ni deduplicaci?n de Vercel. Estimaci?n de p?blico aplica los patrones actuales de `.vercelignore`; no representa almacenamiento facturado observado.

| Contenido | Antes | Despu?s actual de esta rama |
| --- | --- | --- |
| Admin dist con sourcemaps | 3,300,492 bytes (3.15 MiB) | Sin cambios: 3,300,492 bytes (3.15 MiB) |
| frontend/public completo | 1,304,301,797 bytes (1243.88 MiB) | Sin cambios: 1,304,301,797 bytes (1243.88 MiB) |
| images/products | 1,121,821,906 bytes (1069.85 MiB) | Sin cambios: 1,121,821,906 bytes (1069.85 MiB) |
| images/thumbs | 123,177,959 bytes (117.47 MiB) | Sin cambios: 123,177,959 bytes (117.47 MiB) |
| videos | 17,577,709 bytes (16.76 MiB) | Sin cambios: 17,577,709 bytes (16.76 MiB) |
| P?blico estimado tras exclusiones existentes | 59,301,932 bytes (56.55 MiB) | Sin cambios: 59,301,932 bytes (56.55 MiB) |

Source Admin versionado: 434.079 bytes, 48 archivos; estimaci?n local, excluye node_modules y dist. No equivale al upload remoto medido.

Las exclusiones **ya existentes en main** evitan potencialmente 1,244,999,865 bytes (1187.32 MiB) por deployment p?blico frente a incluir todo (95.45%). No atribuir ese ahorro a cambios nuevos de esta rama. Ahorro nuevo aplicado: 0 bytes.

## 3. Los 30 archivos m?s pesados de dist

S?lo existen 21 archivos: se listan todos, sin completar con archivos inexistentes.

| Archivo | Bytes |
| --- | ---: |
| `assets/index-DI6_Ew7T.js.map` | 1967904 |
| `assets/Feedback-COv1bVDv.js.map` | 438981 |
| `assets/index-DI6_Ew7T.js` | 399081 |
| `assets/ProductEditor-DPXXuXAl.js.map` | 114889 |
| `assets/Feedback-COv1bVDv.js` | 110613 |
| `assets/index-CLAblHKn.css` | 52789 |
| `assets/ProductEditor-DPXXuXAl.js` | 38040 |
| `assets/AppShell-Dl1BqfAR.js.map` | 36958 |
| `assets/jsx-runtime-CJ9UQy0H.js.map` | 30296 |
| `assets/ResourcePage-CotP5Q9D.js.map` | 19817 |
| `assets/ProductsPage-29QhJpS6.js.map` | 17515 |
| `assets/Inventory-ubd5qusr.js.map` | 13424 |
| `assets/AppShell-Dl1BqfAR.js` | 13115 |
| `assets/Statistics-DWwGljQU.js.map` | 10174 |
| `assets/jsx-runtime-CJ9UQy0H.js` | 8985 |
| `assets/ResourcePage-CotP5Q9D.js` | 8815 |
| `assets/ProductsPage-29QhJpS6.js` | 7287 |
| `assets/Inventory-ubd5qusr.js` | 6045 |
| `assets/Statistics-DWwGljQU.js` | 4871 |
| `index.html` | 865 |
| `robots.txt` | 28 |

## 4. Inventario de upload p?blico

| Archivo/carpeta | Peso local | Incluido estimado | Motivo |
| --- | ---: | --- | --- |
| `.vercelignore` | 322 bytes (0.00 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `404.html` | 16,628 bytes (0.02 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `assets` | 818,215 bytes (0.78 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `ayuda.html` | 69,245 bytes (0.07 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `cart.html` | 55,709 bytes (0.05 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `catalogo.html` | 22,513 bytes (0.02 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `detalle.html` | 35,464 bytes (0.03 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `hombre.html` | 21,685 bytes (0.02 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/.gitkeep` | 2 bytes (0.00 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/ESTILO_URBANO_INVERNAL.png` | 2,163,593 bytes (2.06 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/ROPA_DEPORTIVA.png` | 2,019,769 bytes (1.93 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/banners` | 6,896,704 bytes (6.58 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/buzos.png` | 1,690,739 bytes (1.61 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/calzas.png` | 1,130,919 bytes (1.08 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/camperas.png` | 1,368,708 bytes (1.31 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/ciclista_jaspeado_saplex_terracota.png` | 154,279 bytes (0.15 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/guia-medidas-pantalon.png` | 1,471,444 bytes (1.40 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/guia-medidas-superior.png` | 1,577,558 bytes (1.50 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/hombre.png` | 1,904,371 bytes (1.82 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/logo-romix-icon-180.png` | 37,185 bytes (0.04 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/logo-romix-icon-64.png` | 7,117 bytes (0.01 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/logo-romix-social-1200x630.png` | 854,678 bytes (0.82 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/logo-romix-social-20260502.jpg` | 42,945 bytes (0.04 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/logo-romix.png` | 589,144 bytes (0.56 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/mujer.png` | 1,708,243 bytes (1.63 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/nina.png` | 2,141,297 bytes (2.04 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/nino.png` | 1,825,763 bytes (1.74 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/optimized` | 672,100 bytes (0.64 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/pantalon_morley_liviano_gris melange.png` | 798,914 bytes (0.76 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/pantalones.png` | 1,164,397 bytes (1.11 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/posters` | 1,126,683 bytes (1.07 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/products` | 1,121,821,906 bytes (1069.85 MiB) | NO | Excluido por .vercelignore; rewrite a Render |
| `images/remera_dry_fit_deportivo_hombre_gris.png` | 2,239,678 bytes (2.14 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/remera_dry_fit_deportivo_hombre_negro.png` | 1,884,372 bytes (1.80 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/remeras.png` | 1,393,036 bytes (1.33 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/thumbs` | 123,177,959 bytes (117.47 MiB) | NO | Excluido por .vercelignore; rewrite a Render |
| `images/tops.png` | 1,525,215 bytes (1.45 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `images/ver-todo.png` | 1,978,127 bytes (1.89 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `index.html` | 99,946 bytes (0.10 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `mujer.html` | 21,691 bytes (0.02 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `ninos.html` | 21,693 bytes (0.02 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `novedades.html` | 21,718 bytes (0.02 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `product.html` | 151,629 bytes (0.14 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `robots.txt` | 23 bytes (0.00 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `vercel.json` | 762 bytes (0.00 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |
| `videos` | 17,577,709 bytes (16.76 MiB) | YES | Conservado: recurso p?blico o configuraci?n; sin nueva exclusi?n |

Las carpetas products/thumbs est?n excluidas expl?citamente por `images/products/**` y `images/thumbs/**`. `.DS_Store` y `*.log` tambi?n est?n excluidos. No se encontraron documentos, snapshots ni scripts de migraci?n dentro de la ra?z p?blica que justifiquen nuevas reglas generales. Los JS de assets son c?digo del sitio y deben conservarse.

Los cuatro MP4 suman 17.577.708 bytes, m?s `.gitkeep` (1 byte). La b?squeda est?tica no encontr? referencias a `videos/` ni `video1.mp4`?`video4.mp4` en HTML/JS/CSS/JSON o backend. **No se excluyen todav?a**: falta descartar referencias configuradas din?micamente y verificar uso real antes de cambiar configuraci?n. La ausencia de referencias est?ticas no prueba que URLs p?blicas carezcan de consumidores.

No se excluyen banners, im?genes de categor?as, logos ni fotos sueltas fuera de products/thumbs por su peso: pueden ser recursos del home y no tienen los rewrites existentes.

La documentaci?n oficial indica que `.vercelignore` pertenece a la ra?z del proyecto y que el archivo de esa ra?z tiene prioridad en monorepos. La aplicaci?n real requiere comprobar Root Directory e inspeccionar el artefacto desplegado: [Vercel .vercelignore](https://vercel.com/docs/deployments/vercel-ignore).

## 5. Rewrites y Render

Se mantienen exactamente los destinos de `frontend/public/vercel.json`. Se verificaron mediante GET, sin mutaciones:

| Caso | URL | HTTP | Tipo |
| --- | --- | --- | --- |
| api | https://projecto-drth.onrender.com/api/products | 200 | application/json |
| principal | https://projecto-drth.onrender.com/images/products/babucha_frizado_algodon_premium_hombre_negro.png | 200 | image/png |
| thumbnail | https://projecto-drth.onrender.com/images/thumbs/babucha_frizado_algodon_premium_hombre_negro-thumb.webp | 200 | image/webp |
| color | https://projecto-drth.onrender.com/images/products/babucha_frizado_algodon_premium_hombre_gris_melange.png | 200 | image/png |

`/api/:path*`, `/images/products/:path*` y `/images/thumbs/:path*` se resolvieron en una simulaci?n local que lee las reglas del JSON y obtiene las respuestas reales de Render. No sirve las carpetas excluidas desde disco. Se prob? principal, thumbnail e imageMap por color. El cat?logo p?blico de Render devolvi? 98 productos en esta lectura.

No se cre? un deployment. La ausencia de la biblioteca completa en **un deployment nuevo real** queda pendiente de inspecci?n autenticada. No confundir una URL que responde por rewrite con la presencia de ese archivo en el almacenamiento de Vercel.

## 6. Evitar builds innecesarios: propuesta, NO activada

Cada proyecto conectado al mismo repositorio puede recibir eventos de cada commit. La configuraci?n real actual no es visible, por lo que no se afirma que todos est?n reconstruy?ndose.

Preparar un Ignored Build Step por proyecto, ejecutado desde su Root Directory. Vercel interpreta salida 0 como omitir build y 1 como construir: [documentaci?n oficial](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel).

Algoritmo recomendado antes de implementarlo:

1. Comparar `VERCEL_GIT_PREVIOUS_SHA` (?ltimo deployment pertinente) contra `VERCEL_GIT_COMMIT_SHA`, no s?lo `HEAD^`: puede haber varios commits entre deployments.
2. Si falta SHA, historial, Git o no puede demostrarse la comparaci?n, construir (exit 1). Un redeploy manual/configuraci?n debe poder forzarse a construir.
3. Cambios dentro de `frontend/admin/`: construir Admin. Cambios dentro de `frontend/public/`: construir Public.
4. Cambios compartidos de ra?z (lockfiles, tooling, .npmrc, configuraci?n Vercel, workspaces, script de ignore): construir ambos.
5. S?lo backend/supabase/docs: omitir Vercel, despu?s de confirmar que no hay generaci?n/importaci?n compartida durante los builds.
6. Cambios desconocidos o dependencias externas a la ra?z: construir. Probar renames, eliminaciones, cambios combinados, primer deploy, merges y commits m?ltiples.

Antes de activar, auditar Build/Install Command reales e Include source files outside Root Directory, y verificar dependencias. No se activa una regla especulativa que pueda impedir un deployment necesario.

## 7. Sourcemaps: experimento sin editar configuraci?n

Con sourcemaps: **3,300,492 bytes (3.15 MiB)**. S?lo mapas: **2,649,958 bytes (2.53 MiB)**. Build real experimental sin mapas: **650.104 bytes (0,62 MiB)**. Reducci?n potencial: **2.650.388 bytes (80,30%)**.

Se ejecut? Vite con override `build.sourcemap=false`, salida en una carpeta temporal y `emptyOutDir=false`; el `dist` normal y `vite.config.js` conservan la configuraci?n original. No se detectaron dependencias/integraci?n Sentry, Bugsnag o Rollbar en el Admin. Falta confirmar integraciones remotas antes de desactivar mapas. Propuesta concreta, a?n no aplicada: cambiar `build.sourcemap: true` a `false` para producci?n, conservando un build diagn?stico optativo fuera de los deployments p?blicos.

## 8. Verificaci?n

- `npm ci`: PASS, 0 vulnerabilidades; warnings de deprecaci?n eslint/whatwg-encoding.
- `npm run lint`: PASS; `npm test`: PASS (16 tests, 5 archivos); `npm run build`: PASS.
- `python -m compileall backend/app`: PASS.
- Playwright Chromium: PASS en 1440?900 y 390?844.
- Home ? cat?logo ? detalle ? color Gris melange ? talle disponible ? agregar al carrito ? carrito: PASS.
- 80 respuestas de im?genes en ambos recorridos; 0 respuestas 404, 0 respuestas 500, 0 errores de consola/pageerror.
- Solicitudes de escritura interceptadas localmente; no se confirm? ning?n pedido ni se enviaron eventos anal?ticos de producto a producci?n. Carrito s?lo en almacenamiento del navegador temporal.
- Limitaci?n: prueba del c?digo local con lecturas reales de Render, no prueba de un deployment Vercel. No se prob? Auth Admin real porque esta fase no modifica Admin ni hay acceso autenticado.

## 9. Riesgos y pr?ximos pasos

Completar la tabla de configuraci?n desde Vercel, inspeccionar los archivos del ?ltimo deployment de ambos proyectos y listar el historial antes de implementar cambios. Confirmar que el p?blico realmente usa la ra?z esperada y que Admin publica exclusivamente dist. La disponibilidad de las fotos depende del fallback Render; no se cambi? esa arquitectura.

El ahorro hist?rico no se recuper?. Cambiar futuros builds o ignores no elimina deployments existentes. La estimaci?n recuperable no puede calcularse multiplicando ciegamente los bytes locales por el n?mero de deployments: se necesita el inventario/medici?n de Vercel.

Ver [plan de revisi?n del historial](VERCEL_DEPLOYMENTS_CLEANUP.md). No hubo push, merge a main, despliegue, eliminaci?n de deployments, productos o im?genes, cambios de stock/precios ni assets nuevos en frontend/public.
