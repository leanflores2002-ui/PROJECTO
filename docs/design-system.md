# ROMIX Design System

La interfaz de la tienda comparte sus tokens visuales en
`frontend/public/assets/css/romix-design-system.css`. La hoja se carga después
de las fuentes y antes de las hojas específicas de cada página.

## Tokens principales

Usar los nombres `--romix-*` en estilos nuevos:

- Marca: `--romix-pink` (`#F22797`), `--romix-pink-hover` (`#D91D83`),
  `--romix-pink-soft` (`#F291C7`) y `--romix-pink-bg` (`#FFF0F6`).
- Texto y superficies: `--romix-ink`, `--romix-muted` (alias:
  `--romix-text-muted`),
  `--romix-white`, `--romix-surface` (`#F2F2F2`) y
  `--romix-surface-soft` (`#FAFAFA`).
- Estado: `--romix-success`, `--romix-warning` y `--romix-danger`.
- Forma: `--romix-radius-sm` y `--romix-radius` (2px), y
  `--romix-radius-lg` (0px): controles precisos y superficies rectangulares.
- Controles: `--romix-control-sm` (40px), `--romix-control-md` (44px),
  `--romix-control-lg` (50px), con aliases `--romix-control-height` y
  `--romix-control-height-lg`.
- Movimiento: `--romix-transition` (180ms ease) y alias `--romix-ease`.
- Ritmo: `--romix-space-1` a `--romix-space-8`.
- Foco y elevación: `--romix-focus-ring`, `--romix-shadow-xs`,
  `--romix-shadow` y `--romix-shadow-hover`.

## Botones y controles

Para componentes nuevos:

```html
<a class="romix-btn romix-btn--primary" href="catalogo.html">Ver catálogo</a>
<button class="romix-btn romix-btn--secondary" type="button">Cancelar</button>
<button class="romix-icon-btn" type="button" aria-label="Cerrar">×</button>
```

Variantes disponibles: `romix-btn--primary`, `romix-btn--secondary`,
`romix-btn--outline`, `romix-btn--ghost`, `romix-btn--dark`,
`romix-btn--danger`, `romix-btn--pill` y los tamaños `romix-btn--sm`,
`romix-btn--md` y `romix-btn--lg`. Los iconos independientes usan
`romix-icon-btn`. Todos conservan foco visible,
altura táctil mínima de 44px y estados hover/disabled coherentes.

Las clases históricas (`.btn`, `.cta`, `.filters-open-btn`, `.product-buy-now`,
`.icon-btn`, entre otras) se mantienen porque JavaScript y plantillas las usan.
Sus variables de página (`--catalog-*`, `--product-*`, `--header-*`) son alias
compatibles de los tokens compartidos; no crear nuevos colores paralelos.

## Carga y responsive

`romix-design-system.css` se carga en home, catálogo, categorías, novedades,
detalle de producto, carrito, ayuda y página 404 antes del CSS específico.
Los layouts existentes conservan sus breakpoints y deben revisarse en
360×800, 390×844, 430×932, 768×1024 y 1440×900. La hoja compartida no cambia
datos de productos, precios, talles ni stock.

## Referencia cinematic hardware

La referencia principal es la imagen conceptual de ROMIX compartida en el chat.
`DESIGN.md` (aportado desde Downloads) complementa la geometria, la tipografia
condensada y las superficies planas. Sus ejemplos de Bose no cambian la identidad,
los colores, el logo ni los datos de ROMIX.

- Anton Latin WOFF2 local (18,6 kB) reemplaza Outfit en los titulos. Manrope sigue
  en navegacion, controles, nombres y precios; no se solicita Outfit a Google Fonts.
  Licencia SIL OFL incluida en `frontend/public/assets/fonts/Anton-OFL.txt`.
  Fuente: https://github.com/google/fonts/tree/main/ofl/anton.
