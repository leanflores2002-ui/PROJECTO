const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const products = require('../frontend/public/assets/data/products.json');

(async () => {
  const source = pathToFileURL(path.join(__dirname, '../frontend/public/assets/js/slugify.js')).href;
  const dom = new JSDOM(`<script src="${source}"></script>`, { runScripts: 'dangerously', resources: 'usable' });
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    const ids = new Set();
    for (const product of products) {
      const id = dom.window.productId(product);
      assert.ok(id && id.trim() === id, `Invalid public identifier: ${product.name}`);
      assert.ok(!ids.has(id), `Ambiguous product/cart reference: ${id}`);
      ids.add(id);
    }
    assert.equal(dom.window.productId({ name: 'Remerón algodón & más' }), 'remeron-algodon-mas');
    console.log('catalogIdentityTests: passed (unique public references, no fixed catalog count)');
  } finally { dom.window.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
