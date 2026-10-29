const fs = require('node:fs');
const path = require('node:path');
const {productSlug, detailHref, deploymentSiteUrl} = require('./generate-share-pages');
const publicDir = path.resolve(__dirname, '../frontend/public');
const {categories} = require('../frontend/public/assets/js/catalog-sections');

function isPreview(env = process.env) {
  return (env.VERCEL_ENV && env.VERCEL_ENV !== 'production')
    || (env.CONTEXT && env.CONTEXT !== 'production');
}

function sitemap(products, origin) {
  const urls = ['/', '/catalogo.html', '/ayuda.html', '/privacidad.html', '/terminos.html', ...categories.map(category => `/${category.key}/`), ...products
    .filter(product => product && product.visible !== false)
    .map(product => detailHref(product, productSlug(product)))];
  if (new Set(urls).size !== urls.length) throw new Error('Duplicate canonical sitemap URL');
  const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(url => `  <url><loc>${escapeXml(origin + url)}</loc></url>`).join('\n')
    + '\n</urlset>\n';
}

function previewHtml(html) {
  if (html.includes('<meta name="romix-preview" content="true" />')) return html;
  return html.replace(/\s*<meta name="(?:robots|romix-preview)"[^>]*>/g, '')
    .replace('</head>', '  <meta name="romix-preview" content="true" />\n  <meta name="robots" content="noindex, follow" />\n</head>');
}

function main(products, origin = deploymentSiteUrl(), env = process.env) {
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap(products, origin));
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  // Preview HTML is crawlable so crawlers can actually read noindex.
  if (isPreview(env)) {
    const files = ['index.html', 'catalogo.html', 'ayuda.html', 'privacidad.html', 'terminos.html', 'product.html', 'cart.html', '404.html',
      ...categories.map(category => `${category.key}/index.html`),
      ...products.filter(product => product && product.visible !== false).map(product => `productos/${productSlug(product)}/index.html`)];
    for (const file of files) {
      const target = path.join(publicDir, file);
      fs.writeFileSync(target, previewHtml(fs.readFileSync(target, 'utf8')));
    }
  }
  console.log(`SEO generated: ${products.length} public products; preview=${Boolean(isPreview(env))}`);
}

module.exports = {main, sitemap, isPreview, previewHtml};
