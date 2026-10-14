# Imágenes de productos

ROMIX administra una sola imagen canónica por foto o variante comercial:

```text
frontend/public/images/products/<nombre>.webp
```

La imagen canónica se usa para el detalle y la galería principal. El proceso de
optimización genera automáticamente derivados para los contextos pequeños:

```text
frontend/public/images/thumbs/<nombre>.webp       # cards y miniaturas de galería
frontend/public/images/swatches/<nombre>.webp     # variantes de pocos píxeles
```

El resolver mantiene los campos explícitos `thumbnail`, `thumb`, `swatch` y sus
fallbacks para compatibilidad, pero cuando no existen deriva rutas seguras desde
la imagen canónica. Si falta un derivado, el navegador conserva el fallback a la
foto original sin romper la tarjeta.

## Agregar una foto

1. Guardar el archivo WebP en `frontend/public/images/products/`.
2. Referenciarlo una sola vez en `products.json`, normalmente en `image` o en
   la variante correspondiente.
3. Ejecutar `npm run optimize:products -- --write` para generar el WebP
   canónico, las miniaturas de card y los swatches.

No crear manualmente archivos derivados en `images/thumbs/` o
`images/swatches/`; los nombres se calculan a partir del archivo canónico.

Para una foto PNG/JPG nueva, validar y convertir en modo seguro:

```text
npm run optimize:products
npm run optimize:products -- --write
```

El primer comando es dry-run. El segundo crea WebP con orientación corregida,
lado mayor de hasta 1.600 px, calidad 82 y sin agrandar imágenes pequeñas;
además genera derivados de 640×853 para cards y 96×128 para swatches.
Nunca borra el archivo de entrada ni modifica referencias del catálogo.

## Cambiar una foto

Reemplazar un único archivo manteniendo el mismo nombre, por ejemplo
`capri_lycra_negro.webp`, y ejecutar el optimizador para actualizar los
derivados cuyo origen haya cambiado. No hay que editar rutas de miniaturas a
mano.

## Agregar un producto

Agregar solamente las imágenes canónicas necesarias y referenciarlas en
`frontend/public/assets/data/products.json`. Una variante simple puede ser:

```json
{
  "name": "Estampado 1",
  "image": "images/products/capri_lycra_estampado_1.webp"
}
```

El resolver deriva las colecciones `images` e `imageMap` cuando faltan y usa la
misma imagen para miniatura y swatch. No es necesario repetir la ruta en
`thumbnail`, `swatch` o `thumbnailFallback`.

## Previews sociales

Las páginas compartibles conservan como máximo un preview JPEG generado por
producto. Se regeneran desde la imagen principal canónica con:

```text
npm run generate:share-pages
```

Los archivos resultantes viven en `frontend/public/share-previews/` y el
manifiesto se genera automáticamente. No se administran manualmente.

## Banners y branding

Los banners y el logo se optimizan sin tocar sus fuentes originales mediante:

```text
npm run optimize:storefront -- --write
```

El script genera variantes WebP responsive en
`frontend/public/images/optimized/banners/` y
`frontend/public/images/optimized/branding/`. Las páginas usan `picture`,
`srcset` y `sizes` para que el navegador descargue solo la variante adecuada.

## Auditoría y validación

```text
npm run audit:product-media -- before
npm run audit:storage -- before
npm run check:products
npm run test:media
npm test
```

Los reportes quedan en `reports/`, están excluidos del deployment y sirven para
comparar el estado antes y después de una migración.
