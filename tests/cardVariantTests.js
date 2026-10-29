const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function readPublic(relativePath) {
  return fs.readFileSync(path.join(PUBLIC_DIR, ...relativePath.split('/')), 'utf8');
}

function wait(window, ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function main() {
  const catalogSource = readPublic('assets/js/romix-catalog-pages.js');
  const homeSource = readPublic('index.html');
  const homeCss = readPublic('assets/css/romix-home-bundle.css');
  assert(homeSource.includes('assets/css/romix-home-bundle.css'), 'Home must load the styles under test');
  const catalogCss = readPublic('assets/css/romix-catalog-pages.css');
  const imageUtilsSource = readPublic('assets/js/romix-image-utils.js');

  assert(catalogSource.includes('colorOption && colorOption.image'), 'Catálogo debe priorizar color.image');
  assert(catalogSource.includes('product-variant-thumbs'), 'Catálogo debe renderizar miniaturas');
  assert(!catalogSource.includes('product-color-swatches') && !catalogSource.includes('product-color-swatch'), 'Catálogo no debe renderizar swatches en las cards');
  assert(catalogSource.includes('let variantRequestId = 0'), 'Catálogo debe tener token por card');
  assert(catalogSource.includes('image.currentSrc || image.src'), 'Catálogo debe considerar currentSrc');
  assert(!catalogSource.includes('thumb.classList.remove("is-loaded")'), 'Catálogo no debe ocultar la foto anterior');
  assert(catalogSource.includes('getSwatchPath'), 'Catálogo debe resolver swatches derivados');
  assert(homeSource.includes('setImg(variant, variant.name)'), 'Home debe pasar la variante completa al selector');
  assert(homeSource.includes('product-variant-thumbs'), 'Home debe renderizar miniaturas');
  assert(!homeSource.includes('product-color-swatches') && !homeSource.includes('product-color-swatch'), 'Home no debe renderizar swatches en las cards');
  assert(!homeSource.includes('thumbLink.classList.remove("is-loaded")'), 'Home no debe ocultar la foto anterior');
  assert(homeSource.includes('getSwatchPath'), 'Home debe resolver swatches derivados');
  assert(catalogCss.includes('.product-thumb img { object-fit: contain; object-position: center; opacity: 1;'), 'Catálogo debe mantener la imagen visible');
  assert(/\.product-thumb img \{[\s\S]{0,400}?opacity:\s*1;/.test(homeCss), 'Home debe mantener la imagen visible');
  assert(imageUtilsSource.includes('function loadImageResource(src)'), 'Debe existir precarga reutilizable');
  assert(imageUtilsSource.includes('probe.complete && probe.naturalWidth > 0'), 'La precarga debe contemplar caché');

  const dom = new JSDOM(readPublic('catalogo.html'), {
    runScripts: 'outside-only',
    url: 'http://localhost/catalogo.html'
  });
  const { window } = dom;

  class TestImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.onload = null;
      this.onerror = null;
      this._src = '';
    }

    set src(value) {
      this._src = value;
      const source = String(value || '');
      const delay = source.includes('gris') ? 35 : source.includes('negro') ? 25 : 5;
      window.setTimeout(() => {
        if (source.includes('broken')) {
          this.complete = true;
          this.naturalWidth = 0;
          if (this.onerror) this.onerror(new Error('broken'));
          return;
        }
        this.complete = true;
        this.naturalWidth = 100;
        if (this.onload) this.onload();
      }, delay);
    }

    get src() {
      return this._src;
    }

    decode() {
      return new Promise((resolve, reject) => {
        window.setTimeout(() => {
          if (String(this._src).includes('broken')) reject(new Error('broken'));
          else resolve();
        }, String(this._src).includes('gris') ? 35 : String(this._src).includes('negro') ? 25 : 5);
      });
    }
  }

  window.Image = TestImage;
  window.eval(imageUtilsSource);
  window.romixProductsStore = {
    load: async () => [{
      id: 'variant-test',
      name: 'Babucha variante test',
      section: 'mujer',
      type: 'pantalones',
      price: 10000,
      image: 'images/products/default.webp',
      colors: [
        { name: 'Negro', hex: '#000000', image: 'images/products/negro.webp' },
        { name: 'Gris oscuro', hex: '#4B4B4B', image: 'images/products/gris-oscuro.webp' },
        { name: 'Azul', hex: '#1E4ED8', image: 'images/products/azul.webp' },
        { name: 'Estampado 1', hex: '#1F4FA8', image: 'images/products/estampado-1.webp' },
        { name: 'Rosa', hex: '#F2A7C6', image: 'images/products/rosa.webp' },
        { name: 'Verde', hex: '#2E7D32', image: 'images/products/verde.webp' }
      ],
      sizes: ['2'],
      stockStatus: 'available'
    }],
    isVisible: () => true
  };
  window.romixCart = { updateBadge() {} };
  window.eval(readPublic('assets/js/catalog-sections.js'));
  window.eval(catalogSource);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await wait(window, 45);

  const card = window.document.querySelector('.product-card');
  assert(card, 'Debe renderizarse una card de prueba');
  const image = card.querySelector('.product-thumb img');
  assert(card.querySelectorAll('.product-variant-thumb').length === 4, 'La card debe mostrar cuatro miniaturas visibles');
  assert(card.querySelector('.product-variant-more').textContent.trim() === '+2', 'Las miniaturas deben mostrar overflow +n');
  assert(card.querySelectorAll('.product-variant-thumbs').length === 1, 'La card debe mostrar una sola fila de variantes');
  assert(!card.querySelector('.product-color-swatches'), 'La card no debe mostrar una fila de swatches');
  assert(!card.querySelector('.product-color-swatch'), 'La card no debe mostrar círculos de color');

  card.querySelector('.product-variant-thumb[data-variant-index="2"]').click();
  await wait(window, 20);
  assert(image.src.endsWith('/images/thumbs/azul.webp'), 'Click en miniatura debe cambiar la imagen principal al derivado de card');
  assert(card.querySelector('.product-variant-thumb[data-variant-index="2"]').classList.contains('is-active'), 'La miniatura seleccionada debe quedar activa');

  card.querySelector('.product-variant-thumb[data-variant-index="1"]').click();
  card.querySelector('.product-variant-thumb[data-variant-index="2"]').click();
  await wait(window, 20);
  assert(image.src.endsWith('/images/thumbs/azul.webp'), 'El último click debe ganar la carrera de precarga');
  assert(card.querySelector('.product-thumb').classList.contains('is-loaded'), 'La card debe conservar is-loaded tras cambiar variante');
  assert(card.querySelectorAll('.product-thumb picture source').length === 0, 'No debe quedar un source anterior en picture');

  card.querySelector('.product-variant-thumb[data-variant-index="2"]').click();
  assert(card.querySelector('.product-thumb').classList.contains('is-loaded'), 'Repetir la misma variante no debe ocultar la imagen');
  assert(image.src.endsWith('/images/thumbs/azul.webp'), 'Repetir la variante debe conservar su imagen');

  dom.window.close();
  console.log('cardVariantTests: passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
