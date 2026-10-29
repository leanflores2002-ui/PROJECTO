const fs = require("fs");
const path = require("path");
const {prepareSocialImage, hash} = require('./social-images');

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "frontend", "public");
const PRODUCTS_FILE = path.join(PUBLIC_DIR, "assets", "data", "products.json");
const SHARE_DIR = path.join(PUBLIC_DIR, "share");
const FALLBACK_IMAGE = "images/branding/romix-logo-social.webp";

function normalizeSiteUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Expected a deployment origin');
  }
  return url.origin;
}

function deploymentSiteUrl(env = process.env) {
  const configured = env.ROMIX_SITE_URL || require('../config/site.json').origin;
  const value = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return normalizeSiteUrl(value);
}

function slugify(value) {
  const raw = String(value || "").trim();
  if (!raw) return "producto";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "producto";
}

const {productSlug, detailHref} = require('../frontend/public/assets/js/product-url');

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\\/g, "/");
}

function encodePathForMeta(value) {
  const clean = normalizePath(value);
  if (!clean) return "";
  try {
    if (/^https?:\/\//i.test(clean)) return new URL(clean).href;
    return clean.split('/').map(segment => {
      try { segment = decodeURIComponent(segment); } catch { /* literal percent */ }
      return encodeURIComponent(segment);
    }).join('/');
  } catch {
    return clean;
  }
}

function absoluteUrl(value, siteUrl = deploymentSiteUrl()) {
  const clean = normalizePath(value);
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  const rel = clean.replace(/^\/+/, "");
  return `${siteUrl}/${rel}`;
}

function productImage(product) {
  const direct = encodePathForMeta(product && product.image);
  if (direct) return direct;
  if (product && product.images && typeof product.images === "object") {
    const entries = Array.isArray(product.images) ? product.images : Object.values(product.images);
    const first = entries.find((entry) => String(entry || "").trim());
    if (first) return encodePathForMeta(first);
  }
  return encodePathForMeta(FALLBACK_IMAGE);
}

function productDescription(product) {
  const prices = require("./share-prices").sharePrices(product || {});
  const details = productDetailsDescription(product);
  return (prices ? `${prices}. ${details}` : details).slice(0, 220);
}

function productDetailsDescription(product) {
  const candidates = [
    product && product.description,
    product && product.desc,
    product && product.subtitle
  ];
  const first = candidates.find((entry) => String(entry || "").trim());
  if (!first) {
    const type = String((product && (product.type || product.category)) || "Producto").trim();
    const section = String((product && (product.section || product.gender)) || "ROMIX").trim();
    return `${type} para ${section}. Indumentaria deportiva y urbana ROMIX.`;
  }
  return String(first).replace(/\s+/g, " ").trim().slice(0, 220);
}

function productTitle(product) {
  const name = String((product && product.name) || "Producto ROMIX").trim();
  return `${name} | ROMIX`;
}


function scriptString(value) {
  return JSON.stringify(value).replaceAll('<', String.raw`\u003c`).replaceAll('>', String.raw`\u003e`)
    .replaceAll('&', String.raw`\u0026`).replaceAll('\u2028', String.raw`\u2028`).replaceAll('\u2029', String.raw`\u2029`);
}

function shareHtml({ title, description, imageUrl, shareUrl, detailUrl, social, alt }) {
  const detail = new URL(detailUrl);
  if (detail.origin !== new URL(shareUrl).origin || (detail.pathname !== '/product.html' && !/^\/productos\/[a-z0-9-]+\/$/.test(detail.pathname)) || detail.username || detail.password || !['http:', 'https:'].includes(detail.protocol)) throw new Error('Invalid product redirect');
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);
  const safeShare = escapeHtml(shareUrl);
  const safeDetail = escapeHtml(detailUrl);
  const navigationPath = detail.pathname + detail.search;
  const safeNavigation = escapeHtml(navigationPath);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <meta name="robots" content="noindex, follow" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="ROMIX" />
  <meta property="og:locale" content="es_AR" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:type" content="${escapeHtml(social.type)}" />
  <meta property="og:image:width" content="${escapeHtml(social.width)}" />
  <meta property="og:image:height" content="${escapeHtml(social.height)}" />
  <meta property="og:image:alt" content="${escapeHtml(alt)}" />
  <meta property="og:url" content="${safeShare}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta name="twitter:image:alt" content="${escapeHtml(alt)}" />
  <meta name="twitter:url" content="${safeShare}" />
  <link rel="canonical" href="${safeDetail}" />
  <script>window.location.replace(${scriptString(navigationPath)});</script>
</head>
<body>
  <p>Redirigiendo al producto...</p>
  <p><a href="${safeNavigation}">Abrir producto</a></p>
</body>
</html>
`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildSharePage(product, siteUrl, social) {
  siteUrl = normalizeSiteUrl(siteUrl || deploymentSiteUrl());
  if (!social) throw new Error('Verified social image metadata is required');
  const slug = productSlug(product);
  const sharePath = `/share/${slug}/`;
  const detailPath = detailHref(product, slug);
  const shareUrl = absoluteUrl(sharePath, siteUrl);
  const detailUrl = absoluteUrl(detailPath, siteUrl);
  const image = new URL(absoluteUrl(encodePathForMeta(social.image), siteUrl));
  image.searchParams.set('v', social.imageHash.slice(0,16));
  const imageUrl = image.href;
  const title = productTitle(product);
  const description = productDescription(product);
  const version = hash(JSON.stringify({id:product.id,title,description,imageHash:social.imageHash,source:social.source,updatedAt:product.updated_at || '',schema:2})).slice(0,16);
  const html = shareHtml({ title, description, imageUrl, shareUrl, detailUrl, social, alt:product.name });
  return { slug, shareUrl, detailUrl, imageUrl, title, description, html, version, social };
}

async function main() {
  await require("./optimize-product-images").main({ write: true, derivedOnly: true });
  require("./sync-storefront-shells").main();
  if (!fs.existsSync(PRODUCTS_FILE)) {
    throw new Error(`No se encontro ${PRODUCTS_FILE}`);
  }

  const raw = fs.readFileSync(PRODUCTS_FILE, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed.filter(product => product && product.visible !== false) : [];

  fs.rmSync(SHARE_DIR, { recursive: true, force: true });
  ensureDir(SHARE_DIR);

  let created = 0;
  const siteUrl = deploymentSiteUrl();

  const versions = {};
  const manifest = {};
  for (const product of list) {
    const slug = productSlug(product);
    if (manifest[slug]) throw new Error(`Duplicate share slug: ${slug}`);
    const social = await prepareSocialImage(product,slug);
    const { html, version } = buildSharePage(product, siteUrl, social);
    versions[slug] = version;
    manifest[slug] = {productId:product.id,version,...social};

    const outDir = path.join(SHARE_DIR, slug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
    created += 1;
  }
  // Remove only obsolete generated JPEGs, never catalog originals.
  const previews = path.join(PUBLIC_DIR,'share-previews');
  const used = new Set(Object.values(manifest).filter(m=>m.dedicated).map(m=>path.basename(m.image)));
  if (fs.existsSync(previews)) for (const entry of fs.readdirSync(previews)) {
    if (/^[a-z0-9-]+\.jpg$/.test(entry) && !used.has(entry)) fs.unlinkSync(path.join(previews,entry));
  }
  fs.writeFileSync(path.join(PUBLIC_DIR,'assets/data/share-manifest.json'),JSON.stringify(manifest));
  fs.writeFileSync(path.join(PUBLIC_DIR,'assets/js/share-versions.js'),`window.ROMIX_SHARE_VERSIONS=${JSON.stringify(versions)};\n`);
  require('./generate-product-pages').main(list, siteUrl);
  require('./generate-seo').main(list, siteUrl);

  console.log(`Share pages generated: ${created}`);
}

if (require.main === module) main().catch(error=>{console.error(error);process.exitCode=1;});

module.exports = {
  main,
  absoluteUrl,
  buildSharePage,
  deploymentSiteUrl,
  productDescription,
  productDetailsDescription,
  productImage,
  productSlug,
  productTitle,
  shareHtml,
  detailHref,
  escapeHtml
};
