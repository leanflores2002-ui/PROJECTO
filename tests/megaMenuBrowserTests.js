const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE_URL = process.env.ROMIX_TEST_URL || 'http://127.0.0.1:4173/index.html';
const SCREENSHOT_DIR = process.env.ROMIX_SCREENSHOTS || '';
const PRODUCTS_JSON = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'public', 'assets', 'data', 'products.json'), 'utf8');
if (SCREENSHOT_DIR) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isOpen(page, key) {
  return page.locator(`#mega-panel-${key}`).getAttribute('aria-hidden').then((value) => value === 'false');
}

async function testDesktop(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('header.site-header.romix-shared-header');

  const mujer = page.locator('#mega-trigger-mujer');
  const mujerPanel = page.locator('#mega-panel-mujer');
  await mujer.hover();
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), true, `Mujer should open at ${width}px`);
  if (SCREENSHOT_DIR && width === 1440) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'romix-mega-desktop.png') });
  }

  const panelBox = await mujerPanel.boundingBox();
  assert.ok(panelBox && panelBox.height <= 320, `Mujer panel should stay compact at ${width}px (got ${panelBox ? panelBox.height : 'none'}px)`);
  assert.equal(await page.locator('.mega-panel-link .mega-link-icon').count(), 0, 'Mega links should not render icons');
  assert.equal(await page.locator('.mega-panel-link .mega-link-badge').count(), 0, 'Mega links should not render badges');

  await mujerPanel.hover();
  await wait(140);
  assert.equal(await isOpen(page, 'mujer'), true, 'Panel should remain open while pointer is inside it');

  await page.locator('#mega-trigger-hombre').hover();
  await wait(120);
  assert.equal(await isOpen(page, 'hombre'), true, 'Hombre should switch directly from Mujer');
  assert.equal(await isOpen(page, 'mujer'), false, 'Mujer should close when Hombre opens');

  await page.keyboard.press('Escape');
  await wait(30);
  assert.equal(await isOpen(page, 'hombre'), false, 'Escape should close the mega menu');

  await page.locator('#mega-trigger-mujer').hover();
  await wait(120);
  await page.mouse.click(12, Math.min(height - 20, 500));
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), false, 'Clicking outside should close the mega menu');

  await page.locator('#mega-trigger-mujer').hover();
  await wait(120);
  await page.locator('[data-search-toggle="true"]').first().click();
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), false, 'Opening search should close the mega menu');

  await page.locator('[data-search-toggle="true"]').first().click();
  await page.locator('#mega-trigger-mujer').hover();
  await wait(120);
  await page.locator('#toggle-utility-menu').click();
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), false, 'Opening utilities should close the mega menu');
  assert.equal(await page.locator('#header-utility-panel').getAttribute('aria-hidden'), 'false');
}

async function testMobileNavigation(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('header.site-header.romix-shared-header');

  const mobileKeys = ['mujer', 'hombre', 'ninos', 'novedades', 'ofertas'];
  assert.equal(await page.locator('.mega-panel').first().evaluate((node) => getComputedStyle(node).display), 'none', 'Mega panels should stay hidden on mobile');
  assert.equal(await page.locator('.mega-panel-columns:visible, .mega-panel-column:visible, .mega-panel-list:visible, .mega-promo:visible, .mega-panel-bottom:visible').count(), 0, 'Mobile mega-menu content should stay hidden');
  assert.equal(await page.locator('.mega-chevron').count(), 0, 'Mobile category rows should not show chevrons');
  assert.equal(await page.locator('.mobile-nav-arrow').count(), 8, 'Mobile drawer should show ArrowRight on every direct link');
  for (const key of mobileKeys) {
    assert.equal(await page.locator(`#mega-trigger-${key}`).getAttribute('aria-expanded'), null, `${key} should not expose accordion semantics on mobile`);
    assert.equal(await page.locator(`#mega-trigger-${key}`).getAttribute('aria-controls'), null, `${key} should not control a mobile panel`);
    const rowBox = await page.locator(`#mega-trigger-${key}`).boundingBox();
    assert.ok(rowBox && rowBox.height >= 54, `${key} should have a 54px mobile touch row (got ${rowBox ? rowBox.height : 'none'}px)`);
  }

  const shortcuts = {
    'Catálogo completo': 'catalogo.html',
    Ayuda: 'ayuda.html#faq',
    'Guía de talles': 'ayuda.html#size-guide'
  };
  for (const [label, href] of Object.entries(shortcuts)) {
    const shortcut = page.locator('.mobile-drawer-links a', { hasText: label });
    assert.equal(await shortcut.getAttribute('href'), href, `${label} should keep its direct href`);
  }

  await page.locator('#toggle-mobile-nav').click();
  await wait(260);
  assert.equal(await page.locator('body').evaluate((node) => node.classList.contains('mobile-nav-open')), true);

  if (SCREENSHOT_DIR && width === 390) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'romix-mega-mobile.png') });
  }

  const destinations = {
    mujer: '/mujer/',
    hombre: '/hombre/',
    ninos: '/ninos/',
    novedades: 'catalogo.html?view=novedades',
    ofertas: 'catalogo.html?q=oferta'
  };
  for (const [key, href] of Object.entries(destinations)) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.locator('#toggle-mobile-nav').click();
    await wait(50);
    assert.equal(await page.locator(`#mega-trigger-${key}`).getAttribute('href'), href, `${key} should keep its native href`);
    await page.evaluate(() => {
      sessionStorage.removeItem('romix-mobile-default-prevented');
      document.addEventListener('click', (event) => {
        const link = event.target && event.target.closest ? event.target.closest('.mega-trigger') : null;
        if (link) sessionStorage.setItem('romix-mobile-default-prevented', String(event.defaultPrevented));
      });
    });
    await page.locator(`#mega-trigger-${key}`).click();
    await page.waitForLoadState('domcontentloaded');
    await wait(50);
    const destinationUrl = new URL(page.url());
    const expectedUrl = new URL(href, BASE_URL);
    assert.equal(destinationUrl.pathname, expectedUrl.pathname, `${key} should navigate to its native path`);
    for (const [name, value] of expectedUrl.searchParams) {
      assert.equal(destinationUrl.searchParams.get(name), value, `${key} should preserve its ${name} query parameter`);
    }
    assert.equal(await page.evaluate(() => sessionStorage.getItem('romix-mobile-default-prevented')), 'false', `${key} should not be default-prevented on mobile`);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    assert.equal(page.url(), new URL(BASE_URL).href, `${key} should return to the home page with Back`);
  }

  assert.ok(await page.locator('body').evaluate((node) => node.scrollWidth <= window.innerWidth), 'Mobile page should not overflow horizontally');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route('**/api/products**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: PRODUCTS_JSON
  }));
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await testDesktop(page, 1366, 768);
  await testDesktop(page, 1440, 900);
  await testDesktop(page, 1920, 1080);
  await testMobileNavigation(page, 360, 800);
  await testMobileNavigation(page, 390, 844);
  await testMobileNavigation(page, 430, 932);
  await testMobileNavigation(page, 768, 1024);
  assert.deepEqual(errors, [], `Browser page errors: ${errors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join('; ')}`);
  await browser.close();
  console.log('megaMenuBrowserTests: ok');
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
