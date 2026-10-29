import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(repoRoot, 'frontend', 'public', 'assets', 'data', 'products.json');
const outputPath = process.argv[2];

if (!outputPath) {
  throw new Error('Usage: node scripts/generate-d1-catalog-seed.mjs <output.sql>');
}

const products = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function json(value) {
  return JSON.stringify(value ?? []);
}

const usedIds = new Map();
const statements = products.map((product) => {
  const baseId = `${slugify(product.section)}-${slugify(product.name)}`;
  const count = (usedIds.get(baseId) || 0) + 1;
  usedIds.set(baseId, count);
  const id = count === 1 ? baseId : `${baseId}-${count}`;
  const visible = product.visible === false ? 0 : 1;
  return `INSERT INTO catalog_products (
  id, section, type, name, season, image, price,
  price_by_group_json, special_sizes_json, colors_json, sizes_json, visible
) VALUES (
  ${sql(id)}, ${sql(product.section)}, ${sql(product.type)}, ${sql(product.name)},
  ${sql(product.season || '')}, ${sql(product.image)}, ${Number(product.price) || 0},
  ${sql(json(product.priceByGroup || {}))}, ${sql(json(product.specialSizes || []))},
  ${sql(json(product.colors || []))}, ${sql(json(product.sizes || []))}, ${visible}
)
ON CONFLICT(id) DO UPDATE SET
  section = excluded.section,
  type = excluded.type,
  name = excluded.name,
  season = excluded.season,
  image = excluded.image,
  price = excluded.price,
  price_by_group_json = excluded.price_by_group_json,
  special_sizes_json = excluded.special_sizes_json,
  colors_json = excluded.colors_json,
  sizes_json = excluded.sizes_json,
  visible = excluded.visible,
  updated_at = CURRENT_TIMESTAMP;`;
});

fs.writeFileSync(
  outputPath,
  `-- Generated from ${path.relative(repoRoot, sourcePath)}\n${statements.join('\n\n')}\n`,
  'utf8',
);

console.log(`Generated ${statements.length} catalog upserts at ${outputPath}`);
