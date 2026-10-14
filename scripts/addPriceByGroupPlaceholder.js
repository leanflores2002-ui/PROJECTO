const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'data', 'products.json');

function main() {
  let text = fs.readFileSync(PRODUCTS_PATH, 'utf8');
  const hasBom = text.charCodeAt(0) === 0xfeff;
  if (hasBom) text = text.slice(1);
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const data = JSON.parse(text);
  const missingNames = new Set(
    data
      .filter(p => p && typeof p === 'object' && !Object.prototype.hasOwnProperty.call(p, 'priceByGroup'))
      .map(p => p.name)
      .filter(Boolean)
  );

  const lines = text.split(newline);
  const result = [];
  let insideProduct = false;
  let currentName = null;
  let shouldInsert = false;
  let insertedForProduct = false;

  const startProductRegex = /^ {4}\{$/;
  const endProductRegex = /^ {4}\},?$/;
  const nameRegex = /^\s*"name":\s*"([^"]+)",/;
  const priceRegex = /^(\s{8})"price":\s*[^,]+,/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (startProductRegex.test(line)) {
      insideProduct = true;
      currentName = null;
      shouldInsert = false;
      insertedForProduct = false;
    } else if (endProductRegex.test(line)) {
      insideProduct = false;
      currentName = null;
      shouldInsert = false;
      insertedForProduct = false;
    }

    const nameMatch = line.match(nameRegex);
    if (insideProduct && nameMatch && currentName == null) {
      currentName = nameMatch[1];
      shouldInsert = currentName && missingNames.has(currentName);
    }

    result.push(line);

    if (insideProduct && shouldInsert && !insertedForProduct) {
      const priceMatch = line.match(priceRegex);
      if (priceMatch) {
        const placeholder = `${priceMatch[1]}"priceByGroup":  { "common":  null, "special":  null },`;
        result.push(placeholder);
        insertedForProduct = true;
      }
    }
  }

  const updated = (hasBom ? '\ufeff' : '') + result.join(newline);
  fs.writeFileSync(PRODUCTS_PATH, updated, 'utf8');
  console.log(`Updated ${PRODUCTS_PATH} with placeholders for ${[...missingNames].length} products without priceByGroup.`);
}

if (require.main === module) {
  main();
}
