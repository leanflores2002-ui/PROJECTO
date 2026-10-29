const assert = require('node:assert/strict');
const path = require('node:path');
const { JSDOM } = require('jsdom');

async function load(seed = {}, blocked = false) {
  const dom = new JSDOM('<!doctype html><script src="assets/js/cart.js"></script>', {
    url: 'https://romix.test/', runScripts: 'dangerously',
    resources: new (class extends require('jsdom').ResourceLoader {
      fetch() { return Promise.resolve(require('node:fs').readFileSync(path.join(__dirname, '../frontend/public/assets/js/cart.js'))); }
    })(),
    beforeParse(window) {
      window.romixIcon = () => '';
      for (const [key, value] of Object.entries(seed)) window.localStorage.setItem(key, value);
      if (blocked) window.Storage.prototype.setItem = () => { throw new window.DOMException('blocked', 'SecurityError'); };
    }
  });
  await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
  return dom;
}
const product = { productId: 'p1', name: 'Remerón & algodón', color: 'Azul', size: '2', price: 5000, qty: 1 };
(async () => {
  const dom = await load();
  try {
    const { romixCart: cart } = dom.window;
    const message = decodeURIComponent(cart.buildWhatsAppMessage([product, { ...product, name: 'Blusa 50% + algodón', size: 'U', qty: 2 }]));
    assert.equal(message.split('\n').length, 2);
    assert.ok(message.includes('Remerón & algodón') && message.includes('Blusa 50% + algodón') && message.includes('Talle: U'));
    assert.ok(!message.includes('$') && !message.includes('Total'));
    const measured = [];
    dom.window.addEventListener('romix:analytics-cart-added', event => measured.push(event.detail.item.qty));
    cart.addToCart(product);
    cart.addToCart({ ...product, qty: 2 });
    assert.equal(cart.getCart()[0].qty, 3);
    assert.deepEqual(measured, [1, 2], 'Analytics measures the addition, not accumulated quantity');
    for (const change of [{ color: 'Rojo' }, { size: '3' }, { productId: 'p2' }]) {
      cart.addToCart({ ...product, ...change, key: cart.getCart()[0].key });
    }
    assert.equal(cart.getCart().length, 4, 'Supplied keys cannot merge different variants');
    const key = cart.getCart()[0].key;
    const before = JSON.stringify(cart.getCart());
    for (const qty of [0, -1, 1.5, NaN, Infinity, '', null, true, [], [1], {}, Number.MAX_SAFE_INTEGER + 1]) {
      cart.addToCart({ ...product, qty });
      cart.updateQty(key, qty);
      assert.equal(JSON.stringify(cart.getCart()), before, `Invalid quantity: ${String(qty)}`);
    }
    cart.updateQty(key, 4);
    assert.equal(cart.getCartTotals().totalItems, 7);
    cart.removeFromCart(key);
    assert.equal(cart.getCart().length, 3);
    cart.clearCart();
    assert.equal(cart.getCart().length, 0);
  } finally { dom.window.close(); }
  for (const value of ['{broken', '{}', 'null']) {
    const corrupt = await load({ romix_cart: value });
    try { assert.equal(corrupt.window.romixCart.getCart().length, 0); } finally { corrupt.window.close(); }
  }
  const recovered = await load({ romix_cart: JSON.stringify([product]) });
  try { assert.equal(recovered.window.romixCart.getCart()[0].qty, 1); } finally { recovered.window.close(); }
  const blocked = await load({ cart: JSON.stringify([product]) }, true);
  try {
    let successes = 0;
    blocked.window.addEventListener('romix:cart-item-added', () => successes++);
    blocked.window.romixCart.addToCart(product);
    assert.equal(successes, 0);
    assert.equal(blocked.window.romixCart.getStatus().persisted, false);
    assert.ok(blocked.window.localStorage.getItem('cart'), 'Failed migration retains recoverable legacy data');
  } finally { blocked.window.close(); }
  const measurement = await load();
  try {
    const additions = [], removals = [];
    const w = measurement.window, cart = w.romixCart;
    w.addEventListener('romix:analytics-cart-added', e => additions.push(e.detail.item.qty));
    w.addEventListener('romix:analytics-cart-removed', e => removals.push(e.detail.items.reduce((n, item) => n + item.qty, 0)));
    cart.addToCart(product);
    const key = cart.getCart()[0].key;
    cart.updateQty(key, 4);
    cart.updateQty(key, 4);
    cart.updateQty(key, 2);
    cart.removeFromCart(key);
    cart.removeFromCart(key);
    cart.addToCart({ ...product, qty: 3 });
    cart.clearCart({ forOrder: true });
    cart.addToCart({ ...product, qty: 2 });
    cart.clearCart();
    assert.deepEqual(additions, [1, 3, 3, 2], 'Quantity changes measure the delta, not the new total');
    assert.deepEqual(removals, [2, 2, 2], 'Order handoff is not a removal or abandonment');
  } finally { measurement.window.close(); }
  console.log('cartPersistenceTests: passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
