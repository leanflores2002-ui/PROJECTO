const crypto = require('node:crypto');
const assert = require('node:assert/strict');
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function snapshot(products) {
  return products.map(product => ({
    name: product.name, price: product.price, priceByGroup: product.priceByGroup || null, sizes: product.sizes,
    fields: Object.fromEntries(Object.keys(product).sort().map(key => [key, crypto.createHash('sha256').update(JSON.stringify(stable(product[key]))).digest('hex')]))
  }));
}
function verify(products, baseline) {
  assert.ok(Array.isArray(products));
  const names = products.map(product => product.name);
  assert.equal(new Set(names).size, names.length, 'Duplicate product identity');
  assert.deepEqual(names, baseline.products.map(product => product.name), 'Catalog identities/order differ from reviewed baseline');
  products.forEach(product => {
    assert.ok(Number.isFinite(product.price) && product.price >= 0, `${product.name}: invalid price`);
    assert.ok(Array.isArray(product.sizes) && product.sizes.length, `${product.name}: missing sizes`);
    const sizes = product.sizes.map(value => String(value && typeof value === 'object' ? value.size ?? value.value ?? value.label : value).trim());
    assert.equal(new Set(sizes).size, sizes.length, `${product.name}: duplicate sizes`);
    assert.ok(sizes.every(Boolean), `${product.name}: empty size`);
  });
  snapshot(products).forEach((product, index) => {
    const expected = baseline.products[index];
    assert.deepEqual(Object.keys(product.fields), Object.keys(expected.fields), `${product.name}: fields added/removed`);
    for (const [key, hash] of Object.entries(product.fields)) assert.equal(hash, expected.fields[key], `${product.name}: ${key} differs from reviewed catalog`);
    for (const key of ['price', 'priceByGroup', 'sizes']) assert.deepEqual(product[key], expected[key], `${product.name}: baseline ${key} inconsistent`);
  });
}
module.exports = { snapshot, verify };
