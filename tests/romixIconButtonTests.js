const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'frontend', 'public');
const pages = ['index.html', 'catalogo.html', 'product.html', 'cart.html', 'ayuda.html', '404.html'];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function visibleText(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('svg, [aria-hidden="true"], .sr-only').forEach((node) => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function checkPage(page) {
  const document = new JSDOM(read(`frontend/public/${page}`)).window.document;
  const issues = [];

  document.querySelectorAll('button, a').forEach((element) => {
    const text = visibleText(element);
    const ariaLabel = (element.getAttribute('aria-label') || '').trim();
    const hasIcon = !!element.querySelector('svg, [data-romix-icon], .romix-icon');
    const hiddenScrim = element.matches('button.mobile-nav-scrim[hidden]');
    if (!text && !ariaLabel) issues.push(`${page}: control sin texto ni aria-label`);
    if (element.tagName === 'BUTTON' && !text && !hasIcon && !hiddenScrim) {
      issues.push(`${page}: botón icon-only sin icono local`);
    }
  });

  if (issues.length) throw new Error(issues.join('\n'));
}

function checkImplementation() {
  const pagesSource = pages.map((page) => read(`frontend/public/${page}`)).join('\n');
  const dynamicSource = [
    'frontend/public/index.html',
    'frontend/public/assets/js/romix-catalog-pages.js',
    'frontend/public/product.html',
    'frontend/public/cart.html',
    'frontend/public/assets/js/cart.js',
    'frontend/public/assets/js/search.js',
    'frontend/public/assets/js/size-guides.js'
  ].map(read).join('\n');

  if (/romix-emoji|emoji-icon|[😀-🙏🌀-🫿]/u.test(pagesSource + dynamicSource)) {
    throw new Error('Quedaron emojis o clases de emoji en la interfaz');
  }
  if (!dynamicSource.includes('window.romixIcon(')) {
    throw new Error('Los renderers dinámicos no están usando el registro Lucide local');
  }
  if (!read('frontend/public/assets/js/romix-icons.js').includes('window.romixIcon')) {
    throw new Error('Falta el runtime local de iconos');
  }
}

try {
  pages.forEach(checkPage);
  checkImplementation();
  console.log('romixIconButtonTests: passed');
} catch (error) {
  console.error('romixIconButtonTests: failed');
  console.error(error.message || error);
  process.exit(1);
}
