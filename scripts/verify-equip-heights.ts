/**
 * Verify left/right equipment boxes share the same height per row.
 */
import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { renderReportHtml } from '../src/templates/report';
import type { ReportPayload } from '../types/report';

async function main() {
  const payload = JSON.parse(
    await fs.readFile(path.join(__dirname, '..', '..', 'test', 'motovo-sample-report-A1EKY.json'), 'utf8'),
  ) as ReportPayload;
  const html = renderReportHtml(payload);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(async () => {
    const docAny = document as Document & { fonts?: { ready?: Promise<unknown> } };
    if (docAny.fonts?.ready) await docAny.fonts.ready;
  });

  const rows = await page.$$eval('.equip-grid-row', (rowEls) =>
    rowEls.map((row, idx) => {
      const cats = Array.from(row.querySelectorAll(':scope > .equip-cat:not(.equip-cat--spacer)'));
      const heights = cats.map((c) => Math.round(c.getBoundingClientRect().height));
      return { row: idx + 1, heights, equal: heights.length < 2 || Math.abs(heights[0] - heights[1]) <= 1 };
    }),
  );

  console.log(JSON.stringify(rows, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
