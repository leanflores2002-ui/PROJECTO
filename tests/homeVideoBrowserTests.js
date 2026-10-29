const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { chromium } = require('playwright');
const browserServer = require('./helpers/browserServer');
(async () => {
  const server = await browserServer();
  const browser = await chromium.launch();
  try {
    async function scenario({ width, reducedMotion = 'no-preference', saveData = false, failVideo = false }) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
      if (saveData) await context.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
      const requests = [], errors = [];
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== server.origin) return route.fulfill({ body: '' });
        if (url.pathname.endsWith('.mp4')) {
          requests.push(url.pathname);
          if (failVideo) return route.fulfill({ status: 404 });
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(server.origin);
      const video = page.locator('.video-hero video');
      const toggle = page.locator('[data-video-toggle]');
      assert.equal(await page.locator('main > section').first().evaluate(node => node.classList.contains('video-hero')), true);
      assert.equal(await page.evaluate(() => document.querySelector('#ofertas').compareDocumentPosition(document.querySelector('.home-campaigns')) & Node.DOCUMENT_POSITION_FOLLOWING), 4);
      if (reducedMotion === 'reduce' || saveData) {
        await page.waitForTimeout(700);
        assert.equal(requests.length, 0, 'Reduced motion and data saver must not download video automatically');
        assert.equal(await video.evaluate(node => node.paused), true);
        await page.evaluate(() => scrollTo(0, innerHeight * 2));
        await page.waitForTimeout(100);
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(100);
        assert.equal(await video.evaluate(node => node.paused), true, 'User pause must survive leaving and returning to the banner');
        await toggle.click();
      }
      if (failVideo) {
        await page.waitForFunction(() => document.querySelector('[data-video-toggle]').hidden);
        assert.equal(await page.locator('.video-hero__poster').isVisible(), true);
      } else {
        await page.waitForFunction(() => { const v = document.querySelector('.video-hero video'); return v.readyState >= 2 && !v.paused; });
        const info = await video.evaluate(node => ({ muted: node.muted, inline: node.playsInline, loop: node.loop, src: node.getAttribute('src') }));
        assert.ok(info.muted && info.inline && info.loop);
        assert.equal(info.src.includes('-mobile.mp4'), width <= 960);
        assert.ok(requests.every(url => url.endsWith(width <= 960 ? '/romix-principal-mobile.mp4' : '/romix-principal.mp4')), 'Only the selected optimized video may be requested');
        await toggle.click();
        assert.equal(await video.evaluate(node => node.paused), true);
        await page.evaluate(() => scrollTo(0, innerHeight * 2));
        await page.waitForTimeout(100);
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(100);
        assert.equal(await video.evaluate(node => node.paused), true, 'User pause must survive leaving and returning to the banner');
        await toggle.click();
        await page.waitForFunction(() => !document.querySelector('.video-hero video').paused);
        await page.evaluate(() => scrollTo(0, innerHeight * 2));
        await page.waitForFunction(() => document.querySelector('.video-hero video').paused);
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForFunction(() => !document.querySelector('.video-hero video').paused);
      }
      if (width === 1440 && !failVideo) {
        await page.setViewportSize({ width: 390, height: 900 });
        await page.waitForFunction(() => { const v = document.querySelector('.video-hero video'); return v.currentSrc.includes('-mobile.mp4') && !v.paused; });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForFunction(() => { const v = document.querySelector('.video-hero video'); return v.currentSrc.includes('romix-principal.mp4') && !v.paused; });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.addScriptTag({ content: fs.readFileSync(require.resolve('axe-core'), 'utf8') });
      const result = await page.evaluate(() => axe.run(document.querySelector('.video-hero'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }));
      assert.deepEqual(result.violations.map(item => item.id), []);
      if (process.env.ROMIX_SCREENSHOTS) await page.screenshot({ path: path.join(os.tmpdir(), `romix-video-${width}-${reducedMotion}-${saveData}-${failVideo}.png`) });
      await context.close();
      console.log(`homeVideoBrowserTests: ${width}px motion=${reducedMotion} saveData=${saveData} failed=${failVideo} passed`);
    }
    await scenario({ width: 1440 });
    await scenario({ width: 390 });
    await scenario({ width: 360, reducedMotion: 'reduce' });
    await scenario({ width: 768, saveData: true });
    await scenario({ width: 390, failVideo: true });
  } finally {
    await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
