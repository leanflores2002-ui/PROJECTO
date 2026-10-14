const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const BANNERS_DIR = path.join(ROOT, 'frontend', 'public', 'images', 'banners');
const BANNER_OUTPUT_DIR = path.join(ROOT, 'frontend', 'public', 'images', 'optimized', 'banners');
const BRANDING_DIR = path.join(ROOT, 'frontend', 'public', 'images', 'branding');
const BRANDING_OUTPUT_DIR = path.join(ROOT, 'frontend', 'public', 'images', 'optimized', 'branding');
const WRITE = process.argv.includes('--write');
const QUALITY = 78;
const EFFORT = 6;

const BANNER_VARIANTS = [
  { source: 'banner-3.webp', outputBase: 'banner-3', widths: [960, 1440, 1920] },
  { source: 'banner-3-mobile.webp', outputBase: 'banner-3-mobile', widths: [480, 768] },
  { source: 'banner-ofertas.webp', outputBase: 'banner-ofertas', widths: [960, 1440, 1920] },
  { source: 'banner-ofertas-mobile.webp', outputBase: 'banner-ofertas-mobile', widths: [480, 768] },
  { source: 'banner-lycra.webp', outputBase: 'banner-lycra', widths: [960, 1440, 1920] },
  { source: 'banner-lycra-mobile.webp', outputBase: 'banner-lycra-mobile', widths: [480, 768] }
];

const LOGO_VARIANTS = [
  { source: 'romix-logo.webp', outputBase: 'romix-logo', widths: [360, 720] }
];

function assertInside(root, filePath) {
  const resolved = path.resolve(filePath);
  const safeRoot = path.resolve(root);
  if (resolved !== safeRoot && !resolved.startsWith(safeRoot + path.sep)) {
    throw new Error(`Ruta fuera del directorio permitido: ${filePath}`);
  }
  return resolved;
}

function outputPath(directory, base, width) {
  return assertInside(directory, path.join(directory, `${base}-${width}.webp`));
}

function needsWrite(sourcePath, outputPath) {
  if (!fs.existsSync(outputPath)) return true;
  return fs.statSync(sourcePath).mtimeMs > fs.statSync(outputPath).mtimeMs;
}

async function writeVariant(sourcePath, outputPath, width) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temp = `${outputPath}.tmp-${process.pid}.webp`;
  assertInside(path.dirname(outputPath), temp);
  try {
    await sharp(fs.readFileSync(sourcePath), { animated: false, limitInputPixels: 40000000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: EFFORT })
      .toFile(temp);
    fs.renameSync(temp, outputPath);
    return fs.statSync(outputPath).size;
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

async function main() {
  const plans = [];
  for (const variant of BANNER_VARIANTS) {
    const sourcePath = assertInside(BANNERS_DIR, path.join(BANNERS_DIR, variant.source));
    if (!fs.existsSync(sourcePath)) throw new Error(`No existe el banner fuente: ${sourcePath}`);
    for (const width of variant.widths) {
      const target = outputPath(BANNER_OUTPUT_DIR, variant.outputBase, width);
      if (needsWrite(sourcePath, target)) plans.push({ sourcePath, outputPath: target, width, kind: 'banner' });
    }
  }
  for (const variant of LOGO_VARIANTS) {
    const sourcePath = assertInside(BRANDING_DIR, path.join(BRANDING_DIR, variant.source));
    if (!fs.existsSync(sourcePath)) throw new Error(`No existe el logo fuente: ${sourcePath}`);
    for (const width of variant.widths) {
      const target = outputPath(BRANDING_OUTPUT_DIR, variant.outputBase, width);
      if (needsWrite(sourcePath, target)) plans.push({ sourcePath, outputPath: target, width, kind: 'branding' });
    }
  }

  let beforeBytes = 0;
  let afterBytes = 0;
  let written = 0;
  for (const plan of plans) {
    if (fs.existsSync(plan.outputPath)) beforeBytes += fs.statSync(plan.outputPath).size;
    if (WRITE) {
      const bytes = await writeVariant(plan.sourcePath, plan.outputPath, plan.width);
      afterBytes += bytes;
      written += 1;
      console.log(`${path.relative(ROOT, plan.outputPath)}: ${bytes.toLocaleString('es-AR')} B`);
    }
  }

  console.log(JSON.stringify({
    dryRun: !WRITE,
    planned: plans.length,
    written,
    beforeBytes,
    afterBytes,
    quality: QUALITY,
    effort: EFFORT
  }, null, 2));
}

if (require.main === module) main().catch((error) => {
  console.error(`optimize-storefront-images: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { main };
