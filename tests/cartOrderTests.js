const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

class LocalResourceLoader extends ResourceLoader {
  fetch(url) {
    const parsed = new URL(url);
    if (parsed.hostname !== 'localhost') return null;
    const localPath = path.join(__dirname, '..', 'frontend', 'public', parsed.pathname.replace(/^\//, ''));
    if (!fs.existsSync(localPath) || fs.statSync(localPath).isDirectory()) return null;
    return Promise.resolve(fs.readFileSync(localPath));
  }
}

async function prepareCartDom(cartItems) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'public', 'cart.html'), 'utf8');
  const events = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: new LocalResourceLoader(),
    virtualConsole: new VirtualConsole(),
    url: 'http://localhost/',
    beforeParse(window) {
      window.localStorage.setItem('cart', JSON.stringify(cartItems));
      window.alert = () => {};
      window.open = (url, target) => {
        events.push({ url, target });
        return { opener: null };
      };
    }
  });

  await new Promise(resolve => {
    const fallback = setTimeout(resolve, 2500);
    if (dom.window.document.readyState === 'complete') {
      clearTimeout(fallback);
      resolve();
    } else {
      dom.window.addEventListener('load', () => {
        clearTimeout(fallback);
        resolve();
      }, { once: true });
    }
  });

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
  const orderButton = dom.window.document.getElementById('order-btn');
  assert(orderButton, 'Order button should exist');
  orderButton.click();
  assert(events.length === 1, 'orderCartWhatsApp should open WhatsApp once');

  const url = new URL(events[0].url);
  const textParam = url.searchParams.get('text') || '';
  const message = decodeURIComponent(textParam);

  assert(message.includes('Calza gofrada lycra dama (calzas)'), 'Product name should be decoded');
  assert(message.includes('Color: Azul Intenso'), 'Color should be decoded');
  assert(message.includes('Talle: 2'), 'Numeric size must appear in the message');
  assert(message.includes('Talle: 4'), 'All cart entries must show their sizes');
  assert(message.includes('Total: $25900.00'), 'Total must be included');
  assert(!message.includes('Talle: U'), 'Fallback size marker should not leak into the message');

  dom.window.close();
  console.log('cartOrderTests: passed');
})().catch(err => {
  console.error('cartOrderTests: failed');
  console.error(err);
  process.exit(1);
});
