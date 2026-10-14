const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  runScripts: 'dangerously',
  url: 'http://localhost/'
});
const source = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'products-store.js'), 'utf8');
dom.window.eval(source);
const store = dom.window.romixProductsStore;

const image = 'images/products/capri_lycra_estampado_1.webp';
const normalized = store.normalizeProduct({
  id: 'capri-test',
  name: 'Capri test',
  image,
  colors: [{ name: 'Estampado 1' }]
});

assert.equal(normalized.image, image, 'La imagen principal debe conservar la ruta canónica');
assert.equal(normalized.thumbnail, image, 'thumbnail debe caer a image cuando no hay thumbnail explícito');
assert.equal(normalized.thumbnailFallback, image, 'thumbnailFallback debe caer a image');
assert.equal(normalized.colors[0].image, image, 'Una variante simple debe reutilizar la imagen del producto');
assert.deepEqual(Array.from(normalized.images), [image], 'images debe derivarse de las variantes sin duplicar rutas');
assert.equal(normalized.imageMap['Estampado 1'], image, 'imageMap debe derivarse de la variante');

const legacy = store.normalizeProduct({
  id: 'legacy-test',
  imageBase: 'legacy-product',
  colors: [{ name: 'Negro' }]
});
assert.equal(legacy.colors[0].image, 'images/products/legacy-product_negro.webp', 'El formato imageBase debe usar WebP por defecto');
assert.equal(legacy.thumbnail, legacy.image, 'El fallback legacy también debe evitar rutas derivadas');

console.log('productImageResolverTests: passed');
