const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');
// Load the real storefront assets without requiring a server on privileged port 80.
class StorefrontResources extends ResourceLoader {
  fetch(url) {
    const parsed = new URL(url);
    if (parsed.origin !== 'http://localhost') return null;
    const publicDir = path.resolve(__dirname,'../frontend/public');
    const file = path.resolve(publicDir,'.'+decodeURIComponent(parsed.pathname));
    if (!file.startsWith(publicDir+path.sep) || !fs.existsSync(file)) return null;
    return Promise.resolve(fs.readFileSync(file));
  }
}

async function prepareCartDom(cartItems) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'public', 'cart.html'), 'utf8');
  const events = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: new StorefrontResources(),
    url: 'http://localhost/',
    beforeParse(window) {
      window.localStorage.setItem('cart', JSON.stringify(cartItems));
      window.alert = () => {};
      window.open = (url, target) => {
        const entry = { url, target };
        events.push(entry);
        return { opener: null, location: { set href(value) { entry.url = value; } } };
      };
    }
  });

  await new Promise(resolve => {
    if (dom.window.document.readyState === 'complete') {
      resolve();
    } else {
      dom.window.addEventListener('load', () => resolve(), {once:true});
    }
  });

  await new Promise(resolve => setImmediate(resolve));
  return { dom, events };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

(async function main() {
  const cart = [
    {
      id: '1',
      name: 'Calza%20gofrada%20lycra%20dama',
      type: 'calzas',
      color: 'Azul%20Intenso',
      size: '2',
      quantity: 1,
      price: 11500,
      subtotal: 11500
    },
    {
      id: '2',
      name: 'Blusa%20clásica',
      type: 'remeras',
      color: 'Coral',
      size: '4',
      quantity: 2,
      price: 7200,
      subtotal: 14400
    }
  ];

  const { dom, events } = await prepareCartDom(cart);
  dom.window.orderCartWhatsApp();
  assert(events.length === 1, 'orderCartWhatsApp should open WhatsApp once');

  const url = new URL(events[0].url);
  const textParam = url.searchParams.get('text') || '';
  const message = decodeURIComponent(textParam);

  assert(message.includes('Calza gofrada lycra dama (calzas)'), 'Product name should be decoded');
  assert(message.includes('Color: Azul Intenso'), 'Color should be decoded');
  assert(message.includes('Talle: 2'), 'Numeric size must appear in the message');
  assert(message.includes('Talle: 4'), 'All cart entries must show their sizes');
  assert(!message.includes('Total:') && !message.includes('$'), 'WhatsApp orders must not include prices or a total');
  assert(message.includes('Cant: 1') && message.includes('Cant: 2'), 'Requested quantities must be preserved');
  assert(!message.includes('Talle: U'), 'Fallback size marker should not leak into the message');

  dom.window.close();
  console.log('cartOrderTests: passed');
})().catch(err => {
  console.error('cartOrderTests: failed');
  console.error(err);
  process.exit(1);
});
