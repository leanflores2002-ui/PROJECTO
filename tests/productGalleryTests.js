const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'frontend', 'public');
const productHtml = fs.readFileSync(path.join(root, 'product.html'), 'utf8');
const productCss = fs.readFileSync(path.join(root, 'assets', 'css', 'romix-product-detail.css'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sourceHtml = fs.readFileSync(path.join(__dirname, '../frontend/src/templates/product.html'), 'utf8');
const cssHref = html => html.match(/href="(assets\/css\/romix-product-detail\.css\?v=[^"&]+)"/)?.[1];
assert(cssHref(productHtml), 'El CSS de detalle debe conservar una versión para invalidar caché');
assert(cssHref(sourceHtml) === cssHref(productHtml), 'Fuente y página generada deben usar la misma versión CSS');
assert(fs.existsSync(path.join(root, cssHref(productHtml).split('?')[0])), 'El recurso CSS referenciado debe existir');
assert((productHtml.match(/id="zoom-modal"/g) || []).length === 1, 'Debe existir un solo zoom-modal en el template');
assert((productHtml.match(/id="zoom-image"/g) || []).length === 1, 'Debe existir una sola zoom-image en el template');
assert(productHtml.includes('window.romixIcon("ChevronDown"'), 'La navegación vertical debe usar iconos locales');
assert(!productHtml.includes('setupInlineZoom'), 'No debe quedar zoom inline');
assert(!productHtml.includes('hoverZoomActive'), 'No debe quedar zoom por hover');
assert(!productHtml.includes('--zoom-x') && !productHtml.includes('--zoom-y'), 'No deben quedar variables de zoom inline');
assert(!productHtml.includes("addEventListener('wheel'"), 'No debe quedar wheel zoom');
assert(productHtml.includes('zoomApi.setGallery(gallery)'), 'El cambio de color debe mantener sincronizado el lightbox');
assert(productCss.includes('--product-gallery-height: clamp(520px, 68vh, 700px)'), 'Desktop debe limitar la altura de la galería');
assert(productCss.includes('height: var(--product-gallery-height)'), 'La imagen y thumbs deben compartir altura controlada');
assert(productCss.includes('overflow-y: auto; overflow-x: hidden'), 'Las miniaturas desktop deben scrollear internamente');
assert(productCss.includes('flex-direction: row'), 'Las miniaturas mobile deben ser horizontales');
assert(productCss.includes('background: transparent'), 'El stage del zoom debe ser transparente');
assert(productCss.includes('position: static; width: auto; height: auto'), 'La imagen del zoom no debe ocupar el stage por absolute 100%');
assert(productCss.includes('max-width: calc(100vw - 140px)'), 'La imagen desktop debe respetar los controles laterales');
assert(productCss.includes('max-height: calc(100dvh - 96px)'), 'La imagen mobile debe respetar el viewport');
assert(productHtml.includes('Math.min(2, value)'), 'El zoom máximo debe ser 2x');

console.log('productGalleryTests: passed');
