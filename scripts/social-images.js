const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const PUBLIC = path.resolve(__dirname, '../frontend/public');
const LIMIT = 400000;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const IMAGE_OPTIONS = {limitInputPixels:40000000};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function localFile(value) {
  const raw = String(value || '').trim();
  // Catalog media are repository assets. No schemes, network shares or drives.
  if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//') || raw.includes('\\')) {
    throw new Error('Only local public image paths are allowed');
  }
  const decoded = decodeURIComponent(raw).replace(/^\//, '');
  const parts = decoded.split('/');
  if (!['images','share-previews'].includes(parts[0]) || parts.some(p => !p || p === '.' || p === '..' || /[:\\\u0000-\u001f]/.test(p))) {
    throw new Error('Invalid local image path');
  }
  const file = path.resolve(PUBLIC, decoded);
  if (!file.startsWith(PUBLIC + path.sep)) throw new Error(`Invalid image path: ${value}`);
  // Reject symlinks/junctions, including an output directory pointing elsewhere.
  let current = PUBLIC;
  if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Linked public directory is not allowed');
  for (const part of parts) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Linked image paths are not allowed');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return file;
}

async function prepareSocialImage(product, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid social image slug');
  // The storefront's primary image is authoritative; do not pick a random color.
  const source = String(product.image || '').trim();
  if (!source || /placeholder|logo-romix/i.test(source)) throw new Error(`Missing primary image: ${product.id}`);
  // All current product images are local. Builds never fetch remote media.
  const sourceFile = localFile(source);
  const stat = fs.statSync(sourceFile);
  if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES) throw new Error('Source image exceeds local file budget');
  const input = fs.readFileSync(sourceFile);
  const metadata = await sharp(input, IMAGE_OPTIONS).metadata();
  const extension = path.extname(source.split(/[?#]/)[0]).toLowerCase();
  const extensionMatches = metadata.format === 'png' ? extension === '.png' : ['.jpg','.jpeg'].includes(extension);
  const reusable = extensionMatches && ['jpeg','png'].includes(metadata.format) && input.length <= LIMIT
    && metadata.width >= 200 && metadata.height >= 200 && (!metadata.orientation || metadata.orientation === 1);
  let image = source, output = input, width = metadata.width, height = metadata.height;
  let type = metadata.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  if (!reusable) {
    output = await sharp(input, IMAGE_OPTIONS).rotate().flatten({background:'#ffffff'})
      .resize(1200,630,{fit:'contain',background:'#ffffff'})
      .jpeg({quality:82,mozjpeg:true}).toBuffer();
    if (output.length > LIMIT) throw new Error(`Social image exceeds budget: ${slug}`);
    image = `share-previews/${slug}.jpg`;
    fs.mkdirSync(path.join(PUBLIC,'share-previews'),{recursive:true});
    fs.writeFileSync(localFile(image),output);
    width = 1200; height = 630; type = 'image/jpeg';
  }
  return {source,sourceHash:hash(input),image,imageHash:hash(output),width,height,type,bytes:output.length,dedicated:!reusable};
}

module.exports = {prepareSocialImage,localFile,hash,LIMIT,MAX_SOURCE_BYTES};
