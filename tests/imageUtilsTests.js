const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function loadImageUtils() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost/'
  });
  const scriptPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'romix-image-utils.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  dom.window.eval(source);
  return { dom, utils: dom.window.romixImageUtils };
}

(function main() {
  const { dom, utils } = loadImageUtils();
  const product = {
    image: 'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.webp',
    images: [
      'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.webp',
      'images/products/chaleco_polar_con_corderito_hombre_invierno_verde.webp'
    ],
    imageMap: {
      Negro: 'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.webp',
      Verde: 'images/products/chaleco_polar_con_corderito_hombre_invierno_verde.webp'
    },
    colors: [
      { name: 'Negro' },
      { name: 'Verde' }
    ],
  };

  const greenImage = utils.getSafeProductImage(product, 'Verde', 1);
  assert(
    greenImage === 'images/products/chaleco_polar_con_corderito_hombre_invierno_verde.webp',
    'La imagen segura debe priorizar la imagen original del color Verde'
  );

  const thumbSources = utils.getSafeProductThumbSources(product, 'Negro', 0);
  assert(
    thumbSources[0] === 'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_negro.webp',
    'Las miniaturas deben priorizar el derivado de card cuando no hay thumb explícito'
  );

  const greenThumbSet = utils.getProductThumbSet(product, 'Verde');
  assert(
    greenThumbSet.src === 'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_verde.webp',
    'La miniatura de un color seleccionado debe usar el derivado de card del color'
  );

  const explicitColorImage = 'images/products/chaleco_verde_canonico.webp';
  const explicitColorThumb = 'images/thumbs/chaleco_verde_canonico.webp';
  const explicitColorSet = utils.getProductThumbSet({
    image: 'images/products/chaleco_default.webp',
    thumbnail: 'images/thumbs/chaleco_default.webp',
    colors: [{ name: 'Verde', image: explicitColorImage, thumb: explicitColorThumb }]
  }, { name: 'Verde', image: explicitColorImage, thumb: explicitColorThumb });
  assert(explicitColorSet.originalSrc === explicitColorImage, 'originalSrc debe priorizar color.image');
  assert(explicitColorSet.src === explicitColorThumb, 'src debe priorizar color.thumb sobre color.image');

  const productWithColorGalleries = {
    image: 'images/products/chaleco_negro_1.webp',
    colors: [
      {
        name: 'Negro',
        images: [
          'images/products/chaleco_negro_1.webp',
          'images/products/chaleco_negro_2.webp'
        ]
      },
      {
        name: 'Verde olivo',
        slug: 'verde-olivo',
        imagenes: [
          'images/products/chaleco_verde_1.webp',
          'images/products/chaleco_verde_2.webp'
        ]
      }
    ]
  };

  const resolvedColors = utils.resolveProductColorEntries(productWithColorGalleries);
  assert(
    resolvedColors[1].image === 'images/products/chaleco_verde_1.webp',
    'El color debe usar la primera imagen de su propio array como imagen principal'
  );
  assert(
    Array.isArray(resolvedColors[1].images) && resolvedColors[1].images.length === 2,
    'Cada color debe conservar su propio array de imagenes sin mezclar miniaturas'
  );
  assert(
    utils.getColorImage(productWithColorGalleries, 'Verde olivo') === 'images/products/chaleco_verde_1.webp',
    'La busqueda por nombre de color debe resolver su primera imagen exacta'
  );

  const img = dom.window.document.createElement('img');
  utils.applyImageWithFallback(
    img,
    [
      'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.webp',
      'images/does-not-exist.webp'
    ],
    'Chaleco ROMIX',
    { placeholder: 'images/placeholder-product.png' }
  );
  assert(
    img.getAttribute('src') === 'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.webp',
    'El primer intento debe usar la imagen canónica'
  );
  img.onerror();
  assert(
    img.getAttribute('src') === 'images/does-not-exist.webp',
    'La cadena de fallback debe conservar la siguiente fuente explícita'
  );
  img.onerror();
  assert(
    img.getAttribute('src') === 'images/placeholder-product.png',
    'Si agota las fuentes debe terminar en placeholder'
  );

  const unusualPath = 'images/products/Calza_algodon con_lycra gris, oscuro.webp';
  const encodedPath = 'images/products/Calza_algodon%20con_lycra%20gris%2C%20oscuro.webp';
  assert(utils.srcsetUrl(unusualPath) === encodedPath, 'Srcset candidates must encode spaces and commas');
  assert(utils.srcsetUrl(encodedPath) === encodedPath, 'Already encoded filenames must not be double encoded');
  const picture = utils.createPicture({src: 'images/fallback.png', webpSrc: unusualPath, avifSrc: unusualPath.replace('.webp', '.avif')});
  assert(picture.picture.querySelector('source[type="image/webp"]').getAttribute('srcset') === encodedPath, 'Picture sources must use the complete encoded URL');
  assert(picture.img.getAttribute('src') === 'images/fallback.png', 'Srcset repair must preserve the original fallback');

  console.log('imageUtilsTests: passed');
})();
