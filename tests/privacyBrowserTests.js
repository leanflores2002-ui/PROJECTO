const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {chromium} = require('playwright');
const startServer = require('./helpers/browserServer');

const origin = 'https://romix-ropas.vercel.app';
const consentKey = 'romix.analytics-consent.v1';
(async () => {
  const server = await startServer();
  let browser;
  const summary = [];
  try {
    browser = await chromium.launch();
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
      const google = [], errors = [], destinations = [];
      let staged = false;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (/google-analytics\.com$|googletagmanager\.com$/.test(url.hostname)) {
          google.push(url.href);return route.fulfill({contentType: 'application/javascript', body: '/* intercepted */'});
        }
        if (url.origin !== origin) {
          destinations.push(url.hostname);return route.fulfill({contentType: 'text/html', body: '<title>Intercepted external destination</title>'});
        }
        const response = await context.request.get(server.origin + url.pathname + url.search);
        if (!staged && response.headers()['content-type']?.includes('text/html')) {
          let html = await response.text();
          html = html.replace(/Google Analytics usa cookies[\s\S]*?<\/p>/, 'Google Analytics usa cookies para medir visitas y uso de la tienda, solo si acept\u00e1s. Pod\u00e9s cambiar tu elecci\u00f3n desde el pie.</p>');
          return route.fulfill({response, body: html});
        }
        return route.fulfill({response});
      });
      const page = await context.newPage();page.setDefaultTimeout(12000);
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/');
      await page.locator('#cookie-consent').waitFor();
      const baseline = await page.locator('#cookie-consent').boundingBox();
      staged = true;
      await page.reload();
      const banner = page.locator('#cookie-consent');await banner.waitFor();
      const proposed = await banner.boundingBox();
      assert(proposed.height <= baseline.height + 1, `Banner grew at ${width}: ${baseline.height} -> ${proposed.height}`);
      const accept = page.locator('#cookie-accept'), reject = page.locator('#cookie-reject');
      const a = await accept.boundingBox(), r = await reject.boundingBox();
      assert(Math.abs(a.width-r.width)<1 && a.height>=44 && r.height>=44, 'Consent choices must remain equally accessible');
      await page.locator('.cookie-privacy-link').focus();
      assert.notEqual(await page.locator('.cookie-privacy-link').evaluate(n => getComputedStyle(n).outlineStyle), 'none');
      await page.keyboard.press('Enter');
      await page.locator('h1').filter({hasText:'Política de privacidad'}).waitFor();
      assert.equal(new URL(page.url()).pathname, '/privacidad.html');
      assert.equal(await page.evaluate(k => localStorage.getItem(k), consentKey), null);
      assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
      assert.equal(google.length, 0, 'Reading policy must not load Analytics');
      await page.locator('#cookie-reject').focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(k => localStorage.getItem(k), consentKey), 'rejected');
      await page.locator('#privacy-open-preferences').click();await page.locator('#cookie-settings').click();await banner.waitFor();await reject.click();
      assert(await page.locator('#cookie-settings').evaluate(n=>n===document.activeElement), 'Preference control must regain focus');
      await page.locator('#derechos').scrollIntoViewIfNeeded();
      await page.addScriptTag({path: require.resolve('axe-core/axe.min.js')});
      const axe = await page.evaluate(() => window.axe.run(document.querySelector('main'), {runOnly: {type:'tag', values:['wcag2a','wcag2aa']}}));
      assert.deepEqual(axe.violations.map(x=>x.id), [], 'Policy accessibility');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Policy overflow');
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({path:path.join(os.tmpdir(),`romix-privacy-${width}.png`)});
      await page.goto(origin + '/catalogo.html');
      assert.equal(await banner.isVisible(), false);
      await page.evaluate(() => window.romixCart.addToCart({productId:'privacy-qa',name:'Prueba local',color:'Negro',size:'1',qty:2,price:100}));
      await page.goto(origin + '/cart.html');await page.locator('.qty-stepper').waitFor();
      assert.equal(await page.evaluate(() => window.romixCart.getCart()[0].qty), 2);
      await page.locator('footer a[href="/privacidad.html"]').click();
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),consentKey),'rejected');
      assert.equal(google.length,0);
      await page.locator('#privacy-open-preferences').click();await page.locator('#cookie-settings').click();await accept.click();
      await page.waitForFunction(()=>typeof window.gtag==='function');assert.equal(google.length,1);
      assert.equal(await page.evaluate(()=>window.romixCart.getCart()[0].qty),2);
      assert.deepEqual(errors, []);
      summary.push({width,baselineHeight:baseline.height,proposedHeight:proposed.height,status:'passed'});
      console.log(`privacyBrowserTests: ${width}px passed (compactness, policy links, keyboard, no implied consent, persisted rejection, cart, axe)`);
      await context.close();
    }
  } finally {
    if(browser)await browser.close();await server.close();
    fs.writeFileSync(path.join(os.tmpdir(),'romix-privacy-qa.json'),JSON.stringify(summary,null,2));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
