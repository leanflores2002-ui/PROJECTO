const path = require('path');
const { getDisplayColorName } = require(path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'color-utils'));

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (esperado: ${expected}, obtenido: ${actual})`);
  }
}

// Producto con un solo color debe mostrar su nombre real
(function singleColorUsesRealName() {
  const product = {
    stockByColor: { Negro: { U: 5 } },
    colors: [{ name: 'Negro' }]
  };
  const display = getDisplayColorName(product);
  assertEqual(display, 'Negro', 'El unico color debe mostrarse como Negro');
})();

// Producto con multiples colores debe respetar el seleccionado
(function multipleColorsUsesSelection() {
  const product = {
    colors: [{ name: 'Negro' }, { name: 'Azul' }, { name: 'Rojo' }]
  };
  const display = getDisplayColorName(product, 'Azul');
  assertEqual(display, 'Azul', 'Debe mostrarse el color seleccionado');
})();

// Producto con color sin nombre cae al fallback Negro
(function missingColorNameFallsBack() {
  const product = {
    colors: [{ name: '' }]
  };
  const display = getDisplayColorName(product);
  assertEqual(display, 'Negro', 'Sin nombre valido se usa Negro como ultimo recurso');
})();

console.log('colorNameTests: passed');
