# Términos y condiciones de ROMIX — 21 de octubre de 2026

## Alcance

Página nueva: /terminos.html, desde frontend/src/templates/terminos.html. Presentación institucional compartida con Privacidad: sin índice, encabezados moderados y espacios compactos. Se conserva el funcionamiento de catálogo, precios, carrito, WhatsApp y consentimiento. No se agregó un checkbox obligatorio ni un pago integrado.

La identidad, el CUIT, el domicilio y el WhatsApp provienen de la información confirmada por el usuario. El CUIT se comprobó estructuralmente mediante su dígito verificador, no mediante una consulta fiscal externa. No se certificó la situación registral del negocio.

## Condiciones confirmadas

- Venta por mayor y menor, sin compra mínima.
- Precios finales actuales en pesos argentinos y disponibilidad verificada por WhatsApp.
- Confirmación por WhatsApp cuando hay disponibilidad de lo solicitado.
- Pago solicitado tras preparar el pedido y enviar su detalle/recibo. Efectivo, transferencia o Mercado Pago; no se presenta el detalle del pedido como una factura fiscal ni se alteran obligaciones de documentación.
- Retiro en el local o despacho al punto/empresa elegidos por el cliente; no hay transporte propio. Costos, responsable de abonarlos y plazos se coordinan por pedido: no se inventaron tarifas ni plazos generales.
- Cambios comerciales tomados de Ayuda: 15 días posteriores a la compra, sin uso, etiquetas originales, otro talle o color del mismo artículo, diferencia si corresponde talle especial y sin costo en el local.
- Cancelaciones, defectos, faltantes o errores de entrega se gestionan por contacto, preservando los derechos aplicables.

## Arrepentimiento: procedimiento manual confirmado

El usuario confirmó expresamente que la responsable puede recibir solicitudes por WhatsApp y responder con una constancia y código dentro de las 24 horas. Hay un enlace denominado Botón de arrepentimiento visible desde el primer acceso, en la franja superior compartida, y otro en el pie. Ambos abren el WhatsApp habitual con un mensaje preparado, sin datos de terceros ni un pedido cargado automáticamente.

La apertura del enlace no registra ni envía la solicitud. El cliente debe enviar el mensaje; esta limitación se explica en los términos. No hay generación automática de código, backend de reclamos ni garantía de entrega propia del sitio. El procedimiento requiere atención efectiva y puntual de la responsable.

Procedimiento operativo sugerido para la responsable: identificar la solicitud recibida, conservar su fecha y hora, responder por el mismo canal antes de las 24 horas con un identificador único (por ejemplo, ROMIX-AAAA-MM-DD-001), y coordinar la devolución y resolución que correspondan. Es un ejemplo de formato, no un código ya asignado. El registro permanece en el canal informado en la política de privacidad.

El texto distingue la política comercial de cambios de los derechos por defectos y de la revocación en compras a distancia. También distingue la compra como destinatario final de la compra para reventa, sin excluir automáticamente por cantidad.

## Integración y pruebas

Términos se incorpora al generador de páginas, sitemap y generación noindex de Preview. Las exclusiones de duplicación de las dos configuraciones Sonar se mantienen coherentes con la lista de HTML generado; no se añadieron exclusiones de bugs o seguridad. Los recursos de encabezado y bundle cambian de versión para invalidar caché.

Comandos relevantes: npm run build; npm run test:terms; npm test; npm run check:ts. Pruebas de navegador con Chromium mediante Playwright porque el plugin Browser no está disponible. Las conexiones externas se interceptan; el popup de WhatsApp fue verificado sin mensajes reales. Comprobaciones de fuentes, enlaces, sitemap/canonical, separación de derechos, acceso táctil inicial, teclado, accesibilidad axe y desbordamientos en 320/390/1440 px.

No se probó un Preview real ni producción, no se envió un reclamo real y no se certifica cumplimiento jurídico integral. Conviene revisar la redacción jurídica y asegurar que la operatoria de entrega y atención respete las condiciones publicadas antes de desplegar.

## Fuentes oficiales consultadas

- Ley 24.240 actualizada: https://www.argentina.gob.ar/normativa/nacional/638/actualizacion
- Disposición 954/2025: https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto
- Complemento Disposición 3/2026: https://www.boletinoficial.gov.ar/detalleAviso/primera/338248/20260206

## Archivos principales

- frontend/src/templates/terminos.html y frontend/public/terminos.html.
- frontend/src/templates/partials/header.html y footer.html; HTML públicos y fichas regenerados.
- frontend/public/assets/css/romix-header.css y bundle generado; versiones de encabezado en plantillas.
- scripts/sync-storefront-shells.js, scripts/generate-seo.js y scripts/test-suite.js.
- tests/termsTests.js, tests/termsBrowserTests.js, tests/seoTests.js y package.json.
- .sonarcloud.properties y sonar-project.properties.

Todo el trabajo se realiza en develop. Sin commit, push, merge ni despliegue.

## Resultado final de esta ejecución

- Generación aprobada: 8 páginas generales, 3 categorías, 123 fichas públicas y 131 URLs del sitemap.
- Suite completa: 30/30 grupos aprobados. La expectativa anterior del texto de la franja superior se actualizó para verificar la composición autorizada con el acceso de arrepentimiento; conserva comprobación del texto comercial y añade comprobaciones del canal de destino.
- Navegador de términos: 320, 390 y 1440 px aprobados, incluido el popup de WhatsApp interceptado, acceso inicial visible, foco/teclado, enlace de Ayuda, consentimiento y axe.
- Comercio: 1440 y 390 px aprobados con popup interceptado.
- Tipos y revisión de formato aprobados.
- Los plazos de atención manual, la situación fiscal y la solución de reclamos no se verifican mediante pruebas de software. No se realizó un despliegue ni una validación jurídica integral.

Commit sugerido: feat: añadir términos y condiciones y canal de arrepentimiento

## Ajuste posterior solicitado: ubicación del acceso

Se retiró el enlace de arrepentimiento de la franja superior y se restauró su texto original «ENVÍOS Y RETIROS COORDINADOS · CONSULTÁ DISPONIBILIDAD», junto con su altura y estilos anteriores. El canal no se eliminó: continúa en el pie de todas las páginas y dentro de Términos. Esta nota sustituye las referencias anteriores a su presencia en el primer acceso. Las pruebas comprueban ahora su ausencia en el encabezado y el funcionamiento desde el pie. La adecuación jurídica de la nueva ubicación no está certificada por las pruebas técnicas.
