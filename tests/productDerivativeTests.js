const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { needsDerived, writeDerived } = require('../scripts/optimize-product-images');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'romix-derived-'));
  const source = path.join(dir, 'source.webp');
  const output = path.join(dir, 'swatch.webp');
  try {
    await sharp({ create: { width: 1122, height: 1402, channels: 3, background: '#f22797' } }).webp().toFile(source);
    const original = fs.readFileSync(source);
    fs.copyFileSync(source, output);
    fs.utimesSync(source, new Date(0), new Date(0));
    const options = { width: 96, height: 128, quality: 70 };
    assert.equal(await needsDerived(source, output, options), true, 'Oversized copies must be detected even with newer output timestamps');
    await writeDerived(source, output, options);
    assert.deepEqual(fs.readFileSync(source), original, 'Canonical image must remain unchanged');
    const info = await sharp(fs.readFileSync(output)).metadata();
    assert.ok(info.width <= 96 && info.height <= 128);
    assert.equal(await needsDerived(source, output, options), false, 'Valid derivatives must be reused');
    console.log('productDerivativeTests: passed');
  } finally {
    for (const file of [source, output]) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
