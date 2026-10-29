const assert = require('node:assert/strict');
const products = require('../frontend/public/assets/data/products.json');
const baseline = require('./catalogSyncBaseline.json');
const { verify } = require('./helpers/catalogSnapshot');

// Pin the reviewed current state, rather than the September migration's allowed edits.
// All fields include photos, visibility and declared size exceptions.
verify(products, baseline);
for (const [label, mutate] of [
  ['price', list => { list[0].price += 1; }],
  ['special groups', list => { list[0].priceByGroup.special += 1; }],
  ['size removal', list => { list[0].sizes.pop(); }],
  ['photo', list => { list[0].colors[0].image = 'images/wrong.webp'; }],
  ['hidden product', list => { list[0].visible = !list[0].visible; }],
  ['season', list => { list[0].season = 'unreviewed-season'; }],
  ['order', list => { [list[0], list[1]] = [list[1], list[0]]; }],
  ['identity', list => { list[0].name = list[1].name; }],
  ['removal', list => { list.pop(); }],
  ['addition', list => { list.push({ ...list[0], name: 'Unreviewed product' }); }]
]) {
  const changed = structuredClone(products);
  mutate(changed);
  assert.throws(() => verify(changed, baseline), undefined, `Must detect ${label}`);
}
console.log(`catalogSyncTests: passed (${products.length} reviewed products; all fields, identity, order and mutation regressions)`);
