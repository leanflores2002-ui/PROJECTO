// Deprecated compatibility entry point.
// Product media is now optimized in-place as canonical WebP files.
const { main } = require('./optimize-product-images');

if (require.main === module) {
  console.warn('generate-images.js está obsoleto; use npm run optimize:products');
  main().catch((error) => {
    console.error(`generate-images: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
