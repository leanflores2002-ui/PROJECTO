# ROMIX Buttons

El sistema compartido de botones vive en
`frontend/public/assets/css/romix-design-system.css`. Todos los ejemplos
requieren que esa hoja se cargue antes de las hojas específicas de la página.

## Variantes

```html
<button class="romix-btn romix-btn--primary" type="button">
  Agregar al carrito
</button>

<a class="romix-btn romix-btn--secondary" href="catalogo.html">
  Ver catálogo
</a>

<button class="romix-btn romix-btn--outline" type="button">
  Compartir
</button>

<button class="romix-btn romix-btn--ghost" type="button">
  Ver detalles
</button>

<button class="romix-btn romix-btn--dark" type="button">
  Acción alternativa
</button>

<button class="romix-btn romix-btn--danger" type="button">
  Eliminar
</button>
```

Las variantes primary, secondary, outline, ghost, dark y danger conservan la
jerarquía ROMIX: CTA principal, acción secundaria, alternativa importante,
acción terciaria, acción fuerte sobre superficies claras y acción destructiva.

## Iconos, pills y tamaños

```html
<button class="romix-icon-btn" type="button" aria-label="Cerrar">×</button>

<button class="romix-btn romix-btn--primary romix-btn--pill" type="button">
  Mujer
</button>

<button class="romix-btn romix-btn--secondary romix-btn--sm" type="button">
  Pequeño
</button>
<button class="romix-btn romix-btn--secondary romix-btn--md" type="button">
  Mediano
</button>
<button class="romix-btn romix-btn--primary romix-btn--lg" type="button">
  Comprar ahora
</button>
```

Los tamaños usan 40px, 44px y 50px respectivamente. Los controles táctiles
importantes usan como mínimo 44px. `romix-btn--pill` queda reservado para
categorías, etiquetas y filtros compactos; no se aplica a todos los botones.

## Estados y compatibilidad

Los botones comparten hover, active, `:focus-visible`, `:disabled` y
`[aria-disabled="true"]`. El foco conserva un outline visible y un halo rosa.

Las clases históricas —por ejemplo `.btn`, `.cta`, `.filters-open-btn`,
`.product-buy-now`, `.share-btn`, `.icon-btn` y `.cart-pill`— se mantienen en
los elementos existentes para no romper JavaScript, IDs, atributos data,
listeners, URLs ni lógica de negocio. Las clases `romix-*` agregan únicamente
la capa visual compartida.
