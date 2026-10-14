const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT, 'frontend', 'public', 'images', 'products');
const THUMBS_DIR = path.join(ROOT, 'frontend', 'public', 'images', 'thumbs');
const SWATCHES_DIR = path.join(ROOT, 'frontend', 'public', 'images', 'swatches');
const ALLOWED_INPUT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const RASTER_INPUT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const MAX_SIDE = 1600;
const QUALITY = 82;
const EFFORT = 6;
const CARD_THUMB = { width: 640, height: 853, quality: 76 };
const COLOR_SWATCH = { width: 96, height: 128, quality: 70 };
const WRITE = process.argv.includes('--write');

function assertInsideProducts(filePath) {
  const resolved = path.resolve(filePath);
  if (resolved !== PRODUCTS_DIR && !resolved.startsWith(PRODUCTS_DIR + path.sep)) {
    throw new Error(`Ruta fuera de images/products: ${filePath}`);
  }
  return resolved;
}

function assertInside(root, filePath) {
  const resolved = path.resolve(filePath);
  const safeRoot = path.resolve(root);
  if (resolved !== safeRoot && !resolved.startsWith(safeRoot + path.sep)) {
    throw new Error(`Ruta fuera del directorio permitido: ${filePath}`);
  }
  return resolved;
}

function assertRegularFile(filePath) {
  const resolved = assertInsideProducts(filePath);
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Solo se admiten archivos regulares: ${resolved}`);
  return stat;
}

function walkProducts(dir) {
  const resolved = assertInsideProducts(dir);
  const result = [];
  for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
    const full = path.join(resolved, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`No se admiten symlinks: ${full}`);
    if (entry.isDirectory()) result.push(...walkProducts(full));
    else if (entry.isFile() && ALLOWED_INPUT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(full);
  }
  return result;
}

function outputPath(inputPath) {
  const parsed = path.parse(inputPath);
  return assertInsideProducts(path.join(parsed.dir, `${parsed.name}.webp`));
}

async function metadata(filePath) {
  assertRegularFile(filePath);
  return sharp(fs.readFileSync(filePath), { animated: false, limitInputPixels: 40000000 }).metadata();
}

async function planFile(inputPath) {
  const inputStat = assertRegularFile(inputPath);
  const inputMeta = await metadata(inputPath);
  const output = outputPath(inputPath);
  const ext = path.extname(inputPath).toLowerCase();
  const outputExists = fs.existsSync(output);
  if (outputExists) assertRegularFile(output);
  const outputMeta = outputExists ? await metadata(output) : null;
  // Existing WebP files are canonical source assets. Keep them byte-stable;
  // delivery optimization happens in the derived card/swatch outputs below.
  const isCanonicalWebp = ext === '.webp';
  const needsConversion = RASTER_INPUT_EXTENSIONS.has(ext) && !outputExists;
  const needsReencode = false;
  return {
    inputPath,
    outputPath: output,
    input: { bytes: inputStat.size, format: inputMeta.format, width: inputMeta.width, height: inputMeta.height, hasAlpha: !!inputMeta.hasAlpha },
    output: outputMeta ? { bytes: fs.statSync(output).size, format: outputMeta.format, width: outputMeta.width, height: outputMeta.height } : null,
    action: isCanonicalWebp ? 'keep' : (needsReencode ? 'reencode' : (needsConversion ? 'convert' : 'review'))
  };
}

async function writeOptimized(plan) {
  if (!['convert', 'reencode'].includes(plan.action)) return null;
  const pipeline = sharp(fs.readFileSync(plan.inputPath), { animated: false, limitInputPixels: 40000000 })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: EFFORT });
  const temp = `${plan.outputPath}.tmp-${process.pid}.webp`;
  assertInsideProducts(temp);
  try {
    await pipeline.toFile(temp);
    assertRegularFile(temp);
    const bytes = fs.statSync(temp).size;
    if (plan.inputPath === plan.outputPath) fs.unlinkSync(plan.inputPath);
    fs.renameSync(temp, plan.outputPath);
    return bytes;
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function derivedPath(sourcePath, directory) {
  const fileName = `${path.parse(sourcePath).name}.webp`;
  return assertInside(directory, path.join(directory, fileName));
}

async function needsDerived(sourcePath, outputPath, options) {
  if (!fs.existsSync(outputPath)) return true;
  const sourceStat = fs.statSync(sourcePath);
  const outputStat = fs.statSync(outputPath);
  const info = await sharp(fs.readFileSync(outputPath)).metadata();
  return info.format !== "webp" || info.width > options.width || info.height > options.height || sourceStat.mtimeMs > outputStat.mtimeMs;
}

async function writeDerived(sourcePath, outputPath, options) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temp = `${outputPath}.tmp-${process.pid}.webp`;
  assertInside(path.dirname(outputPath), temp);
  try {
    await sharp(fs.readFileSync(sourcePath), { animated: false, limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: options.width,
        height: options.height,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: options.quality, effort: EFFORT })
      .toFile(temp);
    fs.renameSync(temp, outputPath);
    return fs.statSync(outputPath).size;
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function formatBytes(value) {
  return `${value.toLocaleString('es-AR')} B`;
}

async function main({ write = WRITE, derivedOnly = false } = {}) {
  if (!fs.existsSync(PRODUCTS_DIR)) throw new Error(`No existe ${PRODUCTS_DIR}`);
  const files = walkProducts(PRODUCTS_DIR);
  const plans = derivedOnly ? [] : await Promise.all(files.map(planFile));
  const jobs = plans.filter((plan) => ['convert', 'reencode'].includes(plan.action));
  let before = 0;
  let after = 0;
  for (const plan of jobs) {
    before += plan.input.bytes;
    if (write) {
      const bytes = await writeOptimized(plan);
      after += bytes;
      console.log(`${path.relative(ROOT, plan.inputPath)} -> ${path.relative(ROOT, plan.outputPath)}: ${formatBytes(plan.input.bytes)} -> ${formatBytes(bytes)} (${((1 - bytes / plan.input.bytes) * 100).toFixed(1)}% ahorro)`);
    } else {
      after += plan.output ? plan.output.bytes : 0;
      console.log(`${path.relative(ROOT, plan.inputPath)} -> ${path.relative(ROOT, plan.outputPath)}: ${formatBytes(plan.input.bytes)} -> ${plan.output ? formatBytes(plan.output.bytes) : 'se creará'} [dry-run]`);
    }
  }
  const kept = plans.filter((plan) => plan.action === 'keep').length;
  const review = plans.filter((plan) => plan.action === 'review').length;

  const canonicalFiles = walkProducts(PRODUCTS_DIR).filter((file) => path.extname(file).toLowerCase() === '.webp');
  const candidates = canonicalFiles.flatMap((sourcePath) => {
    const cardPath = derivedPath(sourcePath, THUMBS_DIR);
    const swatchPath = derivedPath(sourcePath, SWATCHES_DIR);
    return [
      { sourcePath, outputPath: cardPath, kind: 'card', options: CARD_THUMB },
      { sourcePath, outputPath: swatchPath, kind: 'swatch', options: COLOR_SWATCH }
    ];
  });
  const decisions = await Promise.all(candidates.map(plan => needsDerived(plan.sourcePath, plan.outputPath, plan.options)));
  const derivedPlans = candidates.filter((plan, index) => decisions[index]);

  let derivedBeforeBytes = 0;
  let derivedAfterBytes = 0;
  let derivedWritten = 0;
  for (const plan of derivedPlans) {
    if (fs.existsSync(plan.outputPath)) derivedBeforeBytes += fs.statSync(plan.outputPath).size;
    if (write) {
      const bytes = await writeDerived(plan.sourcePath, plan.outputPath, plan.options);
      derivedAfterBytes += bytes;
      derivedWritten += 1;
    }
  }

  console.log(JSON.stringify({
    dryRun: !write,
    scanned: plans.length,
    planned: jobs.length,
    kept,
    review,
    inputBytes: before,
    outputBytes: after,
    derivedPlanned: derivedPlans.length,
    derivedWritten,
    derivedBeforeBytes,
    derivedAfterBytes,
    derived: {
      card: `${CARD_THUMB.width}x${CARD_THUMB.height}@${CARD_THUMB.quality}`,
      swatch: `${COLOR_SWATCH.width}x${COLOR_SWATCH.height}@${COLOR_SWATCH.quality}`
    },
    maxSide: MAX_SIDE,
    quality: QUALITY,
    effort: EFFORT
  }, null, 2));
}

if (require.main === module) main().catch((error) => {
  console.error(`optimize-product-images: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { main, assertInsideProducts, walkProducts, needsDerived, writeDerived };
