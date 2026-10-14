const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const fixtures = [
  { id: 'mujer-lycra', name: 'Campera lycra mujer', section: 'mujer', type: 'camperas', featured: true, badge: 'Novedad', price: 10000, image: 'images/logo-romix.png', colors: [{ name: 'Negro', image: 'images/logo-romix.png' }], sizes: ['2'] },
  { id: 'hombre-oferta', name: 'Remera oferta hombre', section: 'hombre', type: 'remeras', featured: false, badge: 'Oferta', price: 9000, image: 'images/logo-romix.png', colors: [{ name: 'Azul', image: 'images/logo-romix.png' }], sizes: ['1'] },
  { id: 'nino-buzo', name: 'Buzo niño', section: 'ninos', type: 'buzos', featured: false, price: 8000, image: 'images/logo-romix.png', colors: [{ name: 'Rojo', image: 'images/logo-romix.png' }], sizes: ['3'] }
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
    load: async () => fixtures,
    isVisible: (item) => !!item && item.visible !== false
  };
  window.romixCart = { updateBadge() {} };
  window.eval(readPublic('assets/js/catalog-sections.js'));
  window.eval(readPublic('assets/js/romix-catalog-pages.js'));
  if (window.document.readyState === 'loading') {
    await new Promise((resolve) => window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  } else {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }
  await new Promise((resolve) => window.setTimeout(resolve, 25));
  return window;
}

function names(window) {
  return Array.from(window.document.querySelectorAll('#product-grid .product-card .product-name'))
    .map((element) => element.textContent.trim());
}

async function checkRoute(url, expectedNames, expectedHeading, expectedDocumentTitle) {
  const window = await renderCatalog(url);
  assert(JSON.stringify(names(window)) === JSON.stringify(expectedNames), `${url}: resultado de catálogo inesperado`);
  assert(window.document.getElementById('page-title').textContent.trim() === expectedHeading, `${url}: título visible inesperado`);
  assert(window.document.title === expectedDocumentTitle, `${url}: document.title inesperado`);
  window.close();
}

async function main() {
  await checkRoute('http://localhost/catalogo.html', ['Campera lycra mujer', 'Remera oferta hombre', 'Buzo niño'], 'Catálogo ROMIX', 'ROMIX - Catálogo');
  await checkRoute('http://localhost/catalogo.html?sections=mujer', ['Campera lycra mujer'], 'Mujer', 'ROMIX - Mujer');
  await checkRoute('http://localhost/catalogo.html?sections=hombre', ['Remera oferta hombre'], 'Hombre', 'ROMIX - Hombre');
  await checkRoute('http://localhost/catalogo.html?sections=ninos', ['Buzo niño'], 'Niños', 'ROMIX - Niños');
  await checkRoute('http://localhost/catalogo.html?view=novedades', ['Campera lycra mujer'], 'Novedades', 'ROMIX - Novedades');
  await checkRoute('http://localhost/catalogo.html?q=oferta', ['Remera oferta hombre'], 'Catálogo ROMIX', 'ROMIX - Catálogo');
  await checkRoute('http://localhost/catalogo.html?sections=mujer&q=lycra', ['Campera lycra mujer'], 'Mujer', 'ROMIX - Mujer');
  await checkRoute('http://localhost/catalogo.html?view=novedades&q=lycra', ['Campera lycra mujer'], 'Novedades', 'ROMIX - Novedades');

  const redirects = readPublic('../../netlify.toml');
  for (const [legacy, target] of [
    ['mujer.html', 'mujer/'],
    ['hombre.html', 'hombre/'],
    ['ninos.html', 'ninos/'],
    ['novedades.html', 'catalogo.html?view=novedades'],
    ['detalle.html', 'product.html']
  ]) {
    assert(redirects.includes(`from = "/${legacy}"`), `Falta redirect permanente para ${legacy}`);
    assert(redirects.includes(`to = "/${target}"`), `Redirect incorrecto para ${legacy}`);
  }

  for (const legacy of ['mujer.html', 'hombre.html', 'ninos.html', 'novedades.html', 'detalle.html']) {
    assert(!fs.existsSync(path.join(PUBLIC_DIR, legacy)), `${legacy} no debe seguir publicado`);
  }

  console.log('Catalog route tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
