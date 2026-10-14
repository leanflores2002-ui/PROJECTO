const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {categories, renderCategory} = require('../scripts/generate-category-pages');
const {publicProducts} = require('../frontend/public/assets/js/catalog-sections');
const {renderPage} = require('../scripts/sync-storefront-shells');
const {detailHref, productSlug} = require('../scripts/generate-share-pages');
const {previewHtml} = require('../scripts/generate-seo');
const products = require('../frontend/public/assets/data/products.json');
const origin = require('../config/site.json').origin;
const publicDir = path.resolve(__dirname, '../frontend/public');

(async () => {
  for (const category of categories) {
    const html = renderCategory(category, renderPage('catalogo.html'), products, origin);
    assert.equal(fs.readFileSync(path.join(publicDir, category.key, 'index.html'), 'utf8'), html, 'Generated category must match its sources');
    const dom = new JSDOM(html, {url: `${origin}/${category.key}/`, runScripts: 'outside-only'});
    const window = dom.window;
    const document = window.document;
    const expected = publicProducts(products, category.key);
    assert.equal(document.querySelectorAll('#product-grid .product-card').length, expected.length, 'All public products must be in source HTML');
    assert.equal(document.querySelector('base').href, origin + '/');
    assert.equal(document.querySelector('link[rel=canonical]').href, `${origin}/${category.key}/`);
    assert.equal(document.querySelector('meta[property="og:url"]').content, `${origin}/${category.key}/`);
    assert.equal(document.title, category.title);
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert(document.querySelector('h1').textContent.includes(category.label.toLowerCase()));
    assert(document.querySelector('.catalog-intro').textContent.length > 60);
    assert(!document.querySelector('meta[name=robots]'));
    for (const product of expected) assert([...document.querySelectorAll('#product-grid a')].some(a => a.href === origin + detailHref(product, productSlug(product))));
    for (const img of document.querySelectorAll('#product-grid img')) {
      assert(fs.existsSync(path.join(publicDir, decodeURIComponent(new URL(img.src).pathname))), img.src);
      assert.equal(img.loading || img.getAttribute('loading'), 'lazy');
    }
    assert.equal(new JSDOM(previewHtml(html)).window.document.querySelector('meta[name=robots]').content, 'noindex, follow');
    window.romixProductsStore = {load: async () => products};
    for (const asset of ['catalog-sections', 'romix-image-utils', 'romix-catalog-pages']) window.eval(fs.readFileSync(path.join(publicDir, `assets/js/${asset}.js`), 'utf8'));
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await new Promise(resolve => window.setTimeout(resolve, 35));
    assert.equal(document.title, category.title, 'Runtime must preserve the SEO title');
    assert([...document.querySelectorAll('.product-name')].every(node => expected.some(product => product.name === node.textContent)), 'Runtime must keep the category scope');
    // A conflicting legacy section query must not change the page under its canonical.
    const opposite = category.key === 'mujer' ? 'hombre' : 'mujer';
    window.history.replaceState(null, '', `/${category.key}/?sections=${opposite}`);
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await new Promise(resolve => window.setTimeout(resolve, 35));
    assert([...document.querySelectorAll('.product-name')].every(node => expected.some(product => product.name === node.textContent)));
    dom.window.close();
    const fallback = new JSDOM(html, {url: `${origin}/${category.key}/`, runScripts: 'outside-only'});
    fallback.window.romixProductsStore = {load: async () => {throw new Error('temporary outage');}};
    fallback.window.console.warn = () => {};
    for (const asset of ['catalog-sections', 'romix-catalog-pages']) fallback.window.eval(fs.readFileSync(path.join(publicDir, `assets/js/${asset}.js`), 'utf8'));
    fallback.window.document.dispatchEvent(new fallback.window.Event('DOMContentLoaded'));
    await new Promise(resolve => fallback.window.setTimeout(resolve, 35));
    assert.equal(fallback.window.document.querySelectorAll('#product-grid .product-card').length, expected.length, 'A failed catalog fetch must preserve crawlable products');
    fallback.window.close();
  }
  const fixtures = [{name: 'Alias', section: 'damas'}, {name: 'Hidden', section: 'mujer', visible: false}, {name: 'Otra', section: 'hombre'}];
  assert.deepEqual(publicProducts(fixtures, 'mujer').map(p => p.name), ['Alias']);
  console.log('categoryPagesTests: passed (static content, scope, canonicals, runtime, media, Preview)');
})().catch(error => {console.error(error); process.exitCode = 1;});
