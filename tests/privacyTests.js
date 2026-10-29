const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {renderPage} = require('../scripts/sync-storefront-shells');
const {generatedPages} = require('../scripts/sync-storefront-shells');
const root = path.resolve(__dirname, '..');
const product = require('../frontend/public/assets/data/products.json').find(p => p.visible !== false);
const productPath = require('../frontend/public/assets/js/product-url').detailHref(product) + 'index.html';
for (const file of [...generatedPages, productPath]) {
  const original = fs.readFileSync(path.join(root, 'frontend/public', file), 'utf8');
  const doc = new JSDOM(original).window.document;
  assert(doc.querySelector('footer a[href="/privacidad.html"]'), file);
  assert.equal(doc.querySelector('#cookie-consent a[href="/privacidad.html"]').textContent, 'Privacidad');
  for (const id of ['cookie-accept', 'cookie-reject', 'cookie-settings']) assert(doc.getElementById(id), file);
  assert.equal(doc.querySelectorAll('#cookie-consent button').length, 2, 'Privacy link must not replace consent choices');
  doc.defaultView.close();
}
const doc = new JSDOM(renderPage('privacidad.html')).window.document;
assert.equal(doc.querySelectorAll('h1').length, 1);
assert(!doc.querySelector('meta[name=robots]'), 'Production must not inherit draft noindex');
assert.equal(doc.querySelector('link[rel=canonical]').href, require('../config/site.json').origin + '/privacidad.html');
assert(!doc.querySelector('mark'), 'No pending placeholders in public policy');
assert(!doc.body.textContent.includes('%%'));
assert(doc.body.textContent.includes('FLORES OROSCO ALBERTINA'));
assert(fs.existsSync(path.join(root, 'frontend/public/privacidad.html')));
assert(generatedPages.includes('privacidad.html'));
doc.defaultView.close();
console.log('privacyTests: passed (generated links, consent controls, identity, canonical, no placeholders)');
