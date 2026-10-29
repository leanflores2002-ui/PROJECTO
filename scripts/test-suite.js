const { spawnSync } = require('node:child_process');
const path = require('node:path');
// Keep every existing default check. Run remaining groups even after a failure,
// so an obsolete catalog snapshot cannot hide an unrelated regression.
const tests = [
  'storefrontTemplate', 'catalogSync', 'page', 'romixIconButton', 'catalogRoute',
  'catalogFilter', 'cardVariant', 'productGallery', 'salePricing', 'cartOrder',
  'colorName', 'seasonVisibility', 'recommendedOrder', 'storefrontStability',
  'sharePreview', 'productImageResolver', 'imageUtils', 'mediaStorage',
  'shareSecurity', 'seo', 'categoryPages', 'analytics', 'sharePrice',
  'productSeo', 'cartPersistence', 'productDerivative', 'catalogIdentity', 'productFormat', 'privacy', 'terms'
];
const failures = [];
for (const name of tests) {
  const file = path.join(__dirname, '../tests', name + 'Tests.js');
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit', timeout: 120000, shell: false });
  if (result.error || result.status !== 0) {
    failures.push(name);
    console.error(`${name}: FAILED (${result.error ? result.error.message : result.status})`);
  }
}
console.log(`${tests.length - failures.length}/${tests.length} groups passed; failures: ${failures.join(', ') || 'none'}`);
process.exitCode = failures.length ? 1 : 0;
