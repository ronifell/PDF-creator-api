/* eslint-disable */
/**
 * Build a clean dev fallback vehicle photo from an older page-2 PNG export.
 * Crops tightly around the car silhouette only (no page header / frame chrome).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const srcPng = path.resolve('out/pages/sample-02.png');
const destJpg = path.resolve('src/assets/sample-vehicle.jpg');

if (!fs.existsSync(srcPng)) {
  console.error('Missing', srcPng);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 833, height: 1179 } });
await page.goto(`file:///${srcPng.replace(/\\/g, '/')}`);

// Measured from the known-good page-2 export (833 × 1179 px).
// y starts below the inner horizontal rule; height includes wheels + shadow.
const shot = await page.screenshot({
  type: 'jpeg',
  quality: 92,
  clip: { x: 90, y: 122, width: 650, height: 182 },
});

fs.writeFileSync(destJpg, shot);
console.log('Wrote', destJpg, shot.length, 'bytes');
await browser.close();
