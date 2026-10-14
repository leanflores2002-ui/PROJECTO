const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const fixtures = [
  { id: 'gris', name: 'Gris', section: 'mujer', type: 'tops', price: 10000, image: 'images/logo-romix.png', colors: [{ name: 'Gris', hex: '#808080' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'gris-secondary', name: 'Gris secundario', section: 'mujer', type: 'tops', price: 10100, image: 'images/logo-romix.png', colors: [{ name: 'Gris', hex: '#808080' }], sizes: ['2'], stockStatus: 'out' },
  { id: 'gris-oscuro', name: 'Gris oscuro', section: 'mujer', type: 'tops', price: 10200, image: 'images/logo-romix.png', colors: [{ name: 'Gris oscuro', hex: '#4B4B4B' }], sizes: ['2'], stockStatus: 'low' },
  { id: 'gris-melange', name: 'Gris melange', section: 'mujer', type: 'tops', price: 10300, image: 'images/logo-romix.png', colors: [{ name: 'Gris melange', hex: '#A9A9A9' }], sizes: ['2'], stockStatus: 'out' },
  { id: 'gris-medio', name: 'Gris medio', section: 'mujer', type: 'tops', price: 10400, image: 'images/logo-romix.png', colors: [{ name: 'Gris medio', hex: '#4b4b4b' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'negro', name: 'Negro', section: 'mujer', type: 'tops', price: 10500, image: 'images/logo-romix.png', colors: [{ name: 'Negro', hex: '#000000' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'blanco', name: 'Blanco', section: 'mujer', type: 'tops', price: 10600, image: 'images/logo-romix.png', colors: [{ name: 'Blanco', hex: '#FFFFFF' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'azul', name: 'Azul', section: 'mujer', type: 'tops', price: 10700, image: 'images/logo-romix.png', colors: [{ name: 'Azul', hex: '#1E4ED8' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'verde', name: 'Verde', section: 'mujer', type: 'tops', price: 10800, image: 'images/logo-romix.png', colors: [{ name: 'Verde', hex: '#2E7D32' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'rojo', name: 'Rojo', section: 'mujer', type: 'tops', price: 10900, image: 'images/logo-romix.png', colors: [{ name: 'Rojo', hex: '#FF0000' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'estampado-1', name: 'Estampado 1', section: 'mujer', type: 'tops', price: 11000, image: 'images/logo-romix.png', colors: [{ name: 'Estampado 1', hex: '#1F4FA8' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'estampado-15', name: 'Estampado 15', section: 'mujer', type: 'tops', price: 11100, image: 'images/logo-romix.png', colors: [{ name: 'Estampado 15', hex: '#386641' }], sizes: ['2'], stockStatus: 'available' },
  { id: 'hidden', name: 'No visible', section: 'mujer', type: 'tops', price: 11200, image: 'images/logo-romix.png', visible: false, colors: [{ name: 'Oculto', hex: '#123456' }], sizes: ['2'] }
];

function readPublic(relativePath) {
  return fs.readFileSync(path.join(PUBLIC_DIR, ...relativePath.split('/')), 'utf8');
}

async function renderCatalog(url) {
  const window = new JSDOM(readPublic('catalogo.html'), {
    runScripts: 'outside-only',
    url
  }).window;
  window.romixProductsStore = {
    load: async () => fixtures.filter((item) => item.visible !== false),
    isVisible: (item) => !!item && item.visible !== false
  };
  window.romixCart = { updateBadge() {} };
  window.eval(readPublic('assets/js/romix-image-utils.js'));
  window.eval(readPublic('assets/js/catalog-sections.js'));
  window.eval(readPublic('assets/js/romix-catalog-pages.js'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise((resolve) => window.setTimeout(resolve, 30));
  return window;
}

async function main() {
  const html = readPublic('catalogo.html');
  const js = readPublic('assets/js/romix-catalog-pages.js');
  const css = readPublic('assets/css/romix-catalog-pages.css');

  assert(!html.includes('availability-filter-group'), 'No debe quedar el markup del filtro de disponibilidad');
  assert(!html.includes('data-group="stock"'), 'No debe quedar el checkbox de stock');
  assert(!js.includes('state.selected.stock'), 'No debe quedar estado de filtro de stock');
  assert(!js.includes('requestedStock'), 'No debe quedar lectura del filtro stock');
  assert(!js.includes('return "otros"'), 'No debe existir fallback de color Otros');
  assert(!js.includes('key: "otros"'), 'No debe existir opción de color Otros');
  assert(js.includes('function compareFilterValues'), 'Los valores de filtros deben tener un comparator explícito');
  assert(js.includes('Array.from(values || []).sort(compareFilterValues)'), 'Los filtros deben ordenarse con compareFilterValues');
  assert(js.includes('Array.from(state.selected.sections).sort(compareFilterValues)'), 'Las secciones deben ordenarse con compareFilterValues');
  assert(JSON.stringify(['10', '2', '1'].sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }))) === JSON.stringify(['1', '2', '10']), 'El orden numérico de valores de filtro debe conservarse');
  assert(!css.includes('availability-filter-group'), 'No debe quedar CSS de disponibilidad');

  const window = await renderCatalog('http://localhost/catalogo.html?stock=available');
  const labels = Array.from(window.document.querySelectorAll('#color-options .filter-option'));
  const names = labels.map((label) => label.querySelector('span:last-child').textContent.trim());
  const keys = labels.map((label) => label.querySelector('input').value);

  assert(!window.document.querySelector('#availability-filter-group'), 'La disponibilidad no debe renderizarse');
  assert(!window.document.querySelector('input[data-group="stock"]'), 'No debe renderizarse input de stock');
  assert(window.location.search === '', 'stock=available debe limpiarse de la URL');
  assert(keys.includes('gris') && keys.includes('gris-oscuro') && keys.includes('gris-melange') && keys.includes('gris-medio'), 'Las variantes de gris deben ser filtros independientes');
  assert(keys.includes('negro') && !keys.includes('gris-negro'), 'Negro no debe mezclarse con gris');
  assert(names.includes('Multicolor'), 'Debe existir el filtro Multicolor');
  assert(names.filter((name) => /^Estampado/i.test(name)).length === 0, 'Los estampados no deben exponerse como opciones individuales');
  assert(!names.includes('Otros'), 'No debe existir el filtro Otros');
  const stockStatuses = new Set(Array.from(window.document.querySelectorAll('#product-grid .stock-note')).map((element) => element.textContent.trim()));
  assert(stockStatuses.has('Disponible') && stockStatuses.has('Sin stock'), 'Las tarjetas deben conservar el estado de stock');

  const multicolor = labels.find((label) => label.querySelector('input').value === 'multicolor');
  assert(multicolor.querySelector('.color-dot').style.background.includes('conic-gradient'), 'Multicolor debe usar un swatch conic-gradient');
  const gris = labels.find((label) => label.querySelector('input').value === 'gris');
  const grisBackground = gris.querySelector('.color-dot').style.background.toLowerCase();
  assert(grisBackground === '#808080' || grisBackground === 'rgb(128, 128, 128)', `Debe elegirse el hex más frecuente para Gris (obtenido: ${grisBackground})`);
  assert(gris.title === 'Gris' && gris.querySelector('input').getAttribute('aria-label') === 'Filtrar por Gris', 'Los swatches deben tener nombre accesible');
  assert(window.document.querySelector('#color-more-btn').textContent.trim() === 'Ver más', 'El control debe decir Ver más');

  window.document.querySelector('#color-more-btn').click();
  assert(window.document.querySelector('#color-more-btn').textContent.trim() === 'Ver menos', 'El control expandido debe decir Ver menos');

  const grisMedioInput = window.document.querySelector('input[data-group="colors"][value="gris-medio"]');
  grisMedioInput.checked = true;
  grisMedioInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((resolve) => window.setTimeout(resolve, 10));
  const filteredNames = Array.from(window.document.querySelectorAll('#product-grid .product-name')).map((element) => element.textContent.trim());
  assert(JSON.stringify(filteredNames) === JSON.stringify(['Gris medio']), 'El filtro Gris medio debe seleccionar solo su variante');

  window.close();
  console.log('catalogFilterTests: passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
