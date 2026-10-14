const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = process.env.ROMIX_TEST_URL || 'http://127.0.0.1:4173/';
const pages = ['index.html', 'catalogo.html', 'product.html', 'cart.html', 'ayuda.html', '404.html'];
const logoPath = 'images/branding/romix-logo.webp';

async function assertLogo(page, pageName, mobile) {
  await page.goto(new URL(pageName, BASE).href, { waitUntil: 'networkidle' });
  await page.waitForSelector('.site-logo--header');

  const logos = page.locator('.site-logo');
  assert.equal(await logos.count(), 3, `${pageName}: expected header, drawer and footer logos`);
  for (let index = 0; index < await logos.count(); index += 1) {
    const logo = logos.nth(index);
    assert.equal(await logo.getAttribute('src'), logoPath, `${pageName}: logo ${index} should use the shared asset`);
    assert.equal(await logo.getAttribute('alt'), 'ROMIX', `${pageName}: logo ${index} should have accessible alt text`);
    assert.ok(await logo.evaluate((node) => node.complete && node.naturalWidth > 0), `${pageName}: logo ${index} should load`);
  }

  const headerBox = await page.locator('.site-logo--header').boundingBox();
  const footerBox = await page.locator('.site-logo--footer').boundingBox();
  assert.ok(headerBox && headerBox.width > 90 && headerBox.height > 20, `${pageName}: header logo should be visible and sized`);
  assert.ok(footerBox && footerBox.width > 120 && footerBox.height > 30, `${pageName}: footer logo should be visible and sized`);
  assert.ok(headerBox.width / headerBox.height > 2.3, `${pageName}: header logo should preserve wordmark ratio`);
  assert.ok(footerBox.width / footerBox.height > 2.3, `${pageName}: footer logo should preserve wordmark ratio`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${pageName}: no horizontal overflow at ${mobile ? 'mobile' : 'desktop'} width`);

  if (mobile) {
    await page.locator('#toggle-mobile-nav').click();
    const drawerLogo = page.locator('.mobile-drawer-brand .site-logo--mobile');
    await assertLogoVisible(drawerLogo, `${pageName}: mobile drawer logo`);
    const drawerBox = await drawerLogo.boundingBox();
    assert.ok(drawerBox.width > 100 && drawerBox.height > 20, `${pageName}: mobile drawer logo should be compact but readable`);
    await page.locator('#close-mobile-nav').click();
  }
}

async function assertLogoVisible(locator, message) {
  assert.equal(await locator.isVisible(), true, message);
  assert.ok(await locator.evaluate((node) => node.complete && node.naturalWidth > 0), `${message} should load`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    for (const pageName of pages) await assertLogo(page, pageName, false);

    await page.setViewportSize({ width: 390, height: 844 });
    for (const pageName of pages) await assertLogo(page, pageName, true);

    await page.goto(new URL('catalogo.html', BASE).href, { waitUntil: 'networkidle' });
    await page.locator('.site-logo--header').click();
    await page.waitForURL(/\/index\.html(?:$|[?#])/);
    assert.match(page.url(), /\/index\.html(?:$|[?#])/);
  } finally {
    await browser.close();
  }
  console.log(`Logo browser checks passed for ${pages.length} pages at desktop and mobile widths.`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
