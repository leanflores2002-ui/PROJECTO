const fs = require('node:fs');
const path = require('node:path');
const {renderPage} = require('./sync-storefront-shells');
const {productSlug, detailHref, productTitle, productDescription, productDetailsDescription, productImage, escapeHtml} = require('./generate-share-pages');
const {previewHtml, isPreview} = require('./generate-seo');
const {sharePrices} = require('./share-prices');
const publicDir = path.resolve(__dirname, '../frontend/public');
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');

function renderProduct(product, origin, env = process.env) {
  const canonical = origin + detailHref(product);
  const image = new URL(productImage(product), origin + '/').href;
  const description = productDescription(product);
  const schema = {'@context': 'https://schema.org', '@type': 'Product', name: product.name, description, image, url: canonical};
  const content = `<div class="detail-grid" data-romix-static-product>
    <div class="gallery"><div class="main-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" width="1200" height="1600" fetchpriority="high" /></div></div>
    <div class="product-info"><h1>${escapeHtml(product.name)}</h1><p>${escapeHtml(productDetailsDescription(product))}</p>
    <p>${escapeHtml(sharePrices(product))}</p>
    <p>Talles: ${escapeHtml((product.sizes || []).map(size => typeof size === 'object' ? size.size || size.label || '' : size).join(', '))}</p>
    <p>Colores: ${escapeHtml((product.colors || []).map(color => color.name || '').join(', '))}</p>
    <noscript><p>Activá JavaScript para seleccionar variantes y agregar al carrito. Consultá disponibilidad por WhatsApp desde el pie de página.</p></noscript>
    </div></div>`;
  let html = renderPage('product.html').replace('<head>', '<head>\n  <base href="/" />')
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(productTitle(product))}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => a + escapeHtml(description) + b)
    .replace(/(<script id="preloaded-product" type="application\/json">)[\s\S]*?(<\/script>)/, (_, a, b) => a + json(product) + b)
    .replace(/(<section id="product-detail")[\s\S]*?<\/section>/, () => `<section id="product-detail" class="detail-panel" aria-live="polite" aria-busy="false">${content}</section>`)
    .replace('</head>', () => `<link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="product" /><meta property="og:title" content="${escapeHtml(productTitle(product))}" />
    <meta property="og:description" content="${escapeHtml(description)}" /><meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <script id="romix-product-schema" type="application/ld+json">${json(schema)}</script>\n</head>`);
  if (isPreview(env)) html = previewHtml(html);
  return html;
}

function main(products, origin) {
  const dir = path.join(publicDir, 'productos');
  const slugs = products.map(productSlug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Duplicate product URL');
  fs.mkdirSync(dir, {recursive: true});
  // Only prune files bearing our generator marker, within this output directory.
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name, 'index.html');
    if (entry.isDirectory() && !slugs.includes(entry.name) && fs.existsSync(file)
      && fs.readFileSync(file, 'utf8').includes('data-romix-static-product')) fs.unlinkSync(file);
  }
  for (const product of products) {
    const target = path.join(dir, productSlug(product));
    fs.mkdirSync(target, {recursive: true});
    fs.writeFileSync(path.join(target, 'index.html'), renderProduct(product, origin));
  }
  console.log(`Static product pages generated: ${products.length}`);
}
module.exports = {main, renderProduct};
if (require.main === module) main(require('../frontend/public/assets/data/products.json').filter(p => p && p.visible !== false),
  require('./generate-share-pages').deploymentSiteUrl());
