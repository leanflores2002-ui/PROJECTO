# Google Analytics 4 — ROMIX

ID: G-JJB0XY6PPR. La integración solo se activa en romix-ropas.vercel.app; no envía datos desde localhost o dominios Preview. Se carga de manera diferida y el script de Google es asíncrono.

Eventos: page_view (configuración automática una vez por documento), view_item, add_to_cart (cantidad recién agregada, no cantidad acumulada), whatsapp_order_click (apertura del pedido; no implica mensaje enviado ni compra). Moneda ARS. No se emite purchase.

Los parámetros personalizados contienen solo datos de productos, cantidades e importes. Se eliminan parámetros arbitrarios de la URL y del referrer; se permite el ID de producto y los campos de campaña utm_source, utm_medium y utm_campaign. No usar datos personales en campañas. No se incluyen teléfono del cliente ni mensaje del pedido. Google Signals y personalización publicitaria desactivados en el tag.

## Configuración de la cuenta antes de publicar

En Administrar → Flujos de datos → Web → Medición mejorada, revisar sus opciones: desactivar clics salientes, búsqueda del sitio, interacciones con formularios y cambios de historial si están habilitados. Estos eventos automáticos pertenecen a la configuración externa y podrían registrar URLs o términos no incluidos en los eventos controlados por ROMIX. Mantener vistas de página por carga. Revisar la información de privacidad y la gestión de consentimiento que corresponda a la operación de la tienda; esta integración no agrega un gestor de consentimiento.

Después de publicar, abrir la tienda y comprobar Informes → Tiempo real. Marcar whatsapp_order_click como evento clave si se desea medir consultas; nunca interpretarlo como venta confirmada. Los datos no se recuperan retroactivamente.

Validación local: analyticsTests, storefrontTemplateTests, cartOrderTests, productGalleryTests y build. Navegador con origen de producción simulado y etiqueta de Google interceptada: view_item, add_to_cart y whatsapp_order_click; sin errores de ejecución. No se enviaron pruebas al servicio real ni se verificó recepción en la propiedad de GA4. No se hizo commit, push o despliegue.
