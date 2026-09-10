# Stock e inventario

## Fuente de verdad

`public.product_variants.stock` en PostgreSQL, leído y modificado a través de FastAPI.
Admin usa Supabase Auth; no escribe tablas desde el navegador. FastAPI comprueba JWT,
`admin_profiles.is_active` y rol. La conexión PostgreSQL del backend debe tener permisos
de lectura/escritura; una clave anon no reemplaza `DATABASE_URL`.

Auditoría del proyecto `gpzeftandqgafxipqhnh`, 2026-09-10: 157 productos, 5.633 variantes,
5.633 movimientos y un administrador. Los conteos de `list_tables` eran estimaciones
incorrectas (0); se verificaron con `COUNT(*)`. **Todos los movimientos históricos son
importaciones iniciales desde estados del JSON, no ventas ni conteos físicos verificados.**
No se alteraron esas existencias. Hay que reconciliarlas con el inventario físico.

## Modelo y escrituras

- Se reutilizan `products`, `product_variants`, `stock_movements`, `orders`, `order_items`,
  `audit_logs` y `admin_profiles`.
- Variante: UUID, producto, SKU, código de barras, color, talle, stock, umbral y estado.
  `low_stock_threshold` ya existía (default 3); sólo el código de barras requiere una adición.
- `InventoryService.adjust_stock` bloquea la variante con `FOR UPDATE`, compara
  `expected_updated_at`, calcula sumar/quitar/establecer en servidor y escribe el movimiento.
- Stock, movimiento y auditoría comparten una transacción. Un error revierte todos.
  Los constraints existentes impiden stock negativo y exigen `after = before + delta`.
- Un ajuste sin cambio devuelve `movementId: null`: la tabla prohíbe movimientos de delta 0.
- Un PUT de producto no acepta stock de variantes existentes: deben enviar `stock: null`
  y su `updated_at`. El stock inicial de una variante nueva genera un movimiento.
- El producto también exige `expected_updated_at`. Un formulario obsoleto recibe 409,
  incluso si otra persona o un pedido modificó alguna de sus variantes.

## API

| Ruta | Comportamiento |
| --- | --- |
| `GET /api/variants` | Disponibilidad de variantes activas de productos publicados, desde DB |
| `GET /api/admin/products/{id}` | Detalle con stock y versiones actuales |
| `POST /api/admin/inventory/{variant_id}/adjust` | `operation: set/add/remove`, stock o cantidad, motivo y versión |
| `POST /api/orders` | URL histórica, delega al mismo flujo transaccional de pedidos |
| `POST /api/public/orders` | Mismo flujo, sin sistema paralelo |

El ajuste devuelve `stockBefore`, `quantityDelta`, `stock`, `updated_at`, `movementId`.
El Admin espera confirmación y actualiza con estos valores; nunca calcula el nuevo stock
como resultado definitivo en el navegador.

## Carrito y pedidos

`request_key` es un UUID persistido en el navegador para poder reintentar un pedido incierto.
PostgreSQL serializa la clave, valida un hash del contenido y devuelve el mismo pedido
en un reintento. Reutilizar una clave con otros artículos devuelve 409.

El servidor resuelve las referencias del catálogo a UUID, agrupa aliases y bloquea variantes
en orden UUID para evitar sobreventa y deadlocks entre pedidos. Revalida publicación,
estado, precio y stock. El precio sale de `price_override`, grupo por talle o `base_price`.
El cuerpo del carrito no envía precios y cualquier precio adicional es ignorado.

El pedido se persiste como `submitted`: **reserva existencias; no acredita pago ni venta**.
WhatsApp se construye con los artículos y precios confirmados. Si el navegador bloquea
la ventana, queda un enlace visible. Un fallo de API conserva el carrito.

La ruta existente `PATCH /api/admin/orders/{id}/status` ahora se monta y libera stock al
pasar a `cancelled`, bloqueando primero el pedido y luego las variantes. La repeticion
no devuelve unidades dos veces. Un pedido cancelado no puede reactivarse sin crear uno nuevo.
`completed` permite contabilizar ventas confirmadas. No hay vencimiento automatico de reservas:
los pedidos abandonados requieren cancelacion administrativa por esta API.

## Fallos y compatibilidad

`inventory.js` conserva sus nombres públicos para los consumidores existentes, pero ya no
lee/escribe stock en localStorage. Sólo una respuesta de `/api/variants` habilita existencias
confirmadas, por hasta 60 segundos. Una combinación ausente en esa respuesta vale 0.
Sin API, muestra `Consultar disponibilidad`; confirmar pedido requiere la DB disponible.

El catálogo conserva API → JSON → caché de sesión → preloaded. El fallback elimina números
y estados de stock. El carrito local sigue guardando la intención de compra, no existencias.

Errores: 401 sesión inválida; 403 permisos; 404 entidad inexistente/no pública; 409 conflicto
de versión o stock; 422 formulario inválido; 503 base no disponible. El cliente administrativo
formatea validaciones y no convierte objetos en `[object Object]`.

Las funciones JSON antiguas de `main.py` quedan temporalmente para referencia y compatibilidad
de código, pero no están conectadas al startup, `/api/variants` ni `/api/orders`.
No usar `load_variants`, `persist_variants` ni `validate_and_reserve` en nuevos endpoints.
