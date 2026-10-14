const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { inventory } = require('../scripts/catalog-media');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'frontend', 'public');
const productsDir = path.join(publicDir, 'images', 'products');
const products = require('../frontend/public/assets/data/products.json');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return entry.isFile() ? [file] : [];
  });
}

function bytes(dir) {
  return walk(dir).reduce((sum, file) => sum + fs.statSync(file).size, 0);
}

function assertNoProductDerivedReference(value, field = '') {
  if (typeof value === 'string') {
    assert(!/images\/(thumbs|mobile|optimized)\//i.test(value), `Product media must use canonical files: ${field}=${value}`);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertNoProductDerivedReference(child, `${field}.${key}`);
  }
}

const refs = inventory();
assert(refs.length > 157, 'Catalog media references must be audited');
assert(refs.every((ref) => ref.remote || fs.existsSync(path.join(publicDir, ref.url))), 'Every local product media reference must exist');
assertNoProductDerivedReference(products, 'products.json');

const productFiles = fs.readdirSync(productsDir).filter((file) => fs.statSync(path.join(productsDir, file)).isFile());
assert(productFiles.length > 0, 'Canonical product media directory must not be empty');
assert(productFiles.every((file) => path.extname(file).toLowerCase() === '.webp'), 'Every canonical product image must be WebP');
const stems = new Set();
for (const file of productFiles) {
  const stem = file.slice(0, -path.extname(file).length).toLowerCase();
  assert(!stems.has(stem), `Duplicate canonical product stem: ${file}`);
  stems.add(stem);
}

const beforeReport = path.join(root, 'reports', 'storage-before.json');
if (fs.existsSync(beforeReport)) {
  const before = JSON.parse(fs.readFileSync(beforeReport, 'utf8'));
  const beforePublic = before.metrics.find((entry) => entry.path === 'frontend/public');
  assert(beforePublic, 'Storage baseline must include frontend/public');
  assert(bytes(publicDir) <= beforePublic.bytes, 'Public assets must not grow after product media migration');
}

const ignore = fs.readFileSync(path.join(root, '.vercelignore'), 'utf8');
assert(ignore.includes('reports/') && ignore.includes('tests/'), 'Deployment excludes audit/test artifacts');
assert(!ignore.includes('frontend/public/images/products'), 'Canonical product images must remain deployed');
const optimizer = fs.readFileSync(path.join(root, 'scripts', 'optimize-product-images.js'), 'utf8');
assert(optimizer.includes("const WRITE = process.argv.includes('--write')"), 'Product optimizer must default to dry run');
assert(optimizer.includes('MAX_SIDE = 1600'), 'Product optimizer must cap the canonical image side');
assert(optimizer.includes('withoutEnlargement: true'), 'Product optimizer must not enlarge small images');
console.log(`mediaStorageTests: passed (${refs.length} catalog references; ${productFiles.length} canonical WebP; ${bytes(publicDir)} public bytes)`);
