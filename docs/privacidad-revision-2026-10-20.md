# Privacidad ROMIX — 20 de octubre de 2026

Rama develop; base 241e697b7361e6fd3ef9d036347fa232007bfff6, inicialmente limpia.
Se revisaron instrucciones, fuentes y generadores. Sin AGENTS.md aplicables.
No se modificó main ni se hizo commit, push, merge o despliegue.

## Implementación y confirmaciones

La política está integrada desde la plantilla original, con header/footer compartidos,
enlaces visibles en pie y banner, canonical definitivo, sitemap y protección noindex
de Preview. Se regeneraron shells, categorías y 123 fichas. Solo está implementada
localmente; no se publicó. Los borradores aislados se sustituyeron por las fuentes
definitivas al recibir el último dato esencial.

El usuario confirmó a FLORES OROSCO ALBERTINA como responsable, Concordia 514
local B, CABA, como domicilio publicable y WhatsApp +54 9 11 5427-2065 como canal
de privacidad. La dueña gestiona pedidos y conversaciones, sin planillas ni CRM.
Conserva conversaciones, datos del pedido e imágenes de comprobantes/recibos en
WhatsApp, en su celular, con backup en Google Drive de su cuenta. Los recibos
también se guardan en papel. No hay plazo establecido ni rutina de eliminación;
la dueña administra los registros y gestionaría su eliminación. Se informa esta
situación sin inventar fechas. Para despachar se comparten únicamente los datos
necesarios con el transporte elegido por el cliente; no tienen transporte propio.

## Tratamiento comprobado en código

- GA4 G-JJB0XY6PPR: solo carga en hostname de producción con consentimiento accepted. Eventos propios: view_item, add_to_cart, whatsapp_order_click; productos, identificadores, categorías, marca, precio, cantidad y ARS. Un clic no acredita compra/pago.
- Navegación analítica con página/referrer depurados de parámetros generales, id y UTM limitados. No se afirma anonimato ni que un parámetro libre nunca contenga datos personales.
- Sin User-ID configurado; Signals y personalización desactivados, estados publicitarios denegados. Esto no confirma opciones del panel.
- romix.analytics-consent.v1 en localStorage, accepted/rejected, sin vencimiento programado. Si falla el almacenamiento, no inicia GA. Retirar detiene mediciones y limpia cookies accesibles; no elimina automáticamente datos previamente recibidos por terceros.
- romix_cart (antes cart) guarda productos, variantes, cantidades y precios, sin vencimiento programado. Carrito independiente del consentimiento. Caché de catálogo de sesión con validez operativa de 30 minutos, distinta de retención de pedidos.
- WhatsApp abre URL con productos, colores, talles y cantidades; esa URL llega al servicio. El usuario revisa/envía el mensaje. El flujo vacía el carrito al abrir, sin confirmar recepción, envío o pago.
- Búsqueda GET del catálogo y búsqueda local de ayuda. Sin registro, newsletter ni checkout integrado activo observado. FastAPI existe en repo, pero API de pedidos/health responde 404 en producción (solo GET; ningún pedido real).
- Vercel aloja; Google Fonts, Maps en ayuda y preconexión cdnjs/Cloudflare generan conexiones independientes de GA. Preconexión no prueba descarga de biblioteca. Videos propios; enlaces sociales sin píxel observado.

## Publicado frente a local

Durante esta revisión, inicio/ayuda/carrito públicos respondían 200 sin banner;
Analytics público cargaba sin comprobar consentimiento; cookie-consent.js y
privacidad.html respondían 404. Por eso no se afirma que el consentimiento de
develop o esta política estén publicados. No se ejecutó la etiqueta real de Google,
no se cambió configuración externa ni se creó un Preview.

## Pendientes privados y límites

