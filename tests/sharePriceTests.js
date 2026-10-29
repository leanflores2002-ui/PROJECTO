const assert = require('node:assert/strict');
const { sharePrices } = require('../scripts/share-prices');
const { buildSharePage } = require('../scripts/generate-share-pages');
const product = { name: 'Remera', section: 'mujer', sizes: ['1','2','3','4','5','6','7','8'], price: 4600, priceByGroup: { common:4600, special:5100 }, specialSizes:[6,7,8] };
assert.equal(sharePrices(product), 'T1-5 $4.600 · T6-8 $5.100');
assert.equal(sharePrices({price:8900,sizes:['U']}), '$8.900');
assert.equal(sharePrices({price:5000,sizes:['1','3','4']}), 'T1, T3, T4 $5.000');
assert.equal(sharePrices({price:0,sizes:['U']}), '');
for (const price of [-1, NaN, Infinity, 'Infinity', 'invalid', undefined]) {
  for (const sizes of [['U'], ['2']]) assert.equal(sharePrices({ price, sizes }), '', 'Invalid prices cannot appear in share cards');
}
assert.equal(sharePrices({ ...product, sizes: ['2', '6', '9'], specialSizes: [2], superSpecialSizes: [9], priceByGroup: { common: 4000, special: 5000, special2: 6000 } }), 'T2 $5.000 · T6 $4.000 · T9 $6.000', 'Declared exceptions override conventional size groups');
assert.equal(sharePrices({ section: 'ninos', sizes: ['2', '10', '12', '16'], priceByGroup: { common: 3000, special: 4000 } }), 'T2, T10 $3.000 · T12, T16 $4.000');
const social = { image:'images/products/test.webp', imageHash:'abcd1234', source:'test', type:'image/webp', width:600, height:600 };
const before = buildSharePage(product, 'https://romix.example', social);
const after = buildSharePage({...product, priceByGroup:{common:4700,special:5200}}, 'https://romix.example', social);
assert.ok(before.html.includes('content="T1-5 $4.600 · T6-8 $5.100.'));
assert.notEqual(before.version, after.version, 'Price changes must refresh the shared URL version');
console.log('sharePriceTests: passed');
