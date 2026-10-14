const fs = require('node:fs');
const path = require('node:path');
const {categories, publicProducts} = require('../frontend/public/assets/js/catalog-sections');
const imageUtils = require('../frontend/public/assets/js/romix-image-utils');
const {productSlug, detailHref, escapeHtml} = require('./generate-share-pages');
const publicDir = path.resolve(__dirname, '../frontend/public');
const cardTemplate = fs.readFileSync(path.resolve(__dirname, '../frontend/src/templates/partials/category-card.html'), 'utf8');

function renderCategory(category, catalogHtml, products, origin) {
  const list = publicProducts(products, category.key);
  const cards = list.map(product => {
    const thumbnail = imageUtils.getThumbPath(product.image);
    const image = fs.existsSync(path.join(publicDir, thumbnail)) ? thumbnail : product.image;
    const fields = {DETAIL: detailHref(product, productSlug(product)), NAME: product.name, IMAGE: image, TYPE: product.type || ''};
    return cardTemplate.replace(/%%([A-Z]+)%%/g, (_, key) => escapeHtml(fields[key]));
  }).join('\n');
  const canonical = `${origin}/${category.key}/`;
  let html = catalogHtml.replace('<head>', '<head>\n  <base href="/" />')
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(category.title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, before, after) => before + canonical + after)
    .replace(/(<meta (?:name|property)="(description|og:title|og:description|og:url|twitter:title|twitter:description)" content=")[^"]*(")/g,
      (_, before, key, after) => before + escapeHtml(key.endsWith('title') ? category.title : key === 'og:url' ? canonical : category.description) + after)
    .replace('data-catalog-scope="catalogo"', `data-catalog-scope="${category.key}" data-category-page="${category.key}"`)
    .replace(/(<h1 id="page-title"[^>]*>)[\s\S]*?(<\/h1>)/, (_, before, after) => `${before}Ropa para ${escapeHtml(category.label.toLowerCase())} ROMIX${after}`)
    .replace('<!-- ROMIX:CATEGORY:INTRO -->', () => `<p class="catalog-intro">${escapeHtml(category.intro)}</p>`)
    .replace('<!-- ROMIX:CATEGORY:PRODUCTS -->', () => cards)
    .replace('Cargando catálogo...', `${list.length} productos publicados`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, match => match.includes('catálogo interactivo')
      ? '<noscript><p class="catalog-noscript">Podés abrir cada producto del listado. Activá JavaScript para usar los filtros interactivos.</p></noscript>' : match);
  return html;
}

function main(catalogHtml, origin) {
  const products = JSON.parse(fs.readFileSync(path.join(publicDir, 'assets/data/products.json'), 'utf8'));
  const rendered = categories.map(category => ({category, html: renderCategory(category, catalogHtml, products, origin)}));
  for (const {category, html} of rendered) {
    const dir = path.join(publicDir, category.key);
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }
  console.log('Category pages generated: ' + rendered.length);
}

module.exports = {renderCategory, main, categories};
