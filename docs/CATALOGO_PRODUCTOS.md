# Catálogo ROMIX: formato simple de productos

El catálogo sigue usando `frontend/public/assets/data/products.json`, pero para productos nuevos ya no hace falta repetir la misma foto en `image`, `images`, `imageMap`, `thumbnail`, `thumbnailFallback` y `thumbnailAvif`.

## Formato recomendado

```json
{
  "section": "mujer",
  "type": "pantalones",
  "name": "Pantalon Baggy Jogging algodon Rustico",
  "season": "media-estacion",
  "image": "images/products/pantalon_baggy_jogging_negro.webp",
  "price": 14500,
  "priceByGroup": {
    "common": 14500,
    "special": 15300
  },
  "specialSizes": [6, 7, 8],
  "colors": [
    {
      "name": "Negro",
      "hex": "#000000",
      "image": "images/products/pantalon_baggy_jogging_negro.webp"
    },
    {
      "name": "Beige",
      "hex": "#D8C3A5",
      "image": "images/products/pantalon_baggy_jogging_beige.webp"
    }
  ],
  "sizes": ["2", "3", "4", "5", "6", "7", "8"]
}
```

Cada foto por color se declara una sola vez en `colors[].image`. `image` en la raíz queda como portada/fallback general.

## Varias fotos para un mismo color

```json
{
  "name": "Negro",
  "hex": "#000000",
  "images": [
    "images/products/producto_negro_frente.webp",
    "images/products/producto_negro_costado.webp",
    "images/products/producto_negro_detalle.webp"
  ]
}
```

La primera imagen funciona como principal del color y las demás se pueden usar en la galería.

## Talles

Cuando un talle está disponible, puede escribirse directamente:

```json
"sizes": ["1", "2", "3", "4", "5", "6", "7", "8"]
```

Solo hace falta un objeto para estados especiales:

```json
"sizes": [
  "2",
  "3",
  { "size": "4", "status": "low-stock" },
  { "size": "5", "status": "out-of-stock" }
]
```

## Compatibilidad

No se eliminó la compatibilidad con el formato anterior. Siguen funcionando `images`, `imageMap`, `thumbnail`, `thumbnailFallback`, `thumbnailAvif` y los talles como objetos `{ "size": "...", "status": "..." }`.

Esto permite migrar productos viejos gradualmente sin rehacer el catálogo completo.

## Fotos y peso

Para productos nuevos se recomienda WebP cuando sea posible. Evitar guardar por cada foto una copia JPG + WebP + AVIF salvo que exista una razón concreta para mantener las tres. La imagen original sigue funcionando como fallback.

## Validación antes de subir

Ejecutar:

```bash
npm run check:products
```

El script revisa JSON válido, campos básicos, nombres duplicados, colores, talles, imágenes faltantes y avisa sobre imágenes de más de 1.5 MB.

## Visibilidad de productos

La temporada ya no decide si un producto se publica. Para controlar la publicacion usar:

```json
"visible": true
```

El producto aparece en la web. Para ocultarlo sin borrarlo:

```json
"visible": false
```

Si el campo `visible` no existe, el producto se considera visible por defecto para mantener compatibilidad con el catalogo anterior.
