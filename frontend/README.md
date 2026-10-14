# Frontend

Estructura actual:
- `public/`: paginas HTML y archivos listos para servir.
  - `assets/js`: scripts compartidos.
  - `assets/data`: datasets locales (products.json, snapshots).
  - `images/`: imagenes del catalogo y placeholders.

## Fuentes de las paginas y componentes compartidos

Las seis paginas principales se editan en `frontend/src/templates/`.
El encabezado y el pie tienen una unica fuente en `frontend/src/templates/partials/`.
Ejecutar `npm run sync:shells` despues de editar una plantilla. El comando genera
las paginas de `frontend/public/`, que se conservan versionadas para servir el sitio
sin JavaScript adicional ni una solicitud de red para insertar encabezado y pie.
No editar esas seis salidas HTML directamente: la siguiente generacion las reemplaza.
Las rutas `/mujer/`, `/hombre/` y `/ninos/` tambien se generan con `sync:shells`.
Reutilizan `catalogo.html`, los mismos encabezado/pie y
`partials/category-card.html`; `scripts/generate-category-pages.js` resuelve el
contenido y metadatos de cada seccion. Su clasificacion y visibilidad comparten
`public/assets/js/catalog-sections.js` con el catalogo interactivo.
No editar `public/{mujer,hombre,ninos}/index.html` directamente.
El build completo genera tambien sitemap, previews sociales y reglas noindex de Preview.
Los archivos CSS, JavaScript, imagenes y datos siguen editandose en sus rutas actuales.

`npm test` genera el HTML antes de verificarlo. `npm run build` y el generador de
paginas compartidas tambien regeneran estas paginas. Netlify utiliza ese generador.
Las pruebas de plantillas comprueban que las salidas coinciden con las fuentes y
que un cambio en un componente compartido se propaga a las seis paginas.

Sonar analiza las plantillas y los componentes compartidos como fuentes.
Solo las seis salidas HTML deterministas quedan excluidas de la metrica de
copy-paste (`sonar.cpd.exclusions`), para evitar contar sus copias generadas.
Los chequeos de errores y seguridad del HTML publicado permanecen activos.
`.sonarcloud.properties` configura el analisis automatico;
`sonar-project.properties` configura el scanner de CI.
No se modifica el umbral del quality gate.
