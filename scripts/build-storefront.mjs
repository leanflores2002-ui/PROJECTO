import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sourceDir = path.join(repoRoot, 'frontend', 'public');
const outputDir = path.join(repoRoot, 'apps', 'storefront', 'dist');

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Legacy storefront source not found: ${sourceDir}`);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.cpSync(sourceDir, outputDir, { recursive: true });

const files = [];
function collectFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(absolutePath);
    else files.push(path.relative(outputDir, absolutePath));
  }
}

collectFiles(outputDir);
console.log(`Storefront static build copied ${files.length} files from frontend/public`);
