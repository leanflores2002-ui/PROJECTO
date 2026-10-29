# ROMIX: cómo entender el comportamiento de las visitas en Analytics

## Objetivo

Leer el recorrido de la tienda, no solo una lista de eventos: qué productos generan interés, cuántas personas agregan artículos, llegan al carrito e intentan abrir un pedido por WhatsApp. Los informes deben distinguir cantidades de acciones, unidades de producto, usuarios y sesiones.

La implementación está en develop. No se configuraron informes dentro de la cuenta de Google ni se publicó el código. Los eventos nuevos solo pueden aparecer después de publicar y recibir actividad real de visitantes que acepten la analítica.

## Diccionario de acciones

| Nombre técnico de GA4 | Cómo leerlo en ROMIX | Qué no demuestra |
| --- | --- | --- |
| page_view | Se cargó una página | No significa que hayan leído todo |
| view_item | Vieron la ficha de un producto | No es una compra |
| add_to_cart | Añadieron unidades al carrito | No mide usuarios únicos ni ventas |
| view_cart | Visitaron el carrito; una vez por carga y consentimiento | Puede ser un carrito vacío |
| remove_from_cart | Retiraron unidades, redujeron cantidades o vaciaron el carrito manualmente | No demuestra por sí solo que abandonaron la tienda |
| begin_checkout | Intentaron abrir un pedido válido por WhatsApp | No se inició un cobro ni se confirmó una compra |
| whatsapp_order_click | El navegador permitió abrir el destino del pedido | No confirma mensaje enviado, recibido, pagado o venta |
| whatsapp_open_failed | Falló o se bloqueó la apertura | No es un fallo de pago ni una prueba de error en WhatsApp |

No se envía purchase, generate_lead, información de tarjeta ni ventas ficticias. El valor de los artículos es una referencia del carrito, no ingresos cobrados. Las consultas generales del pie y los trámites de arrepentimiento no se convierten en pedidos mediante el evento whatsapp_order_click.

No renombrar los eventos estándar a español en la recopilación: sus nombres permiten usar las métricas de producto de GA4. Usar nombres en español para informes y pasos del embudo.

## Preparación implementada en el sitio

- Se conservan producto visto, agregado e intención de pedido anteriores; se amplía la medición con carrito visto, artículos retirados, inicio de envío y errores de apertura.
- Los incrementos de cantidad miden solo la diferencia. Pasar de 1 a 3 agrega 2 unidades, no 3. Reducir cantidades mide las unidades retiradas.
- La vista de carrito no se repite por cada actualización de pantalla o cantidad.
- Vaciar automáticamente el carrito tras abrir el pedido no genera un falso evento de eliminación. Vaciarlo manualmente sí mide los artículos retirados.
- No se emiten los eventos de inicio si el carrito está vacío o falla la validación previa de disponibilidad.
- Un bloqueo de ventana registra el intento y el motivo fijo popup_blocked; una excepción de apertura usa open_error. No se envía el texto de errores, teléfono, URL de WhatsApp ni mensaje preparado en estos eventos propios.
- Sin aceptación no se carga Analytics ni se guardan eventos para enviarlos retroactivamente. Al aceptar puede medirse la ficha o carrito actualmente abierto. No hay medición en Preview o local.
- Se mantienen las restricciones publicitarias y no se configura User-ID.

## Paso 1: confirmar la propiedad y el flujo correctos

En Administrar > Flujos de datos > flujo web, comprobar que el ID de medición coincide con G-JJB0XY6PPR. En las capturas anteriores la URL mostraba romixropas.vercel.app, mientras el sitio revisado es romix-ropas.vercel.app. La diferencia de URL no demuestra por sí sola un fallo, pero se debe confirmar el ID antes de atribuir la configuración de esa cuenta a ROMIX o editarla.

Las capturas mostraron retención de eventos de 2 meses, usuarios de 14 meses y reinicio por actividad activado. Son observaciones de la pantalla compartida; falta correlacionar el flujo con el ID. No se cambian esos plazos automáticamente.

## Paso 2: evitar información innecesaria y medición duplicada

Administrar > Flujos de datos > flujo web > engranaje de Medición mejorada:

1. Desactivar Clics de salida automáticos. Google documenta que el parámetro link_url puede incluir la URL completa; los enlaces de WhatsApp de ROMIX contienen textos preparados de pedidos o productos. La nueva medición específica identifica la intención sin registrar esa URL. No se ha confirmado qué URLs capturó históricamente esta cuenta.
2. Conservar Vistas de página al cargar páginas. Revisar sus ajustes avanzados y desactivar, si está habilitada, la medición de cambios de página por eventos del historial: el catálogo usa replaceState para filtros y no corresponde contarlos como nuevas páginas completas. Verificar con DebugView que una navegación real produzca una vista y un filtro no la duplique.
3. Revisar las demás opciones, especialmente búsquedas y formularios, antes de conservarlas: no deben registrar texto libre o datos personales. La captura todavía no mostró las cuatro opciones adicionales.
4. No crear otro evento de WhatsApp a partir del click automático: duplicaría o mezclaría el significado del evento propio.

Estos son ajustes pendientes del panel, no cambios realizados por el código del sitio. La protección de los eventos propios no desactiva la medición automática que esté activada en la cuenta.

## Paso 3: tres informes útiles

