const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function readPublic(relativePath) {
  return fs.readFileSync(path.join(PUBLIC_DIR, ...relativePath.split('/')), 'utf8');
}

function product(name, season, visible, extra) {
  const value = {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    section: 'mujer',
    type: 'remeras',
    season,
    price: 10000,
    image: 'images/logo-romix.png',
    colors: [{ name: 'Negro', image: 'images/logo-romix.png' }],
    sizes: ['2']
  };
  if (visible !== undefined) value.visible = visible;
  return Object.assign(value, extra || {});
}

const summerVisible = product('Producto Verano Visible', 'verano', true);
const summerHidden = product('Producto Verano Oculto', 'verano', false);
const winterLegacy = product('Producto Invierno Legacy', 'invierno');
const midSeasonLegacy = product('Producto Media Estacion Legacy', 'media-estacion', undefined, {
  hidden: true,
  active: false,
  state: 'draft'
});
const visibleOverridesLegacy = product('Producto Visible Con Flags Legacy', 'verano', true, {
  hidden: true,
  active: false,
  state: 'archived'
});
const fixtures = [summerVisible, summerHidden, winterLegacy, midSeasonLegacy, visibleOverridesLegacy];

function createWindow(html, url) {
  return new JSDOM(html || '<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'outside-only',
    url: url || 'http://localhost/'
  }).window;
}

function evaluate(window, relativePath) {
  window.eval(readPublic(relativePath));
}

async function testSharedVisibilityAndSearch() {
  const window = createWindow();
  evaluate(window, 'assets/js/slugify.js');
  evaluate(window, 'assets/js/products-store.js');

  assert(window.romixProductsStore.isVisible(summerVisible), 'Verano visible debe publicarse');
  assert(!window.romixProductsStore.isVisible(summerHidden), 'Verano con visible false debe ocultarse');
  assert(window.romixProductsStore.isVisible(winterLegacy), 'Producto sin visible debe publicarse');
  assert(window.romixProductsStore.isVisible(midSeasonLegacy), 'Flags legacy no deben ocultar productos');
  assert(window.romixProductsStore.isVisible(visibleOverridesLegacy), 'visible true debe prevalecer sobre flags legacy');

  const sanitized = window.sanitizeList(fixtures);
  assert(sanitized.some((item) => item.name === summerVisible.name), 'sanitizeList debe conservar verano visible');
  assert(!sanitized.some((item) => item.name === summerHidden.name), 'sanitizeList debe quitar visible false');
  assert(sanitized.some((item) => item.name === midSeasonLegacy.name), 'sanitizeList debe ignorar flags legacy');

  const stored = await window.romixProductsStore.load({ preloaded: fixtures });
  assert(stored.length === 4, 'ProductsStore debe excluir solamente visible false');
  assert(stored.some((item) => item.name === summerVisible.name), 'ProductsStore debe cargar verano visible');
  assert(!stored.some((item) => item.name === summerHidden.name), 'ProductsStore no debe cargar verano oculto');

  evaluate(window, 'assets/js/search.js');
  const searchResults = window.romixSearch.searchInList(fixtures, 'Producto');
  assert(searchResults.some((item) => item.name === summerVisible.name), 'Busqueda debe encontrar verano visible');
  assert(!searchResults.some((item) => item.name === summerHidden.name), 'Busqueda no debe encontrar visible false');

  evaluate(window, 'assets/js/season-filter.js');
  assert(window.romixSeasonFilter.isVeranoProduct(summerVisible), 'El helper de temporada debe reconocer verano');
  assert(window.romixSeasonFilter.seasonKeyForProduct(winterLegacy) === 'invierno', 'Debe reconocer invierno');
  assert(window.romixSeasonFilter.seasonKeyForProduct(midSeasonLegacy) === 'media-estacion', 'Debe reconocer media estacion');

  window.close();
}

async function renderCatalog(url) {
  const html = readPublic('catalogo.html');
  const window = createWindow(html, url);
  window.romixProductsStore = {
    load: async () => fixtures.filter((item) => item.visible !== false),
    isVisible: (item) => !!item && typeof item === 'object' && item.visible !== false
  };
  window.romixCart = { updateBadge() {} };
  evaluate(window, 'assets/js/catalog-sections.js');
  evaluate(window, 'assets/js/romix-catalog-pages.js');

  if (window.document.readyState === 'loading') {
    await new Promise((resolve) => window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  } else {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }
  await new Promise((resolve) => window.setTimeout(resolve, 25));
  return window;
}

async function testCatalogAndSeasonFilter() {
  const window = await renderCatalog('http://localhost/catalogo.html');
  const cards = Array.from(window.document.querySelectorAll('#product-grid .product-card'));
  const cardText = cards.map((card) => card.textContent).join('\n');

  assert(cards.length === 4, 'Catalogo sin filtros debe mostrar todas las temporadas visibles');
  assert(cardText.includes(summerVisible.name), 'Catalogo debe mostrar verano visible');
  assert(cardText.includes(winterLegacy.name), 'Catalogo debe mostrar invierno sin visible');
  assert(cardText.includes(midSeasonLegacy.name), 'Catalogo debe mostrar media estacion sin visible');
  assert(!cardText.includes(summerHidden.name), 'Catalogo no debe mostrar visible false');
  assert(window.document.querySelector('#season-options input[value="verano"]'), 'El filtro Verano debe estar disponible');
  window.close();

  const filteredWindow = await renderCatalog('http://localhost/catalogo.html?temporada=verano');
  const filteredText = Array.from(filteredWindow.document.querySelectorAll('#product-grid .product-card'))
    .map((card) => card.textContent)
    .join('\n');
  assert(filteredText.includes(summerVisible.name), 'El filtro Verano debe incluir verano visible');
  assert(filteredText.includes(visibleOverridesLegacy.name), 'El filtro Verano debe respetar visible true');
  assert(!filteredText.includes(summerHidden.name), 'El filtro Verano debe excluir visible false');
  assert(!filteredText.includes(winterLegacy.name), 'El filtro Verano no debe incluir invierno');
  filteredWindow.close();
}

function testDetailAndRelatedGuards() {
  const productSource = readPublic('product.html');
  const indexSource = readPublic('index.html');
  const catalogSource = readPublic('assets/js/romix-catalog-pages.js');

  assert(productSource.includes('const safeList = Array.isArray(list) ? list.filter(item => !isHiddenProduct(item)) : [];'),
    'Detalle principal debe sanitizar la lista antes de buscar');
  assert(productSource.includes('if (isHiddenProduct(p)) return false;'),
    'Productos relacionados deben excluir visible false');
  assert(productSource.includes('return product.visible === false;'),
    'Detalle principal debe usar visible como unica regla local');
  assert(!indexSource.includes('season.includes("invierno")'),
    'La portada no debe elegir publicaciones por temporada');
  assert(catalogSource.includes('{ key: "verano", label: "Verano" }'),
    'Catalogo debe declarar la opcion Verano');
  assert(catalogSource.includes('if (key.includes("verano")) return "verano";'),
    'Catalogo debe normalizar el filtro Verano');
}

(async function main() {
  await testSharedVisibilityAndSearch();
  await testCatalogAndSeasonFilter();
  testDetailAndRelatedGuards();
  console.log('seasonVisibilityTests: passed');
})().catch((error) => {
  console.error('seasonVisibilityTests: failed');
  console.error(error);
  process.exit(1);
});
