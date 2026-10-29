# `products.json`: auditoría y futura normalización D1

Fuente auditada: `frontend/public/assets/data/products.json`.

## Hallazgos

- 169 registros.
- No hay `id` ni `slug` explícitos; el legado deriva identidad desde `name`.
- No se detectaron duplicados exactos al comparar nombres normalizados para la
  auditoría inicial ni colisiones explícitas de identidad en el archivo.
- Campos observados: `name`, `section`, `type`, `season`, `image`, `images`,
  `colors`, `sizes`, `price`, `originalPrice`, `priceByGroup`,
  `specialSizes`, `specialSizes2`, `superSpecialSizes`, `designs`, `badge`,
  `featured`, `featuredBadge`, `visible`.
- `section` tiene los valores `mujer`, `hombre`, `ninos`; `type` tiene variantes
  de capitalización (`Palazos`/`palazos`) y categorías que deben normalizarse.
- `season` usa `invierno`, `media-estacion` y `verano`.
- 46 productos tienen `visible: false`; los demás omiten el campo y el legado
  los trata como visibles.
- `price` siempre es numérico en la muestra auditada. `priceByGroup` está
  ausente en cuatro registros.
- `colors` tiene tres formas: objetos con `name`/`hex`/`image`, objetos con un
  `swatch` adicional y objetos con `images` en lugar de `image`.
- `sizes` tiene strings y objetos `{ size, status }`.
- Las imágenes son rutas relativas al árbol público; no se deben insertar como
  binarios en D1.

## Relaciones implícitas

El producto contiene de forma embebida colores, imágenes, talles y reglas de
precio por grupo. `section` representa la audiencia/categoría principal y
`type` una familia de producto. La relación de variantes es el producto ×
color × talle, con disponibilidad derivada de `status` en algunos registros.

El backend legado además mantiene variantes en
`backend/data/product_variants.json` y usa un lock de proceso para reservar
stock. Esa lógica no es una fuente de concurrencia suficiente para Workers y se
debe reemplazar por D1 + un Durable Object de inventario cuando exista el
modelo de pedidos nuevo.

## Modelo D1 propuesto, pendiente de aprobación

1. Generar un `product_id` estable y conservar el nombre/identidad legacy en
   una columna `legacy_id` o tabla de correspondencia.
2. Normalizar `categories` desde `section`/`type` y guardar slugs únicos.
3. Llevar atributos base a `products`; no conservar toda la forma JSON como
   modelo principal.
4. Convertir `colors` a `product_variants` o a una tabla de opciones, según la
   decisión final sobre el stock por color/talle.
5. Convertir cada ruta de imagen a `product_images` con `r2_key` y conservar
   temporalmente la ruta legacy en un campo de migración.
6. Convertir `priceByGroup` a una política de precios versionada, sin mezclar
   grupos comerciales en el precio base.
7. Guardar el payload original sólo como respaldo temporal durante la
   migración, con una fecha de eliminación acordada.

No se ejecutó ninguna importación irreversible. El JSON permanece intacto.