### De dónde llegan y qué canales generan interés

En Informes, buscar Adquisición de tráfico y usar la fuente/medio de la sesión. Revisar sesiones, interacción y el evento clave whatsapp_order_click. Comparar Google, Instagram, Facebook y enlaces de campañas. Sin etiquetas UTM, visitas desde algunas aplicaciones pueden aparecer como directas; eso no demuestra que escribieron la dirección manualmente.

Etiquetar los enlaces de campañas con valores genéricos: por ejemplo utm_source=instagram, utm_medium=social y utm_campaign=coleccion_verano. No poner nombres de clientes, teléfonos o correos en campañas. No usar UTM en enlaces internos del catálogo.

### Qué productos interesan

En el informe Compras en comercio electrónico, revisar Nombre del artículo, Artículos vistos, Artículos añadidos al carrito y Artículos con compra iniciada. Si el informe no aparece, un editor puede incorporarlo desde la biblioteca de informes. No usar Artículos comprados o Ingresos como indicadores de ventas de ROMIX: el cierre y pago ocurren fuera de la web y no se comprueban aquí.

Para comparar personas, utilizar usuarios del evento correspondiente en una exploración; para volumen, utilizar las unidades de artículos. Los eventos add_to_cart también incluyen incrementos manuales de cantidad.

### Dónde se interrumpe el recorrido

En Explorar > Exploración de embudos de conversión, crear un embudo con estos pasos, en orden indirecto:

1. Vieron un producto: event_name = view_item.
2. Agregaron al carrito: event_name = add_to_cart.
3. Visitaron el carrito: event_name = view_cart.
4. Abrieron el pedido en WhatsApp: event_name = whatsapp_order_click.

Titularlo Recorrido de pedido ROMIX y desglosar por Categoría de dispositivo para comparar móvil/escritorio. El embudo cerrado sirve para quienes hicieron la secuencia desde la ficha; quienes entran directamente al carrito pueden quedar fuera. Para estudiar esas otras entradas se puede crear otra exploración abierta. No sumar los usuarios de cada paso como si fueran personas distintas ni interpretar toda salida del embudo como una venta perdida confirmada.

El valor begin_checkout puede usarse en un informe separado de intentos, comparándolo con whatsapp_open_failed para detectar problemas de apertura. El porcentaje de paso del embudo debe obtenerse dentro de la misma exploración/cohorte; dividir eventos totales de informes distintos no representa una tasa fiable.

## Paso 4: evento clave y lectura semanal

En Administrar > Eventos, marcar whatsapp_order_click como evento clave, si se confirma que esta es la propiedad correcta. Si el objetivo es contar sesiones con intención, elegir una vez por sesión cuando esa opción esté disponible. No marcar cada page_view o scroll como objetivo de pedidos. Si se necesitan solicitudes únicas reales, hace falta una verificación adicional fuera de la web: el sitio no sabe si el usuario envió el mensaje.

Revisar semanalmente: sesiones por canal, fichas más vistas, unidades agregadas, usuarios que llegan al carrito, sesiones con apertura de pedido y errores de apertura. Comparar el mismo período y dispositivo. Con poco tráfico, unos pocos usuarios pueden cambiar mucho las proporciones: no decidir solo por un día de datos.

## Alcance y validación

El código no crea ni publica un panel dentro de Google Analytics. Tampoco modifica retención, vínculos publicitarios, uso compartido ni filtros privados. El seguimiento excluye visitantes que rechazan, bloqueadores y navegaciones donde la etiqueta no pueda ejecutarse; no es un censo de todos los visitantes.

Se añaden pruebas de deltas de cantidad, eliminación, exclusión de limpieza automática por pedido, vista única del carrito, consentimiento y motivos de error limitados. El recorrido en navegador usa la URL de producción en un entorno interceptado: Google se sustituye por un script vacío y WhatsApp por un destino local de prueba. No se envían visitas, mensajes ni pedidos reales.

Tras un despliegue autorizado, confirmar con Tiempo real o DebugView que los eventos llegan a la propiedad correcta. No activar debug_mode globalmente en producción. Los informes agregados pueden necesitar procesamiento; no prometer disponibilidad inmediata ni que estos cambios recuperen acciones anteriores que nunca se midieron.

## Referencias oficiales

- Eventos de comercio electrónico: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag&hl=es
- Parámetros y link_url: https://support.google.com/analytics/table/13594742?hl=es
- Medición mejorada: https://support.google.com/analytics/answer/9216061?hl=es
- Informe de productos: https://support.google.com/analytics/answer/12924131?hl=es
- Exploración de embudos: https://support.google.com/analytics/answer/9327974?hl=es
- Retención: https://support.google.com/analytics/answer/7667196?hl=es

## Resultado de la revisión local

- 30/30 grupos de la suite principal aprobados.
- test:analytics aprobado: pruebas unitarias y recorrido instrumentado en Chromium 390/1440 px.
- test:consent aprobado: aceptar, rechazar, persistir y retirar consentimiento, sin envío real a Google.
- Generación de páginas, comprobación de tipos y revisión de formato aprobadas.
- Privacidad describe las nuevas acciones y errores de apertura. No se verificó un despliegue real ni el panel privado. No se enviaron pedidos ni eventos reales.

Commit sugerido: feat(analytics): medir el recorrido de carrito y pedidos por WhatsApp
