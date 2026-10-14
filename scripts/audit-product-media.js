const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'frontend', 'public');
const REPORTS = path.join(ROOT, 'reports');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const TEXT_EXTENSIONS = new Set([
  '.css', '.html', '.js', '.json', '.md', '.py', '.ps1', '.sh', '.txt', '.yml', '.yaml'
]);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'reports', '.next', 'dist', 'build']);
const IMAGE_REFERENCE = /(?:^|["'`\s(=])((?:images|share-previews)\/[A-Za-z0-9_%.~()\-\/ ]+\.(?:png|jpe?g|webp|avif))(?:[?#"'`\s),]|$)/gi;

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) result.push(...walkFiles(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

function relative(value) {
  return path.relative(ROOT, value).split(path.sep).join('/');
}

function publicRelative(value) {
  return path.relative(PUBLIC, value).split(path.sep).join('/');
}

function isImage(file) {
  return IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function collectCatalogReferences(value, at = '', result = []) {
  if (typeof value === 'string' && /\.(png|jpe?g|webp|avif)(?:[?#].*)?$/i.test(value)) {
    result.push({ source: 'products.json', field: at, url: value });
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) collectCatalogReferences(child, `${at}.${key}`, result);
  }
  return result;
}

function scanTextReferences() {
  const references = [];
  for (const file of walkFiles(ROOT)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(IMAGE_REFERENCE)) {
      references.push({ source: relative(file), url: match[1] });
    }
  }
  return references;
}

function normalizeUrl(value) {
  return decodeURIComponent(String(value || '').trim().split(/[?#]/, 1)[0]).replace(/^\/+/, '');
}

function makeAssetRecord(file) {
  const stat = fs.statSync(file);
  const publicPath = publicRelative(file);
  const ext = path.extname(file).toLowerCase().slice(1);
  const lower = publicPath.toLowerCase();
  let kind = 'other';
  if (lower.startsWith('images/products/')) kind = 'canonical-product';
  else if (lower.startsWith('images/thumbs/')) kind = 'thumbnail-derived';
  else if (lower.startsWith('images/mobile/')) kind = 'mobile-derived';
  else if (lower.startsWith('images/optimized/')) kind = 'optimized-derived';
  else if (lower.startsWith('share-previews/')) kind = 'social-preview';
  return {
    path: publicPath,
    kind,
    extension: ext,
    bytes: stat.size,
    sha256: hashFile(file)
  };
}

function main() {
  const phase = process.argv[2] || 'before';
  if (!['before', 'after'].includes(phase)) throw new Error('Phase must be before or after');
  const products = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'assets', 'data', 'products.json'), 'utf8').replace(/^\uFEFF/, ''));
  const assets = walkFiles(path.join(PUBLIC, 'images')).concat(walkFiles(path.join(PUBLIC, 'share-previews'))).filter(isImage).map(makeAssetRecord);
  const catalogReferences = collectCatalogReferences(products);
  const textReferences = scanTextReferences();
  const allReferences = [...catalogReferences, ...textReferences].map((entry) => ({
    ...entry,
    normalizedUrl: normalizeUrl(entry.url),
    exists: fs.existsSync(path.join(PUBLIC, normalizeUrl(entry.url)))
  }));
  const uniqueReferences = [...new Map(allReferences.map((entry) => [entry.normalizedUrl, entry])).values()];
  const assetByPath = new Map(assets.map((asset) => [asset.path, asset]));
  const referencedAssets = new Set(uniqueReferences.map((entry) => entry.normalizedUrl));
  const duplicateMap = new Map();
  for (const asset of assets) {
    if (!duplicateMap.has(asset.sha256)) duplicateMap.set(asset.sha256, []);
    duplicateMap.get(asset.sha256).push(asset.path);
  }
  const duplicates = [...duplicateMap.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths }));
  const derivedKinds = new Set(['thumbnail-derived', 'mobile-derived', 'optimized-derived']);
  const relevantAssets = assets.filter((asset) => asset.kind === 'canonical-product' || derivedKinds.has(asset.kind));
  const orphanAssets = relevantAssets
    .filter((asset) => !referencedAssets.has(asset.path))
    .map((asset) => asset.path);
  const missingReferences = uniqueReferences
    .filter((entry) => !entry.exists)
    .map(({ normalizedUrl, source, field }) => ({ url: normalizedUrl, source, field }));
  const byKind = {};
  const byExtension = {};
  for (const asset of assets) {
    byKind[asset.kind] = (byKind[asset.kind] || 0) + 1;
    byExtension[asset.extension] = (byExtension[asset.extension] || 0) + 1;
  }
  const bytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const report = {
    generatedAt: new Date().toISOString(),
    phase,
    scope: {
      publicImages: 'frontend/public/images',
      socialPreviews: 'frontend/public/share-previews',
      catalog: 'frontend/public/assets/data/products.json'
    },
    summary: {
      files: assets.length,
      bytes,
      megabytes: Number((bytes / 1e6).toFixed(3)),
      products: Array.isArray(products) ? products.length : 0,
      references: allReferences.length,
      uniqueReferences: uniqueReferences.length,
      missingReferences: missingReferences.length,
      orphanAssets: orphanAssets.length,
      duplicateHashGroups: duplicates.length
    },
    formats: byExtension,
    kinds: byKind,
    derived: {
      thumbnails: assets.filter((asset) => asset.kind === 'thumbnail-derived').length,
      mobile: assets.filter((asset) => asset.kind === 'mobile-derived').length,
      optimized: assets.filter((asset) => asset.kind === 'optimized-derived').length
    },
    duplicates,
    orphanAssets,
    missingReferences,
    references: uniqueReferences.map(({ normalizedUrl, source, field, exists }) => ({
      url: normalizedUrl,
      source,
      field,
      exists,
      asset: assetByPath.get(normalizedUrl) || null
    }))
  };
  fs.mkdirSync(REPORTS, { recursive: true });
  const output = path.join(REPORTS, `product-media-${phase}.json`);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Wrote ${relative(output)}`);
}

if (require.main === module) main();

module.exports = { main, normalizeUrl, collectCatalogReferences };
