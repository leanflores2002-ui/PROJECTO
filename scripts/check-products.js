const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');
const PRODUCTS_FILE = path.join(PUBLIC_DIR, 'assets', 'data', 'products.json');
const ALLOWED_SEASONS = new Set(['verano', 'invierno', 'media-estacion']);

function stripDiacritics(value) {
  try {
    return value.normalize('NFD').replace(/\p{Diacritic}+/gu, '');
  } catch {
    return value;
  }
}

function cleanPath(value) {
  return String(value || '').trim().split(/[?#]/)[0];
}

function productColors(product) {
  if (Array.isArray(product.colors)) return product.colors;
  if (product.colors && typeof product.colors === 'object') return Object.values(product.colors);
  return [];
}

function resolveColorImage(product, color, index) {
  const source = color && typeof color === 'object' ? color : { name: color };
  const galleries = [source.images, source.imagenes, source.gallery, source.galeria, source.photos, source.fotos];
  const gallery = galleries.find((entry) => Array.isArray(entry) && entry.length);
  if (gallery && gallery[0]) return cleanPath(gallery[0]);

  const direct = cleanPath(source.image || source.imagen);
  if (direct) return direct;

  const name = String(source.name || source.value || '').trim();
  if (product.imageMap && typeof product.imageMap === 'object' && !Array.isArray(product.imageMap)) {
    if (cleanPath(product.imageMap[name])) return cleanPath(product.imageMap[name]);
    const target = stripDiacritics(name).toLowerCase();
    const key = Object.keys(product.imageMap).find((entry) => stripDiacritics(entry).toLowerCase() === target);
    if (key && cleanPath(product.imageMap[key])) return cleanPath(product.imageMap[key]);
  }

  if (Array.isArray(product.images) && product.images[index]) return cleanPath(product.images[index]);
  return cleanPath(product.image);
}

function isRemote(value) {
  return /^https?:\/\//i.test(value) || /^data:/i.test(value);
}

function publicFilePath(assetPath) {
  const normalized = cleanPath(assetPath).replace(/^\/+/, '');
  return path.join(PUBLIC_DIR, ...normalized.split('/'));
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
  let products;
  try {
    products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    console.error(`products.json no es JSON valido: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(products)) {
    console.error('products.json debe contener un array.');
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  const names = new Map();
  const referencedFiles = new Set();

  products.forEach((product, productIndex) => {
    const label = String(product && product.name || `Producto #${productIndex + 1}`).trim();

    ['section', 'type', 'name', 'season', 'price'].forEach((field) => {
      const value = product && product[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        errors.push(`${label}: falta "${field}".`);
      }
    });

    const season = stripDiacritics(String(product && product.season || '')).toLowerCase().trim();
    if (season && !ALLOWED_SEASONS.has(season)) {
      errors.push(`${label}: "season" debe ser verano, invierno o media-estacion.`);
    }

    if (product && Object.prototype.hasOwnProperty.call(product, 'visible') && typeof product.visible !== 'boolean') {
      errors.push(`${label}: "visible" debe ser true o false.`);
    }

    const nameKey = stripDiacritics(label).toLowerCase();
    if (names.has(nameKey)) {
      warnings.push(`${label}: nombre duplicado (tambien aparece en #${names.get(nameKey) + 1}).`);
    } else {
      names.set(nameKey, productIndex);
    }

    const colors = productColors(product);
    if (!colors.length) warnings.push(`${label}: no tiene colores; se mostrara como variante unica.`);

    const sizes = Array.isArray(product && product.sizes) ? product.sizes : [];
    if (!sizes.length) warnings.push(`${label}: no tiene talles declarados.`);

    colors.forEach((color, colorIndex) => {
      const colorName = String(color && typeof color === 'object' ? (color.name || color.value || '') : color).trim() || `Color ${colorIndex + 1}`;
      const image = resolveColorImage(product, color, colorIndex);
      if (!image) {
        errors.push(`${label} / ${colorName}: no se pudo resolver una imagen.`);
        return;
      }
      if (isRemote(image)) return;
      referencedFiles.add(image);
      const absolute = publicFilePath(image);
      if (!fs.existsSync(absolute)) {
        errors.push(`${label} / ${colorName}: falta ${image}`);
        return;
      }
      const bytes = fs.statSync(absolute).size;
      if (bytes > 1.5 * 1024 * 1024) {
        warnings.push(`${label} / ${colorName}: ${image} pesa ${formatMb(bytes)}; conviene convertirla a WebP.`);
      }
    });
  });

  console.log(`Catalogo: ${products.length} productos.`);
  if (warnings.length) {
    console.log(`Advertencias (${warnings.length}):`);
    warnings.slice(0, 30).forEach((warning) => console.log(`  - ${warning}`));
    if (warnings.length > 30) console.log(`  ... y ${warnings.length - 30} advertencias mas.`);
  }

  if (errors.length) {
    console.error(`Errores (${errors.length}):`);
    errors.slice(0, 50).forEach((error) => console.error(`  - ${error}`));
    if (errors.length > 50) console.error(`  ... y ${errors.length - 50} errores mas.`);
    process.exit(1);
  }

  console.log(`OK: ${products.length} productos y ${referencedFiles.size} imagenes principales validadas.`);
}

main();
