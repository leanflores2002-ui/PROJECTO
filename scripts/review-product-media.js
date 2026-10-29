// Read-only classification; originals and derivatives are never rewritten.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { productColors, resolveColorImage } = require('./check-products');
const { collectCatalogReferences } = require('./audit-product-media');
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'frontend/public');
const products = require('../frontend/public/assets/data/products.json');
const clean = value => String(value).split(/[?#]/)[0].replace(/^\/+/, '');
const token = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
(async () => {
  const references = collectCatalogReferences(products).map(ref => ({ ...ref, url: clean(ref.url) }));
  const missing = references.filter(ref => !fs.existsSync(path.join(publicDir, ref.url)));
  const assets = [...new Set(references.map(ref => ref.url))];
  const metadata = new Map();
  const invalid = [], format = [], derivatives = [], heavy = [], reusedByColors = [], nameCandidates = [];
  for (const url of assets) {
    if (!fs.existsSync(path.join(publicDir, url))) continue;
    try {
      const bytes = fs.statSync(path.join(publicDir, url)).size;
      const info = await sharp(path.join(publicDir, url)).metadata();
      metadata.set(url, { format: info.format, width: info.width, height: info.height, bytes });
      if (!info.width || !info.height) invalid.push({ url, error: 'Missing dimensions' });
      if (path.extname(url).slice(1) !== info.format) format.push({ url, actual: info.format });
      for (const [directory, width, height] of [['thumbs', 640, 853], ['swatches', 96, 128]]) {
        const derived = `images/${directory}/${path.basename(url)}`;
        if (!fs.existsSync(path.join(publicDir, derived))) { derivatives.push({ url: derived, source: url, reason: 'missing' }); continue; }
        const derivedInfo = await sharp(path.join(publicDir, derived)).metadata();
        if (derivedInfo.format !== 'webp' || derivedInfo.width > width || derivedInfo.height > height) derivatives.push({ url: derived, source: url, reason: 'format/dimensions', width: derivedInfo.width, height: derivedInfo.height });
      }
    } catch (error) { invalid.push({ url, error: error.message }); }
  }
  for (const product of products) {
    const byImage = new Map();
    productColors(product).forEach((color, index) => {
      const name = color.name || color.value || color;
      const url = clean(resolveColorImage(product, color, index));
      const info = metadata.get(url);
      const entry = { product: product.name, color: name, url, ...info };
      if (info && info.bytes > 1.5 * 1024 * 1024) heavy.push(entry);
      if (!byImage.has(url)) byImage.set(url, []);
      byImage.get(url).push(name);
      if (name !== 'Unico' && !token(path.basename(url, path.extname(url))).includes(token(name))) nameCandidates.push(entry);
    });
    for (const [url, colors] of byImage) if (colors.length > 1) reusedByColors.push({ product: product.name, url, colors });
  }
  const scanner = JSON.parse(fs.readFileSync(path.join(root, 'reports/product-media-after.json'), 'utf8'));
  const implicit = new Set(assets.flatMap(url => ['thumbs', 'swatches'].map(dir => `images/${dir}/${path.basename(url)}`)));
  const repairs = JSON.parse(fs.readFileSync(path.join(root, 'config/product-media-formats.json'), 'utf8'));
  const preserved = new Set(repairs.flatMap(item => [item.source, `images/thumbs/${path.basename(item.source)}`, `images/swatches/${path.basename(item.source)}`]));
  const potentialUnused = scanner.orphanAssets.filter(url => !implicit.has(url) && !preserved.has(url));
  const report = { summary: { primaryWeightWarnings: heavy.length, uniqueHeavyFiles: new Set(heavy.map(item => item.url)).size,
    missingCatalogReferences: missing.length, invalidImages: invalid.length, incorrectFormat: format.length,
    derivativeProblems: derivatives.length, reusedByColors: reusedByColors.length, filenameCandidates: nameCandidates.length,
    rawUnreferenced: scanner.orphanAssets.length, implicitlyReferencedDerivatives: scanner.orphanAssets.filter(url => implicit.has(url)).length,
    preservedOriginalsAndDerivatives: scanner.orphanAssets.filter(url => preserved.has(url)).length,
    potentialUnused: potentialUnused.length, duplicateHashGroups: scanner.duplicates.length },
    heavy, missing, invalid, format, derivatives, reusedByColors, nameCandidates, potentialUnused,
    rawMissingReferences: scanner.missingReferences };
  fs.writeFileSync(path.join(root, 'reports/product-media-review.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('Shared images:', JSON.stringify(reusedByColors));
  console.log('Filename candidates:', JSON.stringify(nameCandidates.map(({ product, color, url }) => ({ product, color, url }))));
  console.log('Potential unused:', JSON.stringify(potentialUnused));
  if (missing.length || invalid.length || format.length || derivatives.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
