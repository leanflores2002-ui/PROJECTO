const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_FILE = path.join(ROOT, 'frontend', 'public', 'assets', 'data', 'products.json');
const shouldWrite = process.argv.includes('--write');

function normalizeText(value) {
  const raw = String(value || '').trim();
  try {
    return raw.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function colorImage(product, color, index) {
  if (color && typeof color === 'object') {
    const galleries = [color.images, color.imagenes, color.gallery, color.galeria, color.photos, color.fotos];
    const gallery = galleries.find((entry) => Array.isArray(entry) && entry.length);
    if (gallery && gallery[0]) return gallery[0];
    if (color.image || color.imagen) return color.image || color.imagen;
  }

  const colorName = String(color && typeof color === 'object' ? (color.name || color.value || '') : color || '').trim();
  const map = product.imageMap && typeof product.imageMap === 'object' && !Array.isArray(product.imageMap)
    ? product.imageMap
    : null;
  if (map && colorName) {
    if (map[colorName]) return map[colorName];
    const target = normalizeText(colorName);
    const key = Object.keys(map).find((entry) => normalizeText(entry) === target);
    if (key) return map[key];
  }

  if (Array.isArray(product.images) && product.images[index]) return product.images[index];
  return product.image || '';
}

function compactProduct(product) {
  const source = product && typeof product === 'object' ? product : {};
  const result = {};

  const preferredOrder = [
    'section', 'type', 'name', 'season', 'visible', 'featured', 'featuredBadge',
    'image', 'price', 'priceByGroup', 'originalPrice', 'badge',
    'specialSizes', 'specialSizes2', 'superSpecialSizes'
  ];

  preferredOrder.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
  });

  const rawColors = Array.isArray(source.colors)
    ? source.colors
    : (source.colors && typeof source.colors === 'object' ? Object.values(source.colors) : []);

  result.colors = rawColors.map((entry, index) => {
    const color = entry && typeof entry === 'object'
      ? { ...entry }
      : { name: String(entry || '').trim() };
    const image = colorImage(source, color, index);

    delete color.thumbnail;
    delete color.thumbnailFallback;
    delete color.thumbnailAvif;
    delete color.thumb;
    delete color.thumbFallback;
    delete color.thumbAvif;

    if (image && !Array.isArray(color.images)) color.image = image;
    return color;
  });

  result.sizes = (Array.isArray(source.sizes) ? source.sizes : []).map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return String(entry || '').trim();
    const size = String(entry.size ?? entry.value ?? '').trim();
    const status = String(entry.status || 'available').trim() || 'available';
    if (status === 'available' && Object.keys(entry).every((key) => ['size', 'value', 'status'].includes(key))) {
      return size;
    }
    return { ...entry, size, status };
  }).filter(Boolean);

  const representedImages = new Set();
  result.colors.forEach((color) => {
    if (color && color.image) representedImages.add(color.image);
    if (color && Array.isArray(color.images)) color.images.forEach((image) => representedImages.add(image));
  });

  if (Array.isArray(source.images)) {
    const extras = source.images.filter((image) => image && !representedImages.has(image));
    if (extras.length) result.images = source.images;
  }

  const handled = new Set([
    ...preferredOrder,
    'colors', 'sizes', 'images', 'imageMap',
    'thumbnail', 'thumbnailFallback', 'thumbnailAvif',
    'thumb', 'thumbFallback', 'thumbAvif'
  ]);

  Object.keys(source).forEach((key) => {
    if (!handled.has(key)) result[key] = source[key];
  });

  return result;
}

function main() {
  const beforeText = fs.readFileSync(PRODUCTS_FILE, 'utf8').replace(/^\uFEFF/, '');
  const products = JSON.parse(beforeText);
  if (!Array.isArray(products)) throw new Error('products.json debe contener un array');

  const compacted = products.map(compactProduct);
  const afterText = `${JSON.stringify(compacted, null, 2)}\n`;
  const beforeBytes = Buffer.byteLength(beforeText);
  const afterBytes = Buffer.byteLength(afterText);
  const saved = beforeBytes - afterBytes;
  const pct = beforeBytes ? ((saved / beforeBytes) * 100).toFixed(1) : '0.0';

  console.log(`Productos: ${products.length}`);
  console.log(`Antes: ${(beforeBytes / 1024).toFixed(1)} KB`);
  console.log(`Despues: ${(afterBytes / 1024).toFixed(1)} KB`);
  console.log(`Ahorro estimado: ${(saved / 1024).toFixed(1)} KB (${pct}%)`);

  if (!shouldWrite) {
    console.log('Modo simulacion. Usa --write para modificar products.json.');
    return;
  }

  fs.writeFileSync(PRODUCTS_FILE, afterText, 'utf8');
  console.log('products.json compactado. Ejecuta npm run check:products antes de hacer commit.');
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
