const assert = require('node:assert/strict');
const { initAnalytics } = require('../frontend/public/assets/js/romix-analytics');
function load(hostname, choice = 'accepted', blocked = false) {
  const listeners = {}, scripts = [], window = { addEventListener: (name, handler) => { listeners[name] = handler; } };
  const context = { window, location: { hostname, href: `https://${hostname}/product.html?id=p1&message=private&phone=123` }, document: { referrer: 'https://example.com/?phone=private', createElement: () => ({}), head: { appendChild: script => scripts.push(script) } }, URL, Date };
  window.localStorage = { getItem: () => { if (blocked) throw new Error('Storage blocked'); return choice; }, setItem: (_key, value) => { choice = value; } };
  initAnalytics(context);
  return { window, listeners, scripts, context };
}
for (const host of ['localhost', '127.0.0.1', 'romix-preview.vercel.app', 'romix-preview.netlify.app']) {
  const test = load(host);
  assert.equal(test.scripts.length, 0, 'Nonproduction must not load Google');
  assert.equal(test.window.dataLayer, undefined);
}
const test = load('romix-ropas.vercel.app');
assert.equal(test.scripts.length, 1);
initAnalytics(test.context);
assert.equal(test.scripts.length, 1, 'Duplicate initialization must not duplicate page views');
assert.ok(test.window.dataLayer.every(entry => Object.prototype.toString.call(entry) === '[object Arguments]'), 'Google tag commands require the official arguments format');
const commands = Array.from(test.window.dataLayer);
assert.equal(commands.filter(entry => entry[0] === 'js').length, 1);
assert.equal(commands.filter(entry => entry[0] === 'config').length, 1, 'One Google config sends one automatic page view');
const config = commands.find(entry => entry[0] === 'config')[2];
assert.notEqual(config.send_page_view, false);
assert.equal(config.page_location, 'https://romix-ropas.vercel.app/product.html?id=p1');
assert.equal(config.page_referrer, 'https://example.com/');
const product = { id: 'p1', name: 'Calza', price: 10000 };
test.listeners['romix:product-viewed']({ detail: { product } });
test.listeners['romix:product-viewed']({ detail: { product } });
test.listeners['romix:analytics-cart-added']({ detail: { item: { productId: 'p1', name: 'Calza', qty: 2, price: 10000, phone: 'private', message: 'private' } } });
test.window.romixAnalytics.trackWhatsApp([{ productId: 'p1', name: 'Calza', qty: 3, price: 10000 }]);
const events = Array.from(test.window.dataLayer).filter(entry => entry[0] === 'event');
assert.equal(events.map(entry => entry[1]).join(','), 'view_item,add_to_cart,whatsapp_order_click');
assert.equal(events[1][2].value, 20000);
assert.equal(events[1][2].items[0].quantity, 2);
assert.equal(events[2][2].value, 30000);
assert.ok(!JSON.stringify(events).includes('private'));
assert.ok(!events.some(entry => entry[1] === 'purchase'), 'A WhatsApp consultation is not a confirmed purchase');
for (const entry of events) {
  assert.deepEqual(Object.keys(entry[2]).sort(), ['currency', 'items', 'value']);
  for (const item of entry[2].items) assert.deepEqual(Object.keys(item).sort(), ['item_brand', 'item_category', 'item_id', 'item_name', 'price', 'quantity']);
}
const key = 'romix.analytics-consent.v1';
for (const choice of [null, 'rejected', 'invalid']) {
  const pending = load('romix-ropas.vercel.app', choice);
  assert.equal(pending.scripts.length, 0, 'No Google before explicit acceptance');
  assert.equal(pending.window.dataLayer, undefined, 'No events queued before acceptance');
  pending.window.localStorage.setItem(key, 'accepted');
  pending.listeners['romix:analytics-consent-changed']();
  assert.equal(pending.scripts.length, 1);
  const defaults = Array.from(pending.window.dataLayer).find(x => x[0] === 'consent');
  assert.equal(defaults[2].analytics_storage, 'granted');
  for (const field of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(defaults[2][field], 'denied');
  pending.window.localStorage.setItem(key, 'rejected');
  pending.listeners['romix:analytics-consent-changed']();
  const count = pending.window.dataLayer.length;
  pending.window.romixAnalytics.trackWhatsApp([{ id: 'p1', price: 10 }]);
  assert.equal(pending.window.dataLayer.length, count, 'Revoked consent blocks events');
  assert.equal(pending.window['ga-disable-G-JJB0XY6PPR'], true);
}
assert.equal(load('romix-ropas.vercel.app', 'accepted', true).scripts.length, 0, 'Storage errors fail closed');
const blockedWithdrawal = load('romix-ropas.vercel.app');
blockedWithdrawal.listeners['romix:analytics-consent-changed']({ detail: { choice: 'rejected' } });
assert.equal(blockedWithdrawal.window['ga-disable-G-JJB0XY6PPR'], true, 'Withdrawal fails closed even if the saved choice cannot be updated');
const countBefore = blockedWithdrawal.window.dataLayer.length;
blockedWithdrawal.window.romixAnalytics.trackWhatsApp([{ id: 'p1', price: 10 }]);
assert.equal(blockedWithdrawal.window.dataLayer.length, countBefore);
const funnel = load('romix-ropas.vercel.app');
const basket = [{ productId: 'p1', name: 'Calza', price: 10000, qty: 2, phone: 'private' }];
funnel.listeners['romix:analytics-cart-viewed']({ detail: { items: basket } });
funnel.listeners['romix:analytics-cart-viewed']({ detail: { items: basket } });
funnel.listeners['romix:analytics-cart-removed']({ detail: { items: basket } });
funnel.window.romixAnalytics.trackCheckout(basket);
funnel.window.romixAnalytics.trackCheckoutFailure('private URL or arbitrary error');
funnel.window.romixAnalytics.trackCheckoutFailure('popup_blocked');
funnel.window.romixAnalytics.trackWhatsApp(basket);
const journey = Array.from(funnel.window.dataLayer).filter(x => x[0] === 'event');
assert.deepEqual(journey.map(x => x[1]), ['view_cart', 'remove_from_cart', 'begin_checkout', 'whatsapp_open_failed', 'whatsapp_order_click']);
assert.equal(journey[0][2].value, 20000);
assert.deepEqual(journey[3][2], { reason: 'popup_blocked' });
assert.ok(!JSON.stringify(journey).includes('private'));
funnel.listeners['romix:analytics-consent-changed']({ detail: { choice: 'rejected' } });
const afterWithdrawal = funnel.window.dataLayer.length;
funnel.window.romixAnalytics.trackCheckout(basket);
funnel.window.romixAnalytics.trackCheckoutFailure('open_error');
funnel.listeners['romix:analytics-cart-removed']({ detail: { items: basket } });
assert.equal(funnel.window.dataLayer.length, afterWithdrawal);
console.log('analyticsTests: passed');
