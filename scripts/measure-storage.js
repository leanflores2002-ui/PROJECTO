const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
// CLI input selects a fixed filename; it is never incorporated into a path.
function reportFile(phase = 'after') {
  if (phase === 'before') return path.join(root, 'reports', 'storage-before.json');
  if (phase === 'after') return path.join(root, 'reports', 'storage-after.json');
  throw new Error('Storage phase must be before or after');
}
const scopes = ['', 'frontend', 'frontend/public', 'frontend/public/images', 'frontend/public/images/products', 'frontend/public/images/banners', 'frontend/public/images/optimized', 'frontend/public/videos', 'frontend/public/share-previews'];
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), {withFileTypes:true}).flatMap(e => {
    if (e.isSymbolicLink() || e.name === '.git' || e.name === 'reports') return [];
    const name = [dir,e.name].filter(Boolean).join('/');
    return e.isDirectory() ? walk(name) : [{path:name, bytes:fs.statSync(path.join(root,name)).size}];
  });
}
function main(phase) {
  const output = reportFile(phase);
  const files = walk('');
  const metrics = scopes.map(scope => {
    const entries = files.filter(f => !scope || f.path.startsWith(scope+'/'));
    const bytes = entries.reduce((s,f)=>s+f.bytes,0);
    return {path:scope || 'working tree',bytes,MB:bytes/1e6,GB:bytes/1e9,files:entries.length,
      ...Object.fromEntries([1,2,5,10].map(n=>['over'+n+'MB',entries.filter(f=>f.bytes>n*1e6).length]))};
  });
  fs.mkdirSync(path.join(root,'reports'),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({units:'decimal',excludes:['.git','reports'],includesLocalDependencies:true,metrics},null,2));
  console.log(JSON.stringify(metrics,null,2));
}
if (require.main === module) main(process.argv[2]);
module.exports = {reportFile};
