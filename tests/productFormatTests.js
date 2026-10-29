const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { collectCatalogReferences } = require('../scripts/audit-product-media');
const products = require('../frontend/public/assets/data/products.json');
const repairs = require('../config/product-media-formats.json');
const publicDir = path.resolve(__dirname, '../frontend/public');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async () => {
  const references = new Set(collectCatalogReferences(products).map(ref => ref.url));
  for (const url of references) {
    const info = await sharp(path.join(publicDir, url)).metadata();
    assert.equal(info.format, path.extname(url).slice(1), `${url}: extension does not match encoded format`);
    assert.ok(info.width > 0 && info.height > 0, `${url}: invalid dimensions`);
  }
  for (const repair of repairs) {
    const source = path.join(publicDir, repair.source), delivery = path.join(publicDir, repair.delivery);
    assert.notEqual(source, delivery, 'Original must be preserved separately');
    assert.equal(hash(source), repair.sourceSha256, `Original changed: ${repair.source}`);
    assert.equal(hash(delivery), repair.deliverySha256, `Delivery changed: ${repair.delivery}`);
    assert.ok(!references.has(repair.source) && references.has(repair.delivery), 'Catalog must use corrected encoding');
    const original = await sharp(source).metadata(), info = await sharp(delivery).metadata();
    assert.equal(original.format, repair.sourceFormat);
    assert.equal(info.format, 'webp');
    assert.ok(info.width <= 1600 && info.height <= 1600);
    assert.ok(Math.abs(info.width / info.height - original.width / original.height) < 0.005, 'Photo aspect ratio must be preserved');
    for (const [dir, width, height] of [['thumbs', 640, 853], ['swatches', 96, 128]]) {
      const derived = await sharp(path.join(publicDir, 'images', dir, path.basename(delivery))).metadata();
      assert.equal(derived.format, 'webp');
      assert.ok(derived.width <= width && derived.height <= height, `Oversized ${dir}: ${repair.delivery}`);
    }
  }
  console.log(`productFormatTests: passed (${references.size} referenced encodings; ${repairs.length} preserved originals and repaired deliveries)`);
})().catch(error => { console.error(error); process.exitCode = 1; });
