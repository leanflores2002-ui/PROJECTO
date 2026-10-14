# Variantes por color y mejoras de las secciones

## Cómo editar una prenda

El editor tiene Datos del producto y Colores, talles y stock. En la segunda sección, elegir un color muestra sus talles en una tabla. Cada combinación conserva el mismo identificador de base de datos, sus existencias y su historial. La agrupación sólo cambia la presentación.

Agregar color y talles permite escribir varios talles separados por coma. Si el color ya existe, agrega únicamente los talles que faltan. Agregar talle crea una fila nueva dentro del color. El stock inicial de los talles nuevos se guarda junto con el producto; para los existentes, Ajustar stock abre la operación con motivo y control de concurrencia.

Nombre y muestra de color se aplican al grupo. No se permite renombrar un grupo con el nombre de otro color existente, ni guardar combinaciones repetidas. Precio propio, estado, código interno, código de barras y umbral de stock bajo siguen disponibles por talle. Desactivar conserva el historial; quitar elimina sólo filas nuevas todavía sin guardar.

El guardado desde el encabezado y la barra inferior usa la misma operación. Durante guardado, subida de imágenes o ajuste de stock se bloquean los cambios y la navegación. Si el ajuste se guardó pero falla la recarga, la respuesta confirmada actualiza el stock local y se muestra el problema de recarga, evitando insinuar que la operación no ocurrió. Un conflicto de stock recarga la variante; nunca se repite automáticamente la escritura.

## Secciones adaptadas a las referencias

- Productos: encabezado con acento rosa, filtros, total real, ordenamiento en servidor por fecha, nombre, precio o stock y acciones visibles. La búsqueda del encabezado busca productos en todo el catálogo; no anuncia búsqueda de secciones que no realiza.
- Usuarios: formulario de invitación y miembros del equipo con correo, rol, estado, búsqueda en servidor y consulta de permisos. Los editores no solicitan el listado que el servidor reserva al propietario y administradores.
- Notificaciones: filas con iconos, fecha, hora, detalle, categorías, búsqueda y filtro de no leídas. El contador incluye todo el historial, no sólo la primera página. Marcar como leídas usa la fecha del último evento global; el estado se conserva por administrador en este navegador.
- Editor: información e imágenes en columnas, controles con iconos, guardado accesible desde arriba, campos avanzados conservados y una vista compacta de talles en móvil.

## Conflicto corregido

La opción de invitación Sólo lectura ofrecía `viewer`, pero la restricción vigente de Supabase admite únicamente `superadmin`, `admin` y `operator`. Se quitó la opción incompatible del formulario y del contrato de invitación; ahora se rechaza antes de llamar a Auth. No se modificaron las cuentas, las reglas de permisos ni el esquema de la base de datos.

## Validación y despliegue

31 pruebas backend y 29 frontend, lint/build. Pruebas cubren agrupación, orden sin perder identidad, altas sin duplicados, protección al renombrar colores y marcado global de notificaciones. Navegador con API simulada: cambio de stock en el talle elegido, alta de tres talles sin alterar 18 registros existentes, guardado desde el encabezado, búsqueda y ordenamiento de productos, búsqueda de usuarios y filtros/no leídas. Inspección de Productos, Usuarios, Notificaciones y editor en escritorio y 390 px. Se validó la consulta de conteos y ordenamiento contra Supabase con lectura únicamente.

Browser plugin no disponible; se usó Playwright local. No se enviaron invitaciones reales ni se modificó stock de producción durante la prueba. El frontend público se conserva. Frontend y backend requieren desplegar la nueva versión para habilitar búsqueda, ordenamiento y filtros completos.
