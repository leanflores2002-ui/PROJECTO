const fs = require('fs');
const path = require('path');

const productsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'data', 'products.json');
const baselinePath = path.join(__dirname, 'catalogSyncBaseline.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

const changes = new Map([
  ['Calza oxford jaspeado saplex', { price: 13500, groups: { common: 13500, special: 14000 } }],
  ['Campera lycra estampado', { price: 24000, groups: { common: 24000, special: 25000 }, add: ['1'] }],
  ['Pantalon recto fibrana', { price: 8500, groups: { common: 8500, special: 9300 } }],
  ['Pantalon jogger fibrana liso', { price: 8500, groups: { common: 8500, special: 9300, special2: 9100 }, add: ['1'] }],
  ['Pantalon jogger fibrana estampado', { price: 8500, groups: { common: 8500, special: 9300, special2: 9100 }, add: ['1'] }],
  ['Palazo fibrana liso', { price: 8500, groups: { common: 8500, special: 9300 }, add: ['1'] }],
  ['Palazo fibrana estampado', { price: 8500, groups: { common: 8500, special: 9300 }, add: ['1'] }],
  ['Pantalon Recto CEY', { price: 8500, groups: { common: 8500, special: 9300 }, add: ['1'] }],
  ['Palazo CEY', { price: 8500, groups: { common: 8500, special: 9300 }, add: ['1'] }],
  ['Camisola fibrana dama', { price: 8000, groups: { common: 8000, special: 8800, special2: 9600 } }],
  ['Calza lycra recta', { add: ['1'] }],
  ['Calza saplex jaspeado recta', { add: ['1'] }],
  ['Calza algodon c/lycra chupin', { add: ['9', '10'], superSpecialSizes: [9, 10] }],
  ['Calza algodon c/lycra recta', { add: ['1', '2'] }],
  ['Calza lycra morley dama', { add: ['6', '7', '8'], specialSizes: [6, 7, 8] }],
  ['Calza oxford lycra morley dama', { add: ['1'] }],
  ['Pantalon rustico recto dama', { add: ['1'] }],
  ['Pantalon morley liviano dama', { add: ['1', '9', '10'], superSpecialSizes: [9, 10] }],
  ['Campera lycra', { add: ['1'] }],
  ['Campera jaspeado saplex dama', { add: ['1'] }],
  ['Campera modal', { add: ['1', '9', '10'], superSpecialSizes: [9, 10] }],
  ['Campera lycra morley', { add: ['1'] }],
  ['Campera rustico con lycra dama', { add: ['1', '7', '8'], specialSizes: [6, 7, 8] }],
  ['Remera manga larga morley viscosa', { add: ['1', '2'] }],
  ['Capri fibrana', { add: ['1'] }],
  ['Capri fibrana estampado', { add: ['1'] }],
  ['Capri CEY', { add: ['1', '2'] }],
  ['Bermuda fibrana liso', { add: ['1', '2'] }],
  ['Bermuda fibrana estampado', { add: ['1', '2'] }],
  ['Remera lycra dry deportiva dama', { add: ['1'] }],
  ['Remera Lycra Dama', { add: ['1'] }],
  ['Remera Lycra jaspeado Dama', { add: ['1'] }],
  ['Remera algodon Jaspeado Dama', { add: ['1'] }],
  ['Remera algodon jaspeado combinado dama', { add: ['1'] }],
  ['Remera viscosa morley corte princesa', { add: ['1'] }],
  ['Musculosa viscosa morley', { add: ['1'] }],
  ['Musculosa lycra dry fit dama', { add: ['1'] }],
  ['Musculosa lycra dry cuadrille dama', { add: ['1'] }],
  ['Sudadera set dry fit dama', { add: ['1', '2'] }],
  ['Pollera short morley lycra c/bolsillo', { add: ['7', '8'] }],
  ['Pollera short lycra c/bolsillo', { add: ['6', '7', '8'], specialSizes: [6, 7, 8] }],
  ['Remera oversize algodon peinado chico', { add: ['18'], superSpecialSizes: [18] }],
  ['Ciclista lycra liso nena', { add: ['4'] }],
  ['Ciclista jaspeado saplex nena', { add: ['4'] }],
  ['Ciclista algodon con lycra nena', { add: ['4'] }],
  ['Bermuda algodon rustico Niño', { add: ['4'] }],
  ['Babucha lycra jogger hombre', { add: ['1'] }],
  ['Babucha lycra jogger jaspeado hombre', { add: ['1'] }],
  ['Campera lycra hombre', { add: ['1'] }],
  ['Campera rustico hombre', { add: ['1'] }],
  ['Campera jaspeado saplex hombre', { add: ['1'] }],
  ['Buzo rustico con lycra dama', { add: ['1', '6'] }],
  ['Buzo rustico con lycra hombre', { add: ['1', '3'] }],
  ['Remera deportivo dry hombre', { add: ['1'] }],
  ['Bermuda rustico hombre', { add: ['1'] }],
  ['Bermuda lycra hombre', { add: ['1'] }],
  ['Bermuda lycra jaspeado saplex hombre', { add: ['1'] }]
]);

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function hash(value) {
  const text = JSON.stringify(value);
  let first = 2166136261;
  let second = 16777619;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ (code + index), 2246822519);
  }
  return `${(first >>> 0).toString(16)}:${(second >>> 0).toString(16)}`;
}

