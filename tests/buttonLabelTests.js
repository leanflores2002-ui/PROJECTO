// Browser outcomes replace obsolete assertions about SVG strings in source code.
const assert = require('node:assert/strict');
const { chromium, firefox, webkit } = require('playwright');
const browserServer = require('./helpers/browserServer');
const products = require('../frontend/public/assets/data/products.json');
const product = products.find(item => item.visible !== false);
const engineName = process.env.ROMIX_BROWSER || 'chromium';
const engine = { chromium, firefox, webkit }[engineName];
if (!engine) throw new Error(`Unsupported browser: ${engineName}`);

(async () => {
  const server = await browserServer();
  let browser;
  try {
    browser = await engine.launch();
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      try {
        await context.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== server.origin) return route.fulfill({ status: 200, body: '' });
          if (url.pathname === '/api/products') return route.fulfill({ json: products });
          if (url.pathname === '/api/variants') return route.fulfill({ json: [] });
          if (route.request().method() !== 'GET') throw new Error('Unexpected mutation');
          return route.continue();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        async function checkControls(surface) {
          const controls = page.getByRole('button').or(page.getByRole('link')).or(page.getByRole('tab'));
          for (let index = 0; index < await controls.count(); index++) {
            const control = controls.nth(index);
            if (!await control.isVisible()) continue;
            const snapshot = await control.ariaSnapshot();
            assert.match(snapshot, /^- '?(?:button|link|tab|radio|checkbox|switch|menuitem) "[^"\n]+"/m, `${surface}: unnamed control: ${snapshot}`);
            const text = await control.evaluate(node => {
              const clone = node.cloneNode(true);
              clone.querySelectorAll('svg, [aria-hidden="true"], .sr-only').forEach(child => child.remove());
              return clone.textContent.trim();
            });
            if (!text) {
              if (await control.evaluate(node => node.classList.contains('romix-icon-btn'))) {
                assert.ok(await control.locator('svg:visible, img:visible, [role="img"]:visible').count(), `${surface}: icon control has no rendered visual: ${await control.evaluate(node => node.outerHTML)}`);
              }
              assert.notEqual(await control.getAttribute('tabindex'), '-1', `${surface}: icon-only control excluded from keyboard`);
            }
          }
        }
        for (const route of ['index.html', 'catalogo.html', `product.html?name=${encodeURIComponent(product.name)}`, 'cart.html', 'ayuda.html', '404.html']) {
          await page.goto(server.origin + '/' + route);
          await page.locator('header').waitFor();
          if (route.startsWith('product.')) await page.locator('#btn-add').waitFor();
          await checkControls(route);
          if (route.startsWith('product.')) {
            await page.locator('#size-options button:not([disabled])').first().click();
            await page.locator('#btn-add').focus();
            await page.keyboard.press('Enter');
            await page.locator('.romix-cart-added-panel.is-visible').waitFor();
            await checkControls('added product panel');
          }
          if (route === 'cart.html') {
            await page.locator('.qty-stepper').waitFor();
            await checkControls('cart variant controls');
            const increase = page.getByRole('button', { name: 'Aumentar', exact: true });
            await increase.focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('.qty-stepper input').inputValue(), '2');
            await page.getByRole('button', { name: 'Eliminar', exact: true }).focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('.qty-stepper').count(), 0);
          }
        }
        await page.goto(server.origin + '/index.html');
        const search = page.locator('[data-search-toggle="true"]:visible').first();
        await search.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('#header-search').getAttribute('aria-hidden') === 'false');
        assert.equal(await page.locator('#global-search-form input[name=q]').evaluate(node => node === document.activeElement), true);
        await checkControls('open search');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('#header-search').getAttribute('aria-hidden') === 'true');
        if (width === 390) {
          const menu = page.locator('#toggle-mobile-nav');
          await menu.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.querySelector('#toggle-mobile-nav').getAttribute('aria-expanded') === 'true');
          await checkControls('open mobile menu');
          const focusable = page.locator('#header-mobile-nav a[href]:visible, #header-mobile-nav button:not([disabled]):visible');
          await focusable.last().focus();
          await page.keyboard.press('Tab');
          assert.equal(await focusable.first().evaluate(node => node === document.activeElement), true, 'Tab stays inside the open drawer');
          await page.keyboard.press('Shift+Tab');
          assert.equal(await focusable.last().evaluate(node => node === document.activeElement), true, 'Shift+Tab wraps to the last drawer control');
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => document.querySelector('#toggle-mobile-nav').getAttribute('aria-expanded') === 'false');
          // The drawer restores focus on the next animation frame, after aria-expanded changes.
          await page.waitForFunction(() => document.activeElement === document.querySelector('#toggle-mobile-nav'));
          assert.equal(await menu.evaluate(node => node === document.activeElement), true);
        }
        await page.route('**/qa-catalog-tabs.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Catalog fallback regression</title><div id="catalog-grid"></div><script src="/assets/js/slugify.js"></script><script src="/assets/js/catalog-tabs.js"></script>' }));
        await page.route('**/assets/data/products.json', route => route.fulfill({ json: [{ name: 'Missing photo fixture', section: 'mujer', sizes: ['U'], price: 1000 }] }));
        await page.goto(server.origin + '/qa-catalog-tabs.html');
        await page.locator('#catalog-grid img').waitFor();
        const fallback = page.locator('#catalog-grid img');
        assert.ok((await fallback.getAttribute('src')).startsWith('data:image/svg+xml'));
        await fallback.evaluate(image => image.decode());
        assert.ok(await fallback.evaluate(image => image.naturalWidth > 0));
        assert.deepEqual(errors, []);
        console.log(`buttonLabelTests: ${engineName} ${width}px passed (accessible names, rendered icons, keyboard and focus)`);
      } finally { await context.close(); }
    }
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