- La home usa una unica hoja de composicion: `romix-home-pro.css`. Se retiraron
  los estilos inline antiguos y el bloque home duplicado de la hoja minimal.
- Orden: hero con texto HTML -> lanzamientos -> editorial Mujer/Hombre y acceso
  a Ninos/catalogo -> prendas -> banners existentes -> campana deportiva -> marca.
- Hero: TU ESTILO. / EN MOVIMIENTO.; boton al catalogo existente, imagen inicial
  prioritaria y dimensiones reservadas. Se reutiliza ver-todo en escritorio y
  mujer en movil, sin copiar ni recortar la maqueta como recurso fotografico.
- Limite de carga conservado: 12 productos en el rail de escritorio y 4 en movil.
  Se mantienen precios, disponibilidad, miniaturas de variantes y enlaces reales.
- Header movil: logo a la izquierda, buscador/carrito y menu; mismo DOM e IDs
  funcionales, con orden de teclado alineado a la presentacion.

### Diferencias intencionales

No existe en el proyecto la fotografia panoramica exacta de la referencia: falta
el original de campana sin textos, en alta resolucion, con encuadre desktop/movil.
La composicion preparada usa retratos existentes. Tampoco se sustituyen productos
por los ejemplos ilustrativos de la maqueta. Se conservan precios y disponibilidad,
las secciones utiles anteriores y el footer oscuro propio de ROMIX.

### Validacion de expectativas actualizadas

`cardVariantTests` comprueba la misma opacidad visible en el bundle CSS realmente
cargado en vez del HTML, porque los estilos ya no estan inline.
`storefrontStabilityTests` conserva la igualdad de la ruta critica, con version 23
por el nuevo encabezado movil. La prueba de foco espera requestAnimationFrame antes
de comprobar el mismo retorno al boton de filtros. No se retiran aserciones.
El recorrido de comercio tambien verifica el hero, el enlace de coleccion, los
limites 12/4, los ocultos y la ausencia de flechas en una campana de una imagen.

### Comparación visual con la referencia

| Punto | Resultado y diferencia intencional |
| --- | --- |
| Texto inicial | Título, descripción y CTA del pedido en HTML real; se conserva el mensaje comercial existente. |
| Tipografía | Anton condensada para campaña y títulos; nombres, precios y controles permanecen en Manrope. |
| Paleta | Blanco, negro y rosa ROMIX; no se incorporan colores ni marcas de Bose. |
| Productos | Cuatro por fila en escritorio y dos en móvil, con fotografías, precios y variantes reales. |
| Fotografía | Retratos existentes, con adaptación móvil; falta el original panorámico del concepto. |
| Continuidad | Mujer y Hombre destacados; Niños, prendas, campañas y footer propio siguen accesibles. |

La comparación se hace con la imagen suministrada en el chat, no con el boceto
generado en la revisión anterior. La fotografía disponible impide afirmar una
reproducción exacta del encuadre de referencia.

### Rendimiento local de la revisión

Medianas de tres contextos nuevos por ancho, CPU ×4, latencia de 40 ms y descarga
de 2 MB/s; misma captura inicial de 3,5 segundos y destinos externos bloqueados.
Son mediciones locales, no datos de campo ni un puntaje Lighthouse.

| Métrica | Antes | Después |
| --- | ---: | ---: |
| LCP a 390 px | 940 ms | 920 ms |
| LCP a 1440 px | 1040 ms | 956 ms |
| Transferencia inicial a 390 px | 908407 B | 771199 B |
| Transferencia inicial a 1440 px | 1269369 B | 1110405 B |
| CLS a 390 px | 0 | 0 |
| CLS a 1440 px | 0,000005 | 0,000012 |

La grilla reserva espacio durante la carga del catálogo; los mensajes de error
no heredan esa altura. Se evita desplazar los accesos editoriales cuando llegan
los datos. La transferencia mide la ventana inicial, no toda la página recorrida.
