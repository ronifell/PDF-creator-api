/* eslint-disable */
// Copy non-TS assets (SVG/images) from src/assets to dist/assets after `tsc` build.
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'assets');
const destDir = path.join(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(srcDir)) {
  console.log('[copy-assets] No src/assets directory, skipping.');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(srcDir, destDir);
console.log(`[copy-assets] Copied assets to ${destDir}`);
