# Datos de producto y estadísticas

## Flujo

```text
Supabase PostgreSQL
  ├─ products / variants / images / price groups / specifications
  └─ movements / orders / views
          ↓ FastAPI (negocio, autorización, contratos)
          ├─ Admin React y cliente src/lib/api.js
          └─ products-store.js → catálogo / detalle público
```

`catalog_sync._build_catalog` es el adaptador único de PostgreSQL al formato público.
Acepta una referencia para buscar un producto sin reconstruir todo el catálogo.
`product_schemas.py` define ProductListItem, ProductDetail, ProductVariant,
InventorySummary y AdminProductDetail. Los campos adicionales del catálogo se limitan
a compatibilidad visual explícita; no se devuelve `legacy_payload` completo.

El nombre `id` público conserva el `legacy_id` o slug para enlaces/carritos existentes;
`databaseId` es el UUID real. Los aliases `price`, `originalPrice`, `priceByGroup`, `imageMap`,
`specs` y `descriptionHtml` se generan en el adaptador. Las imágenes históricas por color
se conservan, incluidas las que no son filas separadas de `product_images`. Seleccionar
una imagen Storage como principal actualiza la portada. No hubo conversiones de imágenes.

## Edición

Las rutas de CRUD existentes se mantienen (`GET`, `POST`, `PUT /api/admin/products`).
Se editan nombre, slug, SKU, código de barras, publicación, público, categoría, colección,
temporada, precios, etiquetas, descripción y variantes. Material, composición, cuidados,
calce, características y descripción corta reutilizan `specifications`.
El detalle renderiza sólo valores presentes. Vaciar la descripción no restaura la del JSON.

`PATCH /api/admin/products/{id}/images` ordena las imágenes con control de versión y auditoría.
Los endpoints existentes de Storage conservan subida, principal y eliminación individual.
`GET /api/admin/products/{id}/preview` requiere autenticación y devuelve el HTML de
`product.html` con el producto guardado, incluso borrador. El Admin lo muestra en un iframe
aislado con almacenamiento efímero: no comparte sesión, no registra visitas ni crea pedidos.
La vista previa refleja la última versión guardada, no cambios pendientes del formulario.

## Estadísticas

`GET /api/admin/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD` usa agregaciones SQL de
StatisticsService. El rango incluye los días completos en America/Argentina/Buenos_Aires;
máximo 367 días. El inventario siempre representa el estado actual y no depende del período.

- Productos publicados/ocultos/borradores; variantes activas; unidades; productos con
  alguna variante baja; productos agotados; variantes activas agotadas.
- Valor estimado: unidades por el precio efectivo de venta, no costo ni ganancia.
- Movimientos agrupados por los tipos existentes. Las entradas históricas incluyen el
  stock inicial; no se etiquetan como ventas. Cancelaciones/devoluciones comparten el tipo
  histórico `cancellation`; no se inventa una separación que los datos no permiten.
- Más/menos stock, agotados, stock bajo, más movimientos, más/menos vistos.
- Variantes más vendidas sólo desde pedidos `completed`. `submitted` no es venta.

`POST /api/public/products/{uuid}/view` guarda un UUID aleatorio de evento por producto y
pestaña. UNIQUE(event_key) deduplica recargas y reintentos. No guarda IP, usuario, referrer
ni fingerprint. La métrica significa aperturas por pestaña/producto, no visitantes únicos
ni tráfico certificado: no cuenta bots de forma fiable y puede ser manipulada por clientes.
No hay histórico anterior al despliegue. Sin eventos o pedidos suficientes, el Admin lo indica.

## Migración progresiva

1. Revisar y aplicar únicamente la nueva migración después del baseline existente.
2. Desplegar FastAPI: `/api/products` y `/api/variants` consultan DB directamente.
3. Desplegar Admin y tienda; conservar el JSON para caídas de catálogo.
4. Verificar URLs históricas, imágenes por color, precio por talle y disponibilidad.
5. Retirar compatibilidad sólo después de medir consumidores y actualizar tests.

`products.json` no se reescribe durante peticiones y deja de ser fuente editable principal.
`sync_public_catalog` queda como exportador legado sin llamadas desde el nuevo flujo.
Los metadatos sociales y búsquedas históricas del servidor conservan funciones de snapshot;
la carga de catálogo y detalle interactivo siempre prioriza la API.
