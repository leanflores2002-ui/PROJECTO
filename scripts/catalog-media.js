const fs = require('node:fs');
const path = require('node:path');
const {localFile,hash} = require('./social-images');
const products = require('../frontend/public/assets/data/products.json');
function references(value, at='', result=[]) {
  if (typeof value === 'string' && /\.(png|jpe?g|webp|avif)(?:[?#].*)?$/i.test(value)) result.push({field:at,url:value});
  else if (value && typeof value === 'object') for (const [key,item] of Object.entries(value)) references(item,`${at}.${key}`,result);
  return result;
}
function inventory() {
  return products.flatMap(p=>references(p).map(r=>({product:p.id || p.name,...r}))).map(r=>{
    if (/^https:\/\//i.test(r.url)) return {...r,remote:true};
    const file = localFile(r.url);
    if (!fs.existsSync(file)) throw new Error(`Missing media ${r.product} ${r.field}: ${r.url}`);
    const bytes=fs.readFileSync(file);
    return {...r,remote:false,bytes:bytes.length,sha256:hash(bytes)};
  });
}
if (require.main === module) {
  // Dry run only: no upload, product mutation or deletion operation exists here.
  const entries=inventory();
  const base=process.env.ROMIX_STORAGE_PUBLIC_BASE;
  if(base && !/^https:\/\/.+\/storage\/v1\/object\/public\//.test(base)) throw new Error('Expected an HTTPS public bucket base URL');
  const assets=[...new Map(entries.filter(r=>!r.remote).map(r=>[r.url,r])).values()].map(r=>({
    ...r, proposedUrl:base ? `${base.replace(/\/$/,'')}/${r.sha256}/${encodeURIComponent(path.basename(r.url))}` : null,
    action:'REVIEW',reason:'Verify upload, public access, CORS/cache, admin and all color/thumbnail references before migrating'
  }));
  fs.mkdirSync('reports',{recursive:true});
  fs.writeFileSync('reports/storage-migration-dry-run.json',JSON.stringify({dryRun:true,remoteReferences:entries.filter(r=>r.remote).length,assets},null,2));
  console.log({references:entries.length,uniqueLocalAssets:assets.length,remoteReferences:entries.filter(r=>r.remote).length});
}
module.exports={inventory};
