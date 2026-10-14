const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'frontend', 'public');
const pages = [
  'index.html', 'catalogo.html', 'product.html', 'cart.html', 'ayuda.html', '404.html'
];

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function loadScript(relativePath, additions = {}) {
  const window = Object.assign({ addEventListener() {} }, additions.window || {});
  const context = Object.assign({
    window,
    console: { warn() {}, error() {}, log() {} },
    URL,
    Date,
    Error,
    Promise,
    AbortSignal,
    location: { href: 'https://romix.test/catalogo.html' },
    sessionStorage: storage(),
    localStorage: storage(),
    document: { getElementById() { return null; } }
  }, additions);
  context.window.window = context.window;
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
  return context;
}

function checkStaticShells() {
  let canonicalHeader = null;
  let canonicalFooter = null;
  pages.forEach((page) => {
    const html = fs.readFileSync(path.join(publicDir, page), 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    assert(doc.querySelectorAll('.romix-announcement').length === 1, `${page}: announcement must exist in initial HTML`);
    assert(doc.querySelectorAll('header[data-romix-shell="header-v1"]').length === 1, `${page}: one initial header required`);
    assert(doc.querySelectorAll('footer[data-romix-shell="footer-v1"]').length === 1, `${page}: one initial footer required`);
    const announcement = doc.querySelector('.romix-announcement');
    assert(announcement.textContent.replace(/\s+/g, ' ').trim() === 'ENV\u00cdOS Y RETIROS COORDINADOS \u00b7 CONSULT\u00c1 DISPONIBILIDAD', `${page}: announcement copy drifted`);
    assert(announcement.querySelector('strong') == null, `${page}: announcement must not retain the old highlighted word`);
    const headerMarkup = doc.querySelector('header[data-romix-shell="header-v1"]').outerHTML;
    if (canonicalHeader == null) canonicalHeader = headerMarkup;
    else assert(headerMarkup === canonicalHeader, `${page}: header/search markup drifted from the shared shell`);
    assert(doc.querySelectorAll('#header-search').length === 1, `${page}: exactly one global search panel is required`);
    assert(doc.querySelectorAll('#global-search-form').length === 1, `${page}: exactly one global search form is required`);
    assert(doc.querySelectorAll('#global-search-form input[name="q"]').length === 1, `${page}: canonical q input is required`);
    assert(doc.querySelectorAll('.romix-search-clear').length === 1, `${page}: exactly one clear control is required`);
    assert(doc.querySelectorAll('.romix-search-cancel').length === 1, `${page}: exactly one cancel control is required`);
    assert(doc.querySelector('#header-search[aria-hidden="true"]'), `${page}: closed search must be hidden to assistive technology`);
    assert(doc.querySelector('.romix-search-overlay[aria-describedby="romix-search-status"]'), `${page}: search results need a polite status association`);
    const footerMarkup = doc.querySelector('footer[data-romix-shell="footer-v1"]').outerHTML;
    if (canonicalFooter == null) canonicalFooter = footerMarkup;
    else assert(footerMarkup === canonicalFooter, `${page}: footer markup drifted from the shared shell`);
    assert(html.includes('ROMIX:SHELL:HEADER:START'), `${page}: header sync marker missing`);
    assert(html.includes('ROMIX:SHELL:FOOTER:START'), `${page}: footer sync marker missing`);
    assert(!/romix-(?:minimal-theme|footer)\.js|include-header\.js/.test(html), `${page}: removed runtime shell script referenced`);
    assert(!/<i\s+class=["'][^"']*fa/i.test(html), `${page}: unstable Font Awesome placeholder remains`);
    assert(doc.querySelectorAll('title').length === 1, `${page}: exactly one title is required`);
    assert((doc.documentElement.getAttribute('lang') || '').toLowerCase().startsWith('es'), `${page}: Spanish lang is required`);
    const baseStyles = doc.querySelectorAll('link[data-romix-shell-critical]');
    assert(baseStyles.length === 1, `${page}: one shared base stylesheet required`);
    assert(baseStyles[0].getAttribute('href') === 'assets/css/romix-shell-base.css?v=18', `${page}: shared base stylesheet path drifted`);
    assert(!doc.querySelector('style[data-romix-shell-critical]'), `${page}: shared base styles must not be duplicated inline`);
    assert(doc.querySelector('link[rel="stylesheet"][href^="assets/css/"]') === baseStyles[0], `${page}: base styles must precede other local styles`);
    assert(fs.existsSync(path.join(publicDir, 'assets/css/romix-shell-base.css')), `${page}: base stylesheet missing`);
    const stylesheetHrefs = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map((link) => link.getAttribute('href') || '');
    assert(/assets\/css\/romix-footer\.css/.test(stylesheetHrefs[stylesheetHrefs.length - 1] || ''), `${page}: shared footer CSS must be the final stylesheet`);
    const ids = Array.from(doc.querySelectorAll('[id]')).map((element) => element.id);
    assert(new Set(ids).size === ids.length, `${page}: duplicate IDs detected`);

    doc.querySelectorAll('a[href]').forEach((link) => {
      const href = String(link.getAttribute('href') || '').trim();
      if (!href || /^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) return;
      const resolved = new URL(href, `https://romix.test/${page}`);
      const targetName = decodeURIComponent(resolved.pathname.replace(/^\/+/, '')) || 'index.html';
      const targetPath = path.join(publicDir, targetName);
      assert(fs.existsSync(targetPath), `${page}: broken internal link ${href}`);
      if (resolved.hash && targetName.endsWith('.html')) {
        const targetHtml = fs.readFileSync(targetPath, 'utf8');
        const targetDom = new JSDOM(targetHtml);
        const targetId = decodeURIComponent(resolved.hash.slice(1));
        assert(targetDom.window.document.getElementById(targetId), `${page}: missing anchor ${href}`);
        targetDom.window.close();
      }
    });
    dom.window.close();
  });

  const notFound = new JSDOM(fs.readFileSync(path.join(publicDir, '404.html'), 'utf8'));
  const robots = notFound.window.document.querySelector('meta[name="robots"]');
  assert(robots && /noindex/i.test(robots.content), '404 page must remain noindex');
  notFound.window.close();

  const headerJs = read('frontend/public/assets/js/romix-header.js');
  const cartHtml = read('frontend/public/cart.html');
  assert(!headerJs.includes('replaceWith('), 'Header must enhance, never replace, the initial shell');
  assert(!headerJs.includes('bindMobileAutoHide'), 'Jitter-prone mobile auto-hide must stay removed');
  assert(!cartHtml.includes('inventory.updateStock('), 'The browser must not mutate commercial stock during checkout');
  assert(cartHtml.includes('inventory.syncFromApi()'), 'Cart must request authoritative stock before ordering');
  assert(!fs.existsSync(path.join(publicDir, 'assets/js/romix-minimal-theme.js')), 'Global runtime restyler must remain removed');
  assert(!fs.existsSync(path.join(publicDir, 'assets/js/romix-footer.js')), 'Runtime footer rebuilder must remain removed');

  const headerCss = read('frontend/public/assets/css/romix-header.css');
  const footerCss = read('frontend/public/assets/css/romix-footer.css');
  const themeCss = read('frontend/public/assets/css/romix-minimal-theme.css');
  assert((headerCss.match(/!important/g) || []).length === 0, 'Header CSS should not restart the specificity war');
  assert((headerCss.match(/Global ROMIX predictive search: canonical component styles/g) || []).length === 1, 'Header CSS must have one canonical predictive-search section');
  assert(footerCss.includes('--romix-footer-bg: var(--romix-ink)'), 'Footer CSS must preserve the shared charcoal background token');
  assert(!/(?:product-detail-page|catalog-page)[^{]*\.site-footer/.test(footerCss), 'Footer CSS must not contain page-specific variants');
  assert(!themeCss.includes('.site-footer'), 'Theme CSS must not redefine the shared footer');
  assert(!themeCss.includes('.romix-search'), 'Theme CSS must not redefine the global predictive search');
  assert((themeCss.match(/!important/g) || []).length === 0, 'Theme CSS should not restart the specificity war');
}

async function checkProductsStore() {
  const calls = [];
  const context = loadScript('frontend/public/assets/js/products-store.js', {
    fetch: async (url) => {
      calls.push(String(url));
      if (String(url) === '/api/products') return { ok: false, status: 503 };
      return { ok: true, text: async () => JSON.stringify([{ id: 'p1', name: 'Remera', sizes: ['S'] }]) };
    }
  });
  const list = await context.window.romixProductsStore.load({ force: true });
  assert(calls.length === 2 && calls[0] === '/api/products' && calls[1].includes('assets/data/products.json'), 'Admin-managed storefront must prioritize API and recover with JSON when unavailable');

  assert(list[0].sizes[0].status === 'unknown', 'Primitive sizes must not invent availability');
  assert(context.window.romixProductsStore.getStatus().source === 'json', 'Fallback source must be observable');

  const emptyContext = loadScript('frontend/public/assets/js/products-store.js', {
    fetch: async () => ({ ok: true, json: async () => [] })
  });
  const empty = await emptyContext.window.romixProductsStore.load({ force: true, useApi: true });
  assert(Array.isArray(empty) && empty.length === 0, 'An authoritative empty API response is valid');
  assert(emptyContext.window.romixProductsStore.getStatus().source === 'api', 'Empty API response must remain authoritative');

  const cachedPayload = JSON.stringify({
    version: 8,
    timestamp: Date.now(),
    source: 'json',
    list: [{ id: 'cached', name: 'Producto cacheado', sizes: ['M'] }]
  });
  const offlineContext = loadScript('frontend/public/assets/js/products-store.js', {
    sessionStorage: storage({ romixProductsCacheV8: cachedPayload }),
    fetch: async () => { throw new Error('offline'); }
  });
  const cached = await offlineContext.window.romixProductsStore.load({ force: true });
  assert(cached.length === 1 && cached[0].id === 'cached', 'Validated session cache must be the last offline fallback');
  assert(offlineContext.window.romixProductsStore.getStatus().stale === true, 'Offline cache must be explicitly marked stale');
}

async function checkInventoryContract() {
  const context = loadScript('frontend/public/assets/js/inventory.js', {
    fetch: async () => ({
      ok: true,
      json: async () => [{ product_id: 'p1', color: 'Negro', size: 'S', stock: 3 }]
    })
  });
  const inventory = context.window.romixInventory;
  assert(inventory.getStock('p1', 'Negro', 'S') === 'unknown', 'Unsynced local storage must never be authoritative');
  const result = await inventory.syncFromApi();
  assert(result.ok === true, 'Inventory sync should accept the backend contract');
  assert(inventory.getStock('p1', 'Negro', 'S') === 3, 'product_id must normalize to productId');
  assert(inventory.getStock('missing', 'Negro', 'S') === 'unknown', 'Missing variants must remain neutral');

  const offlineContext = loadScript('frontend/public/assets/js/inventory.js', {
    fetch: async () => { throw new Error('offline'); }
  });
  const offlineInventory = offlineContext.window.romixInventory;
  const offlineResult = await offlineInventory.syncFromApi();
  assert(offlineResult.ok === false, 'Inventory outage must be recoverable');
  assert(offlineInventory.getStock('p1', 'Negro', 'S') === 'unknown', 'Inventory outage must never expose cached stock as authoritative');
}

function checkCartStorageSync() {
  const dom = new JSDOM('<!doctype html><html><body><span id="cart-count">0</span></body></html>', {
    runScripts: 'outside-only',
    url: 'https://romix.test/cart.html'
  });
  dom.window.localStorage.setItem('romix_cart', '{corrupt');
  dom.window.eval(read('frontend/public/assets/js/romix-icons.js'));
  dom.window.eval(read('frontend/public/assets/js/cart.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  assert(dom.window.document.getElementById('cart-count').textContent === '0', 'Corrupt cart storage must recover safely');

  dom.window.localStorage.setItem('romix_cart', JSON.stringify([{ productId: 'p1', color: 'Negro', size: 'S', qty: 2, price: 10 }]));
  dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: 'romix_cart' }));
  assert(dom.window.document.getElementById('cart-count').textContent === '2', 'Cross-tab storage event must refresh the cart badge');
  dom.window.close();
}

(async function main() {
  checkStaticShells();
  await checkProductsStore();
  await checkInventoryContract();
  checkCartStorageSync();
  console.log('storefrontStabilityTests: passed');
})().catch((error) => {
  console.error('storefrontStabilityTests: failed');
  console.error(error);
  process.exit(1);
});
