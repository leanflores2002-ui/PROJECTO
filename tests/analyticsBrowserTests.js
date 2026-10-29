const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const startServer = require('./helpers/browserServer');
const origin = 'https://romix-ropas.vercel.app';
const product = { id: 'analytics-fixture', name: 'Calza de prueba', type: 'calzas', section: 'mujer', price: 5000, sizes: ['2'], image: 'images/products/calza_termica_lycra_chupin_dama_negro.webp' };
(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      await context.addInitScript(({ product }) => {
        localStorage.setItem('romix.analytics-consent.v1', 'accepted');
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem('romix_cart', JSON.stringify([{ productId: product.id, name: product.name, type: product.type, price: product.price, qty: 1, size: '2', color: 'Negro', image: product.image }]));
          sessionStorage.setItem('seeded', '1');
        }
      }, { product });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'www.googletagmanager.com') return route.fulfill({ contentType: 'application/javascript', body: '/* intercepted; no telemetry */' });
        if (url.hostname === 'wa.me') return route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp interceptado</title>' });
        if (url.origin !== origin) return route.abort();
        if (url.pathname.endsWith('/assets/data/products.json') || url.pathname === '/api/products') return route.fulfill({ json: [product] });
        if (url.pathname === '/api/variants') return route.fulfill({ json: [] });
        return route.fulfill({ response: await context.request.get(server.origin + url.pathname + url.search) });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/cart.html');
      await page.locator('.qty-stepper').waitFor();
      await page.waitForFunction(() => window.romixAnalytics && !document.getElementById('order-btn').disabled);
      await page.locator('.qty-stepper .inc').click();
      await page.locator('.qty-stepper .dec').click();
      await page.evaluate(() => { window.realOpen = window.open; window.open = () => null; });
      await page.locator('#order-btn').click();
      assert.equal(await page.evaluate(() => window.romixCart.getCart().length), 1);
      await page.evaluate(() => { window.open = window.realOpen; });
      const opened = context.waitForEvent('page');
      await page.locator('#order-btn').click();
      const popup = await opened;
      await popup.waitForURL('https://wa.me/**');
      await popup.close();
      const events = await page.evaluate(() => window.dataLayer.filter(command => command[0] === 'event').map(command => ({ name: command[1], data: command[2] })));
      const names = events.map(event => event.name);
      assert.equal(names.filter(name => name === 'view_cart').length, 1, 'Cart rerenders must not create extra visits');
      assert.equal(names.filter(name => name === 'add_to_cart').length, 1);
      assert.equal(names.filter(name => name === 'remove_from_cart').length, 1, 'Successful handoff must not count as removal');
      assert.equal(names.filter(name => name === 'begin_checkout').length, 2, 'Each valid attempt is a checkout start');
      assert.equal(names.filter(name => name === 'whatsapp_order_click').length, 1);
      assert.deepEqual(events.find(event => event.name === 'whatsapp_open_failed').data, { reason: 'popup_blocked' });
      assert.ok(!names.includes('purchase'));
      assert.ok(!JSON.stringify(events).includes('wa.me') && !JSON.stringify(events).includes('?text='));
      assert.equal(events.find(event => event.name === 'whatsapp_order_click').data.value, 5000);
      assert.equal(await page.evaluate(() => window.romixCart.getCart().length), 0);
      assert.deepEqual(errors, []);
      console.log('analyticsBrowserTests: ' + width + 'px passed (real cart interactions, one visit, quantity deltas, blocked popup, successful handoff, no purchase/no telemetry)');
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
