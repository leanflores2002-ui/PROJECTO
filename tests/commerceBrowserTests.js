const assert = require('node:assert/strict');
const { chromium, firefox, webkit } = require('playwright');
const browserName = process.env.ROMIX_BROWSER || 'chromium';
const engine = { chromium, firefox, webkit }[browserName];
if (!engine) throw new Error(`Unsupported browser: ${browserName}`);
const browserServer = require('./helpers/browserServer');
const path = require('node:path');
const os = require('node:os');
const fixture = { id: 'qa-shirt', name: 'Remerón algodón & más', section: 'mujer', type: 'remeras', season: 'verano', price: 5000,
  priceByGroup: { common: 5000, special: 6000 }, specialSizes: [6], sizes: ['2', '6'],
  image: 'images/products/calza_termica_lycra_chupin_dama_negro.webp', colors: [{ name: 'Azul', hex: '#0000ff', image: 'images/products/calza_termica_lycra_chupin_dama_negro.webp' }, { name: 'Rojo', hex: '#ff0000', image: 'images/products/calza_termica_lycra_chupin_dama_negro.webp' }] };

async function run(context, origin, width) {
  const errors = [], destinations = [];
  let products = [fixture];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      destinations.push(url.href);
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Intercepted external destination</title>' });
    }
    if (url.pathname === '/api/products' || url.pathname.endsWith('/assets/data/products.json')) return route.fulfill({ json: products });
    if (url.pathname === '/api/variants') return route.fulfill({ json: [] });
    if (route.request().method() !== 'GET') throw new Error('Unexpected mutation: ' + url);
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  async function health(surface) {
    assert.ok((await page.locator('body').textContent()).trim().length > 100);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${surface}: overflow at ${width}`);
    const broken = await page.locator('img:visible').evaluateAll(async images => {
      const visible = images.filter(image => image.getBoundingClientRect().top < innerHeight && image.getBoundingClientRect().bottom > 0);
      await Promise.all(visible.map(image => image.decode().catch(() => {})));
      return visible.filter(image => !image.naturalWidth).map(image => image.currentSrc || image.src);
    });
    assert.deepEqual(broken, [], `${surface}: broken visible images`);
    if (process.env.ROMIX_SCREENSHOTS) {
      await page.screenshot({ path: path.join(process.env.ROMIX_SCREENSHOTS === '1' ? os.tmpdir() : process.env.ROMIX_SCREENSHOTS, `romix-${surface}-${width}.png`) });
    }
  }
  await page.goto(`${origin}/product.html?id=qa-shirt`);
  await page.locator('#btn-add').waitFor();
  await health('product');
  assert.ok((await page.locator('#main-image').getAttribute('src')).includes('calza_termica'), 'Product image must not silently become a placeholder');
  assert.match(await page.title(), /Remer/);
  const text = new URL(await page.locator('#btn-share-whatsapp').getAttribute('href')).searchParams.get('text');
  assert.ok(text.includes(fixture.name) && text.includes('$5.000') && text.includes('$6.000'));
  assert.ok(text.includes(origin + '/share/'), 'Shared URL preserves current navigation origin');
  assert.ok((await page.locator('link[rel=canonical]').getAttribute('href')).startsWith('https://romix-ropas.vercel.app/'));
  assert.equal(new URL(await page.locator('#btn-share-email').getAttribute('href')).searchParams.get('body'), text);
  const telegram = new URL(await page.locator('#btn-share-telegram').getAttribute('href'));
  assert.equal(telegram.searchParams.get('text') + '\n\n' + telegram.searchParams.get('url'), text);
  assert.equal(await page.locator('#btn-share-native').isVisible(), false);
  // Clipboard fallback: execute the browser's real copy command, record the selected content.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const copy = document.execCommand.bind(document);
    document.execCommand = command => {
      window.copiedText = document.activeElement.value;
      return copy(command);
    };
  });
  await page.locator('#btn-share-copy').click();
  assert.equal(await page.evaluate(() => window.copiedText), text);
  assert.equal(await page.locator('#btn-share-copy').evaluate(node => node === document.activeElement), true);
  await page.evaluate(() => {
    navigator.share = async payload => { window.sharedPayload = payload; throw new DOMException('cancelled', 'AbortError'); };
  });
  // Reload initializes capability-dependent controls. Install the browser API before scripts execute.
  await page.addInitScript(() => {
    navigator.share = async payload => { window.sharedPayload = payload; throw new DOMException('cancelled', 'AbortError'); };
  });
  await page.reload();
  await page.locator('#btn-share-native').click();
  const payload = await page.evaluate(() => window.sharedPayload);
  assert.equal(payload.text, text);
  assert.equal(payload.url, undefined);
  assert.equal(await page.locator('#romix-toast.romix-toast--success').count(), 0, 'Cancellation has no success toast');
  await page.evaluate(() => { navigator.share = async () => { throw new Error('share unavailable'); }; });
  await page.locator('#btn-share-native').click();
  await page.locator('#romix-toast.romix-toast--error').waitFor();
  assert.match(await page.locator('#romix-toast').textContent(), /No se pudo/);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.clipboardText = value; } } });
  });
  await page.locator('#btn-share-copy').click();
  assert.equal(await page.evaluate(() => window.clipboardText), text);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('denied'); }; });
  await page.locator('#btn-share-copy').click();
  await page.locator('#romix-toast.romix-toast--error').waitFor();
  assert.match(await page.locator('#romix-toast').textContent(), /No se pudo copiar/);
  await page.getByRole('button', { name: 'Elegir color Rojo', exact: true }).click();
  await page.locator('#size-options button').filter({ hasText: /^6$/ }).click();
  await page.locator('#btn-add').click();
  const cart = await page.evaluate(() => window.romixCart.getCart());
  assert.equal(cart.length, 1);
  assert.equal(cart[0].size, '6');
  assert.equal(cart[0].color, 'Rojo');
  assert.equal(cart[0].price, 6000);
  await page.goto(origin + '/cart.html');
  await page.locator('.qty-stepper').waitFor();
  await health('cart');
  await page.locator('.qty-stepper .inc').click();
  assert.equal(await page.locator('.qty-stepper input').inputValue(), '2');
  await page.evaluate(() => {
    window.realStock = window.romixInventory.getStock;
    window.romixInventory.getStock = () => 0;
  });
  const countBeforeValidation = context.pages().length;
  await page.locator('#order-btn').click();
  assert.equal(context.pages().length, countBeforeValidation);
  assert.equal(await page.evaluate(() => window.romixCart.getCart()[0].qty), 2);
  await page.evaluate(() => { window.romixInventory.getStock = window.realStock; });
  // Failure injection verifies recovery only; successful opening below uses a real browser window.
  await page.evaluate(() => { window.realOpen = window.open; window.open = () => null; });
  await page.locator('#order-btn').click();
  assert.equal(await page.locator('#order-btn').isEnabled(), true);
  assert.equal(await page.evaluate(() => window.romixCart.getCart()[0].qty), 2);
  await page.evaluate(() => { window.open = () => { throw new DOMException('denied', 'SecurityError'); }; });
  await page.locator('#order-btn').click();
  assert.equal(await page.locator('#order-btn').isEnabled(), true);
  assert.equal(await page.evaluate(() => window.romixCart.getCart()[0].qty), 2);
  await page.evaluate(() => { window.open = window.realOpen; });
  const popupPromise = context.waitForEvent('page');
  await page.locator('#order-btn').click();
  const popup = await popupPromise;
  await popup.waitForURL('https://wa.me/**');
  const message = new URL(popup.url()).searchParams.get('text');
  assert.ok(message.includes(fixture.name) && message.includes('Color: Rojo') && message.includes('Talle: 6') && message.includes('Cant: 2'));
  assert.ok(!message.includes('$') && !message.includes('Total'));
  assert.equal(await popup.evaluate(() => window.opener === null), true);
  await popup.close();
  assert.equal(await page.evaluate(() => window.romixCart.getCart().length), 0);
  const pagesBefore = context.pages().length;
  await page.evaluate(() => window.orderCartWhatsApp());
  assert.equal(context.pages().length, pagesBefore, 'Empty cart cannot open another window');
  await page.goto(origin + '/catalogo.html?q=REMERON');
  await page.setViewportSize({ width: width + 1, height: 900 });
  await page.setViewportSize({ width, height: 900 });
  await page.waitForFunction(() => {
    const panel = document.getElementById('filters-sidebar');
    return panel && panel.inert === (innerWidth <= 960) && panel.getAttribute('aria-hidden') === String(innerWidth <= 960);
  });

  await page.locator('#product-grid a[href^="/productos/"]').first().waitFor();
  await health('catalog');
  assert.ok((await page.locator('#product-grid').textContent()).includes(fixture.name), 'Search ignores case and accents');
  const openFilters = page.locator(width < 768 ? '#catalog-mobile-filter-trigger' : '#open-filters');
  if (await openFilters.isVisible()) {
    await openFilters.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement === document.querySelector('#close-filters'));
  }
  await page.locator('#price-min').fill('9000');
  await page.locator('#apply-price-filter').click();
  await page.waitForFunction(() => !document.querySelector('#product-grid a[href^="/productos/"]'));
  await page.locator('#clear-filters').click();
  await page.locator('#product-grid a[href^="/productos/"]').first().waitFor();
  products = Array.from({ length: 30 }, (_, index) => ({ ...fixture, id: `catalog-${index}`, name: `Remerón ${index}`, price: 4000 + index * 100,
    section: index < 20 ? 'mujer' : 'hombre', sizes: index < 20 ? ['6'] : ['2'],
    colors: [fixture.colors[index < 20 ? 1 : 0]] }));
  products.push({ ...fixture, id: 'hidden-qa', name: 'Oculto QA', visible: false });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(origin + '/catalogo.html');
  await page.locator('#catalog-load-more-btn').waitFor();
  const initialCount = await page.locator('#product-grid .product-card').count();
  await page.locator('#catalog-load-more-btn').click();
  assert.ok(await page.locator('#product-grid .product-card').count() > initialCount);
  while (await page.locator('#catalog-load-more-btn').isVisible()) await page.locator('#catalog-load-more-btn').click();
  assert.equal(await page.locator('#product-grid .product-card').count(), products.filter(product => product.visible !== false).length);
  assert.ok(!(await page.locator('#product-grid').textContent()).includes('Oculto QA'));
  if (width < 768) {
    await page.locator('#catalog-mobile-filter-trigger').click();
    await page.waitForFunction(() => document.activeElement === document.querySelector('#close-filters'));
  }
  for (const [group, value] of [['sections', 'mujer'], ['categories', 'remeras'], ['sizes', '6'], ['colors', 'rojo']]) {
    const input = page.locator(`.filters-sidebar input[data-group="${group}"][value="${value}"]`);
    await input.focus();
    await page.keyboard.press('Space');
    assert.equal(await input.isChecked(), true, `Keyboard must select ${group}=${value}`);
  }
  await page.locator('#price-max').fill('4400');
  await page.locator('#apply-price-filter').click();
  assert.equal(await page.locator('#product-grid .product-card').count(), 5, 'Combined filters intersect');
  const sort = page.locator('[data-sort-control="true"]:visible').first();
  await sort.selectOption('price-desc');
  const firstName = await page.locator('#product-grid .product-card').first().textContent();
  assert.ok(firstName.includes('Remerón 4'), 'Descending price puts the highest matching price first');
  await page.locator('#clear-filters').click();
  if (width < 768) {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('filters-open'));
    // Closing restores focus in requestAnimationFrame; observe that completed state.
    await page.waitForFunction(() => document.activeElement === document.querySelector('#catalog-mobile-filter-trigger'));
    assert.equal(await page.locator('#catalog-mobile-filter-trigger').evaluate(node => node === document.activeElement), true);
  }
  assert.ok(!destinations.some(url => /google-analytics|googletagmanager/.test(url)), 'Localhost sends no analytics');
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Catalog overflow at ${width}`);
  await page.goto(origin + '/index.html');
  await page.locator('#productsRow .product-card').first().waitFor();
  assert.equal(await page.locator('main.home > section').first().evaluate(node => node.classList.contains('video-hero')), true, 'Video must be the main banner');
  assert.ok(await page.locator('#mainImageCarousel figure.is-active').getAttribute('class').then(value => value.includes('slide--lycra')), 'Outlet must be the first campaign');
  assert.equal(await page.locator('#mainImageCarousel figure.is-active img').getAttribute('loading'), 'lazy', 'Lower carousel must not compete with the video poster');
  assert.equal(await page.locator('.video-hero__poster img').getAttribute('fetchpriority'), 'high', 'Video poster must load with priority');
  assert.equal(await page.locator('.campaign-hero img').getAttribute('loading'), 'lazy', 'Lower campaign must not compete with the main banner');
  assert.equal((await page.locator('#campaign-title').innerText()).replace(/\s+/g, ' '), 'TU ESTILO. EN MOVIMIENTO.');
  assert.equal(await page.locator('.campaign-hero__cta').getAttribute('href'), 'catalogo.html');
  assert.equal(await page.locator('#productsRow .product-card').count(), width <= 760 ? 4 : 12, 'Home keeps its existing initial product limits');
  assert.ok(!(await page.locator('#productsRow').textContent()).includes('Oculto QA'));
  assert.equal(await page.locator('#promoCarouselWrap').count(), 0, 'Removed seasonal campaign must not return to home');
  await health('home');
  await page.locator('.campaign-hero__cta').click();
  await page.locator('#product-grid .product-card').first().waitFor();
  assert.equal(new URL(page.url()).pathname, '/catalogo.html');
  assert.deepEqual(errors, []);
  assert.ok(!destinations.some(url => /google-analytics|googletagmanager/.test(url)), 'Home sends no real analytics');
  console.log(`commerceBrowserTests: ${width}px passed (real intercepted popup)`);
}

(async () => {
  const server = await browserServer();
  let browser;
  try {
    browser = await engine.launch();
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      try { await run(context, server.origin, width); } finally { await context.close(); }
    }
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
