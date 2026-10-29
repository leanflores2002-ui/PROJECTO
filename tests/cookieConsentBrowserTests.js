const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const startServer = require('./helpers/browserServer');
const origin = 'https://romix-ropas.vercel.app';
const key = 'romix.analytics-consent.v1';
(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const google = [], errors = [];
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'www.googletagmanager.com') {
          google.push(url.href);
          return route.fulfill({ contentType: 'application/javascript', body: '/* Google intercepted: no real telemetry */' });
        }
        if (url.origin === origin) {
          const response = await context.request.get(server.origin + url.pathname + url.search);
          return route.fulfill({ response });
        }
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/index.html');
      const banner = page.locator('#cookie-consent');
      await banner.waitFor({ state: 'visible' });
      assert.equal(google.length, 0);
      assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
      const reject = page.getByRole('button', { name: 'Rechazar analítica', exact: true });
      const accept = page.getByRole('button', { name: 'Aceptar analítica', exact: true });
      for (const button of [reject, accept]) {
        const box = await button.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44);
      }
      await reject.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), 'rejected');
      await page.goto(origin + '/catalogo.html');
      assert.equal(await banner.isVisible(), false);
      assert.equal(google.length, 0);
      await page.evaluate(() => window.romixCart.addToCart({ productId: 'consent-test', name: 'Prueba local', color: 'Negro', size: '1', qty: 2, price: 100 }));
      await page.locator('#cookie-settings').click();
      await accept.click();
      await page.waitForFunction(() => typeof window.gtag === 'function');
      assert.equal(google.length, 1);
      assert.equal(await banner.isVisible(), false);
      await page.reload();
      await page.waitForFunction(() => typeof window.gtag === 'function');
      assert.equal(google.length, 2);
      assert.equal(await banner.isVisible(), false);
      await context.addCookies([{ name: '_ga', value: 'test-only', domain: 'romix-ropas.vercel.app', path: '/' }]);
      await page.locator('#cookie-settings').click();
      await Promise.all([page.waitForNavigation(), reject.click()]);
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), 'rejected');
      assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
      assert.equal(google.length, 2);
      assert.ok(!(await context.cookies()).some(c => c.name === '_ga'));
      assert.ok((await page.evaluate(() => JSON.stringify(window.romixCart.getCart()))).includes('consent-test'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('#cookie-settings').click();
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const result = await page.evaluate(async () => window.axe.run(document.getElementById('cookie-consent'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
      assert.equal(result.violations.length, 0, JSON.stringify(result.violations.map(x => x.id)));
      if (process.env.ROMIX_SCREENSHOTS) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(process.env.TEMP, 'romix-cookies-' + width + '.png') });
      }
      assert.deepEqual(errors, []);
      console.log('cookieConsentBrowserTests: ' + width + 'px passed (no Google until accepted, persisted rejection, keyboard, withdrawal, cookie cleanup, cart preserved, axe)');
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Blocked by browser'); }; });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      return route.fulfill({ response: await context.request.get(server.origin + url.pathname + url.search) });
    });
    const page = await context.newPage();
    await page.goto(origin + '/index.html');
    await page.locator('#cookie-accept').click();
    assert.ok(await page.locator('#cookie-consent').isVisible());
    assert.ok((await page.locator('#cookie-consent-status').innerText()).includes('No pudimos guardar'));
    assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
    console.log('cookieConsentBrowserTests: storage blocked fails closed');
    await context.close();
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
