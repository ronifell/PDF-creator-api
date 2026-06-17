import fs from 'fs';
import path from 'path';

/**
 * Resolve a path inside the project's `assets/` directory. Works in both:
 *   - dev (ts-node-dev) — assets live next to the TS source in src/assets
 *   - prod (compiled)   — copy-assets.js mirrors src/assets to dist/assets
 *                          (see scripts/copy-assets.js)
 *
 * `__dirname` resolves to `src/templates` (dev) or `dist/templates` (prod);
 * `../assets/` is correct in both layouts.
 */
const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');

const cache = new Map<string, string>();

export function readAssetText(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const value = fs.readFileSync(path.join(ASSETS_DIR, name), 'utf-8');
  cache.set(name, value);
  return value;
}

export function readAssetDataUrl(name: string, mimeType: string): string {
  const key = `data:${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const buf = fs.readFileSync(path.join(ASSETS_DIR, name));
  const url = `data:${mimeType};base64,${buf.toString('base64')}`;
  cache.set(key, url);
  return url;
}
