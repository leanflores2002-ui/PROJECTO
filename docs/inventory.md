## Flujo de inventario y pedidos

### Backend
- Archivo de variantes: `backend/data/product_variants.json` (product_id, color, size, stock). Se genera al inicio si no existe usando los colores/talles del catálogo con stock base según estado (`out`=0, `low`=2, resto=5).
- Endpoints:
  - `GET /api/variants`: devuelve el stock por variante.
  - `POST /api/orders`:
    ```json
    { "items":[{ "productId":"p1", "color":"Lila", "size":"M", "qty":1 }] }
    ```
    Valida existencia de producto/color/talle y stock suficiente, descuenta en una transacción protegida por candado y responde con `orderId` y `updatedVariants`.
- No se permite stock negativo ni combinaciones inexistentes. Los productos se validan contra `products.json`.

### Frontend
- Script compartido `assets/js/inventory.js` mantiene un mapa local de stock por variante (`romixVariantStock`), sincronizado con `GET /api/variants` y con las `updatedVariants` tras un pedido.
- `quickAdd` en catálogos (inicio, mujer, hombre, niños) verifica stock antes de agregar al carrito y persiste `productId`, color, talle e imagen para el pedido.
- Carrito (`cart.html`):
  - Enviar pedido llama a `POST /api/orders`.
  - Si éxito: mezcla `updatedVariants` en el mapa local, limpia carrito y actualiza UI.
  - Si error: muestra mensaje exacto del backend.

### Tests
- `backend/tests/test_orders.py` cubre dos flujos: stock suficiente (descuenta) y stock insuficiente (retorna 400).

### Cómo probar rápido
1) Levantar backend: `uvicorn backend.app.main:app --reload`.
2) Front: abrir `frontend/public/index.html` o `cart.html`.
3) En carrito, agregar productos y hacer pedido. Ver el mapa de stock en `localStorage.romixVariantStock` y la respuesta de `/api/orders`.
