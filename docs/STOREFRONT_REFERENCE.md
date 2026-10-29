# Referencia visual del storefront ROMIX

Esta fase no reconstruye la interfaz. La referencia observable en este
repositorio está formada por:

- Páginas: home, catálogo, carrito, producto, ayuda, privacidad, términos y
  404; además de rutas generadas por sección (`mujer`, `hombre`, `ninos`) y
  páginas de producto estáticas.
- Navegación: encabezado compartido, acceso a catálogo por sección, búsqueda,
  carrito, enlaces legales y pie de página compartido.
- Assets: `frontend/public/images`, videos en `frontend/public/videos`, fuentes,
  CSS y datos en `frontend/public/assets`.
- Componentes visuales: header/footer compartidos, tarjetas de catálogo,
  filtros, galería de producto, selector de color/talle, carrito, banners y
  contenido multimedia de la home.
- Comportamiento: filtros y búsqueda locales, persistencia de carrito,
  selección de variantes, precios por grupo/talle, SEO/canonical y generación
  de páginas derivadas.

Las fuentes editables están en `frontend/src/templates` y sus parciales; las
salidas en `frontend/public` siguen siendo rollback. El repositorio de
referencia adicional `leanflores2002-ui/ROMIX` no está configurado como remote
en este checkout, por lo que no se copiaron ni asumieron assets externos.
Cuando esté disponible, se podrá hacer una comparación visual explícita en una
fase separada.