function without(product, fields) {
  const copy = { ...product };
  fields.forEach((field) => delete copy[field]);
  return copy;
}

function normalizeMedia(value) {
  if (typeof value === 'string') {
    return value.replace(/(images\/products\/[^?#]+)\.webp(?=[?#]|$)/gi, '$1.png');
  }
  if (Array.isArray(value)) return value.map(normalizeMedia);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeMedia(child)]));
  }
  return value;
}

function sizeValue(entry) {
  return entry && typeof entry === 'object' ? String(entry.size ?? entry.value ?? '').trim() : String(entry ?? '').trim();
}

function sortSizes(values) {
  return [...new Set(values.map(String).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
}

assert(Array.isArray(products), 'products.json debe contener un array');
assert(products.length === baseline.length, `Cantidad de productos inesperada: ${products.length} != ${baseline.length}`);
assert(changes.size === 57, `Cantidad de productos con cambio de talle/precio inesperada: ${changes.size}`);

const seen = new Set();
products.forEach((product, index) => {
  const base = baseline[index];
  assert(base && base.name === product.name, `Producto cambiado de posición o nombre en índice ${index}`);
  const change = changes.get(product.name);
  const mutableFields = change
    ? Object.keys(change).filter((field) => field === 'price' || field === 'groups' || field === 'add')
      .map((field) => field === 'groups' ? 'priceByGroup' : field === 'add' ? 'sizes' : field)
      .concat(change.specialSizes ? ['specialSizes'] : [], change.superSpecialSizes ? ['superSpecialSizes'] : [])
    : [];
  const normalizedProduct = normalizeMedia(without(product, mutableFields));
  assert(hash(normalizedProduct) === base.immutableHash, `Campo no autorizado modificado en ${product.name}`);
  if (!change) return;
  seen.add(product.name);

  if (change.price !== undefined) assert(product.price === change.price, `${product.name}: price inesperado`);
  if (change.groups) assert(JSON.stringify(product.priceByGroup) === JSON.stringify(change.groups), `${product.name}: priceByGroup inesperado`);
  if (change.add) {
    const expected = sortSizes([...base.sizes, ...change.add]);
    const actual = product.sizes.map(sizeValue);
    assert(JSON.stringify(actual) === JSON.stringify(expected), `${product.name}: sizes inesperados`);
    assert(new Set(actual).size === actual.length, `${product.name}: talles duplicados`);
    assert(JSON.stringify(actual) === JSON.stringify(sortSizes(actual)), `${product.name}: talles desordenados`);
    change.add.forEach((size) => assert(actual.includes(size), `${product.name}: falta talle ${size}`));
  }
  if (change.specialSizes) assert(JSON.stringify(product.specialSizes) === JSON.stringify(change.specialSizes), `${product.name}: specialSizes inesperado`);
  if (change.superSpecialSizes) assert(JSON.stringify(product.superSpecialSizes) === JSON.stringify(change.superSpecialSizes), `${product.name}: superSpecialSizes inesperado`);
});

assert(seen.size === changes.size, `Productos esperados no encontrados: ${[...changes.keys()].filter((name) => !seen.has(name)).join(', ')}`);
console.log(`catalogSyncTests: passed (${seen.size} productos autorizados; ${products.length} productos totales)`);
