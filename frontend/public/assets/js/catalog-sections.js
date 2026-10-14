(function (root) {
  function normalizeSection(value) {
    const key = String(value || '').normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().trim();
    if (['mujer', 'mujeres', 'dama', 'damas'].includes(key)) return 'mujer';
    if (['hombre', 'hombres', 'caballero', 'caballeros'].includes(key)) return 'hombre';
    if (['ninos', 'ninas', 'nino', 'nina', 'ninos y ninas', 'nino y nina'].includes(key)) return 'ninos';
    return key || 'catalogo';
  }
  const categories = [
    {key: 'mujer', label: 'Mujer', title: 'Ropa para mujer | ROMIX', description: 'Explorá la ropa para mujer de ROMIX. Compará prendas, talles, colores y precios del catálogo.', intro: 'Encontrá prendas del catálogo de mujer y compará sus talles, colores y precios. Abrí cada producto para ver sus opciones y consultar disponibilidad.'},
    {key: 'hombre', label: 'Hombre', title: 'Ropa para hombre | ROMIX', description: 'Explorá la ropa para hombre de ROMIX. Consultá las prendas publicadas, sus talles, colores y precios.', intro: 'Recorré las prendas del catálogo de hombre. Consultá las opciones de cada producto y usá los filtros para encontrar lo que buscás.'},
    {key: 'ninos', label: 'Niños', title: 'Ropa para niños | ROMIX', description: 'Descubrí la ropa para niños y niñas de ROMIX. Consultá talles, colores y precios de los productos publicados.', intro: 'Explorá las prendas para niños y niñas del catálogo ROMIX. Revisá los talles y las opciones de cada producto antes de coordinar tu pedido.'}
  ];
  function publicProducts(products, section) {
    return products.filter(product => product && product.visible !== false
      && (!section || normalizeSection(product.section) === section));
  }
  const api = {normalizeSection, categories, publicProducts};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.romixCatalogSections = api;
})(typeof window !== 'undefined' ? window : globalThis);
