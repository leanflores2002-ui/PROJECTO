const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const path = require('node:path');
const os = require('node:os');
const browserServer = require('./helpers/browserServer');
const products = require('../frontend/public/assets/data/products.json');
const {detailHref, productSlug} = require('../frontend/public/assets/js/product-url');
const origin = require('../config/site.json').origin;
(async () => {
  const server = await browserServer();
  let browser;
  try {
    browser = await chromium.launch();
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport: {width, height: 900}});
      const errors = [];
      await context.route('**/*', route => new URL(route.request().url()).origin === server.origin
        ? route.continue() : route.fulfill({status: 200, body: ''}));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (['warning', 'error'].includes(message.type()) && /srcset/i.test(message.text())) errors.push(message.text());
      });
      for (const section of ['mujer', 'hombre', 'ninos']) {
        const product = products.find(p => p.visible !== false && p.section === section);
        await page.goto(server.origin + `/${section}/`);
        await page.locator('#products-summary').filter({hasText: /Mostrando/}).waitFor();
        const link = page.locator('#product-grid a[href^="/productos/"]').first();
        await link.waitFor();
        const destination = await link.getAttribute('href');
        const selected = products.find(p => detailHref(p) === destination);
        assert(selected, `Unknown canonical product link: ${destination}`);
        await link.click();
        await page.locator('#btn-add').waitFor();
        assert.equal(new URL(page.url()).pathname, detailHref(selected));
        assert.equal(await page.locator('h1:visible').textContent(), selected.name);
        assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), origin + detailHref(selected));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const whatsapp = new URL(await page.locator('#btn-share-whatsapp').getAttribute('href'));
        assert(whatsapp.searchParams.get('text').includes(`/share/${productSlug(selected)}/`));
        await page.locator('#size-options button:not([disabled])').first().click();
        await page.locator('#btn-add').click();
        assert((await page.evaluate(() => window.romixCart.getCart())).length > 0);
        await page.screenshot({path: path.join(os.tmpdir(), `romix-seo-${section}-${width}.png`)});
        // Reload also verifies that the existing cart persists; purchase debounce resets.
        await page.reload();
        await page.locator('#btn-buy').waitFor();
        await page.locator('#size-options button:not([disabled])').first().click();
        await page.locator('#btn-buy').click();
        await page.locator('.qty-stepper').first().waitFor();
        assert.equal(new URL(page.url()).pathname, '/cart.html', 'Buy now must resolve from nested product routes');
        // A legacy URL with redundant parameters must resolve to the same canonical.
        await page.goto(server.origin + `/product.html?id=${encodeURIComponent(productSlug(product))}&name=duplicado&utm_source=qa`);
        await page.locator('#btn-add').waitFor();
        assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), origin + detailHref(product));
      }
      assert.deepEqual(errors, []);
      await context.close();
      const nojs = await browser.newContext({javaScriptEnabled: false, viewport: {width, height: 900}});
      const staticPage = await nojs.newPage();
      for (const section of ['mujer', 'hombre', 'ninos']) {
        const product = products.find(p => p.visible !== false && p.section === section);
        await staticPage.goto(server.origin + detailHref(product));
        assert.equal(await staticPage.locator('h1').textContent(), product.name);
        assert(await staticPage.locator('[data-romix-static-product] img').isVisible());
        await staticPage.screenshot({path: path.join(os.tmpdir(), `romix-seo-nojs-${section}-${width}.png`)});
      }
      await nojs.close();
      console.log(`productSeoBrowserTests: ${width}px passed (categories, static products, cart, sharing, legacy canonical, no JS)`);
    }
  } finally {if (browser) await browser.close(); await server.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
