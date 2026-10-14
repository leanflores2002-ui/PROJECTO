const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'frontend', 'public');
const pages = ['index.html', 'catalogo.html', 'product.html', 'cart.html', 'ayuda.html', '404.html'];

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function visibleText(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('svg, [aria-hidden="true"]').forEach((node) => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function isButtonLike(element) {
  if (element.tagName.toLowerCase() === 'button') return true;
  return Array.from(element.classList).some((token) => /^(?:romix-btn|btn|btn-primary|btn-secondary|product-cta|catalog-cta|product-action|card-action)$/.test(token));
}

function checkPageControls(page) {
  const html = read(path.join('frontend', 'public', page));
  const document = new JSDOM(html).window.document;
  const issues = [];

  document.querySelectorAll('button, a').forEach((element) => {
    const text = visibleText(element);
    const ariaLabel = (element.getAttribute('aria-label') || '').trim();
    const hasSvg = !!element.querySelector('svg');
    const hiddenScrim = element.matches('button.mobile-nav-scrim[hidden]');

    if (!text && !ariaLabel) {
      issues.push(`${page}: ${element.tagName.toLowerCase()} sin texto visible ni aria-label (${element.outerHTML.slice(0, 180)})`);
      return;
    }
    if (isButtonLike(element) && !text && !hasSvg && !hiddenScrim) {
      issues.push(`${page}: control icon-only sin SVG visible (${element.outerHTML.slice(0, 180)})`);
    }
  });

  assert(issues.length === 0, issues.join('\n'));
}

function checkDynamicRenderers() {
  const home = read('frontend/public/index.html');
  const catalog = read('frontend/public/assets/js/romix-catalog-pages.js');
  const product = read('frontend/public/product.html');
  const cart = read('frontend/public/cart.html');
  const sizeGuides = read('frontend/public/assets/js/size-guides.js');
  const cartJs = read('frontend/public/assets/js/cart.js');
  const search = read('frontend/public/assets/js/search.js');

  assert(home.includes('cta.textContent = "Detalles"'), 'Inicio: el CTA de tarjetas debe decir Detalles');
  assert(catalog.includes('card.setAttribute("aria-label", "Ver detalles de " + product.name)'), 'Catálogo: la tarjeta dinámica debe exponer la acción de detalle');
  assert(catalog.includes('detailsLink.textContent = "Detalles"'), 'Catálogo: la acción de detalle debe mostrar Detalles');
  assert(catalog.includes('controls.button.textContent = remaining > step ? "Ver " + step + " mas" : "Ver mas"'), 'Catálogo: el control Ver más debe conservar una etiqueta visible');
  assert(catalog.includes('remove.innerHTML = \'<svg'), 'Catálogo: quitar filtro debe usar SVG visible');
  assert(product.includes('>Agregar al carrito</button>'), 'Producto: falta Agregar al carrito');
  assert(product.includes('>Comprar ahora</button>'), 'Producto: falta Comprar ahora');
  assert(/>\s*Compartir\s*<\/button>/.test(product), 'Producto: falta Compartir');
  assert(sizeGuides.includes('<strong>Gu&iacute;a de talles</strong>'), 'Producto: falta Guía de talles');
  assert(cart.includes('>Vaciar carrito</button>'), 'Carrito: falta Vaciar carrito');
  assert(cart.includes('>Continuar comprando</a>'), 'Carrito: falta Continuar comprando');
  assert(cart.includes('> Enviar pedido</button>'), 'Carrito: falta Enviar pedido');
  assert(cart.includes('aria-label="Disminuir"') && cart.includes('aria-label="Aumentar"'), 'Carrito: faltan etiquetas de cantidad');
  assert(cart.includes('aria-label="Eliminar"><svg'), 'Carrito: eliminar debe conservar aria-label y SVG');
  assert(cartJs.includes('aria-label="Cerrar"><svg'), 'Panel de carrito: cerrar debe conservar aria-label y SVG');
  assert(search.includes('aria-label="Limpiar b&uacute;squeda" hidden><svg'), 'Búsqueda: limpiar debe conservar aria-label y SVG');
}

function checkIconTouchTarget() {
  const designSystem = read('frontend/public/assets/css/romix-design-system.css');
  const header = read('frontend/public/assets/css/romix-header.css');
  const sizeGuide = read('frontend/public/assets/css/size-guide-drawer.css');
  assert(designSystem.includes('--romix-control-md: 44px'), 'El token de control medio debe mantener 44px');
  assert(/\.romix-icon-btn[\s\S]*?width:\s*var\(--romix-control-height\)/.test(designSystem), 'Los controles icon-only deben tener ancho táctil compartido');
  assert(header.includes('global-search.romix-search-form .romix-search-clear {\n  position: absolute;') && header.includes('width: 44px;'), 'Limpiar búsqueda debe tener target táctil de 44px');
  assert(/\.size-guide-drawer__x\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/.test(sizeGuide), 'Cerrar guía debe tener target táctil de 44px');
  assert(!/button:empty::after/.test(designSystem + header + sizeGuide), 'No se permite texto generado por CSS para etiquetar botones');
}

function main() {
  pages.forEach(checkPageControls);
  checkDynamicRenderers();
  checkIconTouchTarget();
  console.log('buttonLabelTests: passed');
}

try {
  main();
} catch (error) {
  console.error('buttonLabelTests: failed');
  console.error(error.message || error);
  process.exit(1);
}
