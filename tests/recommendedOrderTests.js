const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'frontend', 'public');

function readPublic(relativePath) {
  return fs.readFileSync(path.join(publicDir, relativePath), 'utf8');
}

function loadRecommendedOrder() {
  const window = {};
  vm.runInNewContext(readPublic('assets/js/catalog-relevance-order.js'), { window, Object, Array, String, Number });
  return window;
}

function ids(list) {
  return list.map((product) => product.id);
}

function normalizeSeason(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_]+/g, '-');
}

function checkPriorityIsMonotonic(list, api, scope) {
  const seasonOrder = ['media-estacion', 'verano'];
  const config = api.RECOMMENDED_ORDER;
  let previousSeasonRank = -1;
  const previousCategoryRank = new Map();

  list.forEach((product) => {
    const season = normalizeSeason(product.seasonKey || product.season);
    const foundSeasonRank = seasonOrder.indexOf(season);
    const seasonRank = foundSeasonRank < 0 ? seasonOrder.length : foundSeasonRank;
    assert(seasonRank >= previousSeasonRank, `${scope}: las temporadas deben mantener la prioridad recomendada`);
    previousSeasonRank = seasonRank;

    const categoryOrder = config[season] || [];
    const category = api.normalizeRecommendedCategory(product);
    const foundCategoryRank = categoryOrder.indexOf(category);
    const categoryRank = foundCategoryRank < 0 ? categoryOrder.length : foundCategoryRank;
    const previous = previousCategoryRank.has(season) ? previousCategoryRank.get(season) : -1;
    assert(categoryRank >= previous, `${scope}: ${season} no respeta la prioridad de categorías`);
    previousCategoryRank.set(season, categoryRank);
  });
}

function testConfiguredPriorities(api) {
  assert.deepStrictEqual(Array.from(api.RECOMMENDED_ORDER['media-estacion']), ['calzas', 'pantalones', 'camperas']);
  assert.deepStrictEqual(Array.from(api.RECOMMENDED_ORDER.verano), ['capris', 'ciclistas', 'shorts', 'tops', 'pantalones']);
}

function testMediaEstacion(api) {
  const source = [
    { id: 'campera', season: 'Media estación', type: 'camperas' },
    { id: 'otro', season: 'media-estacion', type: 'buzos' },
    { id: 'pantalon', season: 'media estación', type: 'joggers' },
    { id: 'calza-1', season: 'media-estacion', type: 'calzas' },
    { id: 'calza-2', season: 'Media estación', name: 'Calza Oxford' }
  ];
  assert.deepStrictEqual(ids(api.recommendedSort(source)), ['calza-1', 'calza-2', 'pantalon', 'campera', 'otro']);
}

function testVerano(api) {
  const source = [
    { id: 'pantalon', season: 'verano', type: 'palazos' },
    { id: 'top', season: 'verano', category: 'tops' },
    { id: 'short', season: 'verano', type: 'shorts' },
    { id: 'bermuda', season: 'verano', type: 'bermudas' },
    { id: 'ciclista', season: 'verano', type: 'biker' },
    { id: 'capri', season: 'verano', type: 'calza capri' }
  ];
  const result = api.recommendedSort(source);
  assert.deepStrictEqual(ids(result), ['capri', 'ciclista', 'short', 'top', 'pantalon', 'bermuda']);
  assert.strictEqual(result.length, source.length, 'El sort no debe duplicar productos');
  assert.strictEqual(new Set(result).size, source.length, 'Cada producto debe conservar una única referencia');
  assert.strictEqual(api.normalizeRecommendedCategory(source[3]), '', 'Bermudas no deben asumirse equivalentes a shorts');
}

function testStructuredDataAndStableOrder(api) {
  assert.strictEqual(
    api.normalizeRecommendedCategory({ type: 'tops', category: 'calzas', name: 'Capri engañoso' }),
    'tops',
    'type debe tener prioridad sobre category y name'
  );
  assert.strictEqual(api.normalizeRecommendedCategory({ category: 'pantalones', name: 'Top engañoso' }), 'pantalones');
  assert.strictEqual(api.normalizeRecommendedCategory({ name: 'Calza Lycra Oxford' }), 'calzas');

  const stable = [
    { id: 'calza-b', season: 'media-estacion', type: 'calzas' },
    { id: 'calza-a', season: 'media-estacion', type: 'calzas' },
    { id: 'calza-c', season: 'media-estacion', type: 'calzas' }
  ];
  assert.deepStrictEqual(ids(api.recommendedSort(stable)), ids(stable), 'Empates deben preservar el orden original');

  const seasons = [
    { id: 'invierno', season: 'invierno', type: 'calzas' },
    { id: 'verano', season: 'verano', type: 'capri' },
    { id: 'media', season: 'media estación', type: 'calzas' }
  ];
  assert.deepStrictEqual(ids(api.recommendedSort(seasons)), ['media', 'verano', 'invierno']);
}

function testRealCatalogs(api) {
  const products = JSON.parse(readPublic('assets/data/products.json')).filter((product) => product && product.visible !== false);
  const scopes = {
    Todos: products,
    Mujer: products.filter((product) => product.section === 'mujer'),
    Hombre: products.filter((product) => product.section === 'hombre'),
    Niños: products.filter((product) => product.section === 'ninos')
  };
  const featured = products.filter((product) => product.featured === true);
  scopes.Novedades = featured.length ? featured : products.slice(0, 20);

  Object.entries(scopes).forEach(([scope, source]) => {
    const result = api.recommendedSort(source);
    assert.strictEqual(result.length, source.length, `${scope}: no debe perder productos`);
    assert.strictEqual(new Set(result).size, source.length, `${scope}: no debe duplicar productos`);
    checkPriorityIsMonotonic(result, api, scope);
  });
}

function testInitialMarkupAndIntegration() {
  const pages = ['catalogo.html'];
  pages.forEach((page) => {
    const dom = new JSDOM(readPublic(page));
    const document = dom.window.document;
    const desktop = document.getElementById('products-sort');
    const mobile = document.getElementById('products-sort-mobile');
    assert(desktop && desktop.value === 'recommended', `${page}: desktop debe iniciar en Recomendados`);
    assert(mobile && mobile.value === 'recommended', `${page}: mobile debe iniciar en Recomendados`);
    assert.strictEqual(desktop.options.length, 3, `${page}: no debe perder opciones de orden`);
    const scripts = Array.from(document.querySelectorAll('script[src]')).map((script) => script.getAttribute('src'));
    const relevanceIndex = scripts.findIndex((src) => src.includes('catalog-relevance-order.js'));
    const catalogIndex = scripts.findIndex((src) => src.includes('romix-catalog-pages.js'));
    assert(relevanceIndex >= 0 && relevanceIndex < catalogIndex, `${page}: el motor recomendado debe cargar antes del catálogo`);
    dom.window.close();
  });

  const catalogSource = readPublic('assets/js/romix-catalog-pages.js');
  assert(catalogSource.includes('state.sortBy = readInitialSortKey();'), 'El catálogo debe leer el sort inicial antes de vincular controles');
  assert(catalogSource.includes('params.get("sort") || params.get("order")'), 'Deben respetarse sort y order de la URL');
  assert(catalogSource.includes('state.view = window.recommendedSort(state.view);'), 'Recomendados debe usar el motor global');
}

(function main() {
  const api = loadRecommendedOrder();
  testConfiguredPriorities(api);
  testMediaEstacion(api);
  testVerano(api);
  testStructuredDataAndStableOrder(api);
  testRealCatalogs(api);
  testInitialMarkupAndIntegration();
  console.log('recommendedOrderTests: passed');
})();