- Analytics: Administrar → Conservación de datos (y reinicio con actividad), flujo web → Medición mejorada, vínculos de productos e intercambio de datos. Valores desconocidos, no inferidos de defaults. No se piden credenciales.
- Definir criterio real de conservación/eliminación de conversaciones, papel y backups. Revisar ajustes privados de WhatsApp, Drive y Vercel.
- Comprobar retención, ubicaciones efectivas y mecanismos internacionales de las cuentas. Las políticas de proveedores describen operaciones internacionales, sin probar el contrato concreto de ROMIX ni residencia exclusiva en Argentina.

Estas incertidumbres aparecen como tales en el texto, sin marcadores o plazos
inventados. Se distinguen retirada del consentimiento y derechos sobre datos ya
tratados. ROMIX no promete eliminar información administrada solo por terceros.
No se afirma cumplimiento jurídico certificado.

## Archivos

- Nuevos: frontend/src/templates/privacidad.html, frontend/public/privacidad.html y assets/css/romix-privacy.css.
- Footer fuente y cookie-consent.css: enlaces/foco, conservando controles y lógica.
- sync-storefront-shells.js y generate-seo.js: generación, sitemap y Preview.
- .sonarcloud.properties y sonar-project.properties: solo exclusión de duplicación para la nueva salida, manteniendo análisis de bugs/seguridad.
- privacyTests.js, privacyBrowserTests.js, seoTests.js, scripts/test-suite.js y package.json: pruebas integradas.
- Salidas regeneradas: inicio, catálogo, ayuda, carrito, producto legacy, 404, tres categorías y sitemap. Las 123 fichas son artefactos ignorados que se regeneran desde el footer compartido. Sin cambios de catálogo, precios o variantes.
- Este informe.

## Validación

Build completo con 123 fichas y 130 URL en sitemap. Pruebas de política: identidad,
sin marcadores, canonical de producción, enlace en shells/categorías/ficha y
controles preservados. SEO comprueba también noindex de Preview.

Navegador a 320, 390 y 1440 px: enlaces generados reales, teclado, foco, sin
desbordamiento, rechazo persistente, carrito conservado al navegar a privacidad,
ninguna aceptación implícita, sin errores JS y Axe A/AA en contenido. Google y todos
los destinos externos, incluido WhatsApp, interceptados: sin mediciones/mensajes.
El banner conserva exactamente su altura: 171,33 / 152,48 / 74 px respectivamente;
Aceptar y Rechazar mantienen igual ancho y altura mínima de 44 px.

Pasó test:consent, incluido almacenamiento bloqueado, retirada y limpieza de cookies
accesibles. No se valida la librería remota real de GA ni su panel; no hay certificación
integral de accesibilidad. Suite general `npm test`: **29/29 grupos aprobados**,
sin fallos. `git diff --check` sin errores. No se ejecutó la suite de backend ni
el resto de pruebas de navegador de comercio: no se modificaron API ni controladores
de compra. Se revisó también la captura móvil del contenido generado.

## Fuentes oficiales

- [Ley 25.326 actualizada](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion).
- [AAIP: derechos](https://www.argentina.gob.ar/aaip/datospersonales/derechos): acceso en diez días corridos; rectificación/supresión en cinco días hábiles; acceso gratuito cada seis meses salvo interés legítimo anterior.
- [AAIP: transferencias internacionales](https://www.argentina.gob.ar/transferencias-internacionales).
- [Condiciones de Analytics, sección 7](https://marketingplatform.google.com/about/analytics/terms/es/).
- [Retención GA](https://support.google.com/analytics/answer/7667196?hl=es), [cookies](https://support.google.com/analytics/answer/11397207?hl=en), [consentimiento](https://support.google.com/analytics/answer/12334711?hl=en).
- [Google en sitios asociados](https://policies.google.com/technologies/partner-sites?hl=es) y [privacidad Google](https://policies.google.com/privacy?hl=es).
- [WhatsApp](https://www.whatsapp.com/legal/privacy-policy?lang=es) y [Vercel](https://vercel.com/legal/privacy-notice).

Commit sugerido, sin crearlo: `feat: agregar política de privacidad y enlaces de consentimiento`.
