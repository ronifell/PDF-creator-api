/* eslint-disable */
/**
 * Render every page of a PDF to PNG using Playwright's Chromium + pdf.js
 * (loaded inside the browser, where Canvas2D/Image work natively).
 *
 *   node scripts/pdf-to-png.mjs <input.pdf> <outDir> [prefix]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PDFJS_VERSION = '4.5.136';
const PDFJS_LIB = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

async function main() {
  const [, , inputArg, outDirArg, prefixArg] = process.argv;
  if (!inputArg || !outDirArg) {
    console.error('usage: node pdf-to-png.mjs <input.pdf> <outDir> [prefix]');
    process.exit(1);
  }
  const inputPath = path.resolve(inputArg);
  const outDir = path.resolve(outDirArg);
  const prefix = prefixArg || 'page';
  fs.mkdirSync(outDir, { recursive: true });

  const data = fs.readFileSync(inputPath);
  const base64 = data.toString('base64');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 1700 } });
  const page = await ctx.newPage();

  const html = `<!doctype html><html><body style="margin:0;background:#fff;">
    <div id="root"></div>
    <script type="module">
      import * as pdfjs from '${PDFJS_LIB}';
      pdfjs.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER}';
      window.__renderAll = async (base64, scale) => {
        const bin = atob(base64);
        const data = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
        const pdf = await pdfjs.getDocument({ data }).promise;
        const out = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const p = await pdf.getPage(n);
          const viewport = p.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const c = canvas.getContext('2d');
          c.fillStyle = '#fff';
          c.fillRect(0, 0, canvas.width, canvas.height);
          await p.render({ canvasContext: c, viewport, canvas }).promise;
          out.push({
            n,
            w: viewport.width,
            h: viewport.height,
            dataUrl: canvas.toDataURL('image/png'),
          });
        }
        return out;
      };
      window.__ready = true;
    </script>
  </body></html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 });

  const pages = await page.evaluate(
    async ({ base64, scale }) => await window.__renderAll(base64, scale),
    { base64, scale: 1.4 },
  );

  console.log(`[pdf-to-png] ${inputPath} -> ${pages.length} pages`);
  for (const p of pages) {
    const out = path.join(outDir, `${prefix}-${String(p.n).padStart(2, '0')}.png`);
    const b64 = p.dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log(`  wrote ${out} (${Math.round(p.w)}x${Math.round(p.h)})`);
  }

  await ctx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
