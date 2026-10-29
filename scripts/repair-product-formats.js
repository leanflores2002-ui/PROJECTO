// Explicit, non-destructive format repair. Keeps original bytes and existing derivatives.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { collectCatalogReferences } = require('./audit-product-media');
const { writeDerived } = require('./optimize-product-images');
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'frontend/public');
const catalogFile = path.join(publicDir, 'assets/data/products.json');
const manifestFile = path.join(root, 'config/product-media-formats.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async () => {
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  const prior = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : [];
  const manifest = [...prior];
  const replacements = new Map();
  const sources = [...new Set(collectCatalogReferences(catalog).map(ref => ref.url))];
  for (const source of sources) {
    const file = path.join(publicDir, source);
    const info = await sharp(file).metadata();
    if (info.format === path.extname(source).slice(1)) continue;
    if (!source.startsWith('images/products/') || path.extname(source) !== '.webp') throw new Error(`Review unsupported format: ${source}`);
    const delivery = source.replace(/\.webp$/, '_delivery.webp');
    const output = path.join(publicDir, delivery);
    if (fs.existsSync(output)) throw new Error(`Refusing to overwrite: ${delivery}`);
    const sourceHash = hash(file);
    await sharp(file).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(output);
    for (const [directory, width, height, quality] of [['thumbs', 640, 853, 76], ['swatches', 96, 128, 70]]) {
      const target = path.join(publicDir, 'images', directory, path.basename(delivery));
      if (fs.existsSync(target)) throw new Error(`Refusing to overwrite: ${target}`);
      await writeDerived(output, target, { width, height, quality });
    }
    if (hash(file) !== sourceHash) throw new Error('Original changed');
    manifest.push({ source, sourceFormat: info.format, sourceSha256: sourceHash, delivery, deliverySha256: hash(output) });
    replacements.set(source, delivery);
  }
  function replace(value) {
    if (typeof value === 'string') return replacements.get(value) || value;
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replace(child)]));
    return value;
  }
  if (replacements.size) {
    fs.writeFileSync(catalogFile, JSON.stringify(replace(catalog), null, 2) + '\n');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(`Format repairs: ${replacements.size}; originals and prior derivatives preserved`);
})().catch(error => { console.error(error); process.exitCode = 1; });
