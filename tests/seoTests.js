const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {sitemap, isPreview, previewHtml} = require('../scripts/generate-seo');
const {deploymentSiteUrl, detailHref, productSlug} = require('../scripts/generate-share-pages');
const {renderPage} = require('../scripts/sync-storefront-shells');
const products = require('../frontend/public/assets/data/products.json');
const origin = require('../config/site.json').origin;
const xml = new JSDOM(sitemap(products, origin), {contentType: 'application/xml'}).window.document;
const urls = [...xml.querySelectorAll('loc')].map(node => node.textContent);
assert.equal(urls.length, products.filter(p => p.visible !== false).length + 8);
assert.equal(new Set(urls).size, urls.length);
for (const product of products) {
  const url = origin + detailHref(product, productSlug(product));
  assert.equal(urls.includes(url), product.visible !== false, product.name);
}
assert(urls.every(url => url.startsWith(origin + '/')));
assert(!urls.some(url => /cart|404|\/share\//.test(new URL(url).pathname)));
for (const url of urls) assert(fs.existsSync(path.join(__dirname, '../frontend/public', new URL(url).pathname.endsWith('/') ? new URL(url).pathname + 'index.html' : new URL(url).pathname)));
assert.equal(deploymentSiteUrl({VERCEL_ENV: 'preview', VERCEL_URL: 'old-preview.vercel.app', URL: 'https://old.netlify.app'}), origin);
assert.equal(deploymentSiteUrl({ROMIX_SITE_URL: 'https://romix.example'}), 'https://romix.example');
assert(isPreview({VERCEL_ENV: 'preview'}));
assert(isPreview({CONTEXT: 'deploy-preview'}));
assert(!isPreview({VERCEL_ENV: 'production'}));
assert(!isPreview({CONTEXT: 'production'}));
for (const file of ['index.html', 'catalogo.html', 'ayuda.html', 'privacidad.html', 'terminos.html', 'product.html', 'cart.html', '404.html']) {
  const html = renderPage(file);
  assert(!html.includes('romi-damas.netlify.app'));
  const preview = new JSDOM(previewHtml(html)).window.document;
  assert.equal(preview.querySelectorAll('meta[name="robots"]').length, 1);
  assert.equal(preview.querySelector('meta[name="robots"]').content, 'noindex, follow');
  assert(preview.querySelector('meta[name="romix-preview"]'));
  assert.equal(previewHtml(previewHtml(html)), previewHtml(html));
  if (['index.html', 'catalogo.html', 'ayuda.html'].includes(file)) assert(!new JSDOM(html).window.document.querySelector('meta[name="robots"]'));
}
const config = require('../vercel.json');
const restricted = config.headers.find(rule => rule.headers.some(h => h.key === 'X-Robots-Tag'));
assert.deepEqual(restricted.missing, [{type: 'host', value: new URL(origin).hostname}]);
assert(!restricted.headers.some(header => header.value.includes('nofollow')));
console.log(`seoTests: passed (${urls.length} canonical URLs, preview isolation, hidden products)`);
