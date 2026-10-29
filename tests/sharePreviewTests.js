const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const sharp = require('sharp');
const {prepareSocialImage,localFile,hash,LIMIT} = require('../scripts/social-images');
const {
  buildSharePage,
  productDescription,
  productImage,
  productSlug
} = require('../scripts/generate-share-pages');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'frontend', 'public');
const siteUrl = 'https://romix.example';

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function meta(document, selector) {
  const element = document.querySelector(selector);
  return element ? element.getAttribute('content') || '' : '';
}

function visibleProductFor(products, section) {
  return products.find((product) => product && product.visible !== false && product.section === section);
}

async function checkGeneratedPreview(product, section) {
  assert(product, `Missing visible ${section} product fixture`);
  const social = await prepareSocialImage(product, productSlug(product));
  const page = buildSharePage(product, siteUrl, social);
  const dom = new JSDOM(page.html);
  const document = dom.window.document;
  const expectedUrl = `${siteUrl}/share/${productSlug(product)}/`;
  const image = new URL(social.image.replace(/^\/+/, ''), `${siteUrl}/`);
  image.searchParams.set('v',social.imageHash.slice(0,16));
  const expectedImage = image.href;

  assert(meta(document, 'meta[property="og:type"]') === 'product', `${section}: og:type must be product`);
  assert(meta(document, 'meta[property="og:site_name"]') === 'ROMIX', `${section}: site name missing`);
  assert(meta(document, 'meta[property="og:title"]') === `${product.name} | ROMIX`, `${section}: product title mismatch`);
  assert(meta(document, 'meta[property="og:description"]') === productDescription(product), `${section}: description mismatch`);
  assert(meta(document, 'meta[property="og:image"]') === expectedImage, `${section}: primary image mismatch`);
  assert(/^https:\/\//.test(meta(document, 'meta[property="og:image"]')), `${section}: image must be absolute HTTPS`);
  assert(meta(document, 'meta[property="og:url"]') === expectedUrl, `${section}: canonical OG URL mismatch`);
  assert(document.querySelector('link[rel="canonical"]')?.href === page.detailUrl, `${section}: canonical detail link mismatch`);
  assert(meta(document, 'meta[name="robots"]').includes('noindex'), `${section}: redirect preview must not be indexed`);
  assert(meta(document, 'meta[name="twitter:card"]') === 'summary_large_image', `${section}: Twitter card missing`);
  assert(meta(document, 'meta[name="twitter:title"]') === `${product.name} | ROMIX`, `${section}: Twitter title mismatch`);
  assert(meta(document, 'meta[name="twitter:image"]') === expectedImage, `${section}: Twitter image mismatch`);
  assert(social.source === product.image, `${section}: source must be this product's primary`);
  const bytes = fs.readFileSync(localFile(social.image));
  const actual = await sharp(bytes).metadata();
  assert(actual.format === 'png' ? social.image.endsWith('.png') : /\.jpe?g$/i.test(social.image), `${section}: extension must agree with real format and served MIME`);
  assert(bytes.length > 0 && bytes.length <= LIMIT, `${section}: social image budget`);
  assert(hash(fs.readFileSync(localFile(product.image))) === social.sourceHash, `${section}: source hash`);
  assert(hash(bytes) === social.imageHash, `${section}: output hash`);
  assert(meta(document,'meta[property="og:image:type"]') === `image/${actual.format}`, `${section}: actual MIME`);
  assert(+meta(document,'meta[property="og:image:width"]') === actual.width, `${section}: actual width`);
  assert(+meta(document,'meta[property="og:image:height"]') === actual.height, `${section}: actual height`);
  assert(meta(document,'meta[property="og:image:alt"]') === product.name, `${section}: image alt`);
  assert(meta(document,'meta[name="twitter:image:alt"]') === product.name, `${section}: twitter alt`);
  assert(meta(document,'meta[property="og:image:secure_url"]') === expectedImage, `${section}: secure URL`);
  assert(!/placeholder|logo-romix|data:image|base64/i.test(page.html), `${section}: placeholder/embedded image`);
  assert(!document.querySelector('meta[http-equiv="refresh"]'), `${section}: crawler must retain static metadata`);
  for (const a of document.querySelectorAll('a[href]')) {
    const url = new URL(a.getAttribute('href'), siteUrl);
    assert(url.pathname === `/productos/${productSlug(product)}/`, `${section}: detail link mismatch`);
    assert(fs.existsSync(path.join(publicDir,url.pathname,'index.html')), `${section}: broken detail href`);
  }
  assert(page.version === buildSharePage(product,siteUrl,social).version, 'Version must be deterministic');
  assert(page.version !== buildSharePage(product,siteUrl,{...social,imageHash:'changed'}).version, 'Image replacement must change version');
  assert(page.version !== buildSharePage({...product,description:'updated copy'},siteUrl,social).version, 'Copy change must change version');
  dom.window.close();
}

function checkSingleClientShareUrl() {
  const productHtml = read('frontend/public/product.html');
  const shareFunction = productHtml.match(/function buildShareUrl\(product\)\s*\{[\s\S]*?\n\s*\}/)?.[0] || '';
  assert(shareFunction.includes('share/${encodeURIComponent(slug)}/'), 'Client share URL must target the generated OG page');
  assert(/waBtn\.href\s*=\s*`https:\/\/wa\.me\/\?text=\$\{encodeURIComponent\(shareText\)\}`/.test(productHtml), 'WhatsApp must use the shared URL text');
  assert(/navigator\.share\(\{[^}]*text:\s*shareText/.test(productHtml), 'Native share must send the product, prices and URL together as text');
  assert(!/navigator\.share\(\{[^}]*url:/.test(productHtml), 'Separate URL must not override the shared message');
  assert(/clipboard\.writeText\(shareText\)/.test(productHtml), 'Copy must include the product, size prices and shared URL');
  assert(!/document\.querySelector\(['"]meta\[property=['"]og:image/.test(productHtml), 'Preview must not depend on client-side OG mutation');
}

function checkCanonicalConfiguration() {
  const generator = read('scripts/generate-share-pages.js');
  const backend = read('backend/app/main.py');
  assert(!/romi-damas\.netlify\.app|romix-ropas\.vercel\.app/.test(generator), 'Generator must not hardcode a deployment domain');
  assert(!/romi-damas\.netlify\.app|romix-ropas\.vercel\.app/.test(backend), 'Backend must not hardcode a deployment domain');
  assert(generator.includes('ROMIX_SITE_URL'), 'Generator must honor ROMIX_SITE_URL');
  assert(backend.includes('ROMIX_SITE_URL'), 'Backend must honor ROMIX_SITE_URL');
}

async function main() {
  await require('../scripts/generate-share-pages').main();
  const products = JSON.parse(read('frontend/public/assets/data/products.json').replace(/^\uFEFF/, ''));
  for (const product of products.filter(product => product.visible !== false)) {
    await checkGeneratedPreview(product,product.name);
    const file = path.join(publicDir,'share',productSlug(product),'index.html');
    assert(fs.existsSync(file) && fs.statSync(file).size < 16000, 'Generated static share HTML missing or oversized');
  }
  for (const product of products.filter(product => product.visible === false)) {
    assert(!fs.existsSync(path.join(publicDir, 'share', productSlug(product), 'index.html')), 'Hidden product must not have a public share page');
  }
  const encoded = productImage({image:'images/products/niño azul (1) #%.png'});
  assert(decodeURIComponent(encoded) === 'images/products/niño azul (1) #%.png', 'Special character encoding must round trip');
  assert(!encoded.includes(' ') && !encoded.includes('#'), 'Special characters must be encoded');
  checkSingleClientShareUrl();
  checkCanonicalConfiguration();
  console.log(`sharePreviewTests: passed (${products.length} real primary images)`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
