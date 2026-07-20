import { chromium } from 'playwright';
import { renderReportHtml } from '../src/templates/report';
import { printPaginationScript } from '../src/templates/printPagination';
import * as fs from 'fs';

(async () => {
  const vrm = process.argv[2] || 'AE19OCW';
  const payload = JSON.parse(fs.readFileSync(`../test/motovo-sample-report-${vrm}.json`, 'utf8'));
  const html = renderReportHtml(payload);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1240, height: 1754 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(printPaginationScript());

  const PAGE = 1754;
  const TOP = (22 / 297) * PAGE;
  const BOTTOM = (16 / 297) * PAGE;
  const CONTENT = PAGE - TOP - BOTTOM;

  const after = await page.evaluate(
    ({ TOP, CONTENT }) => {
      function pageOf(y: number) {
        return Math.floor(Math.max(0, y - TOP) / CONTENT) + 1;
      }
      return Array.from(document.querySelectorAll('.equip-pack-chunk')).map((el, i) => {
        const r = el.getBoundingClientRect();
        const bits = Array.from(el.querySelectorAll('.equip-group-title')).map((x) =>
          (x.textContent || '').trim(),
        );
        const cats = Array.from(el.querySelectorAll('.equip-cat h4')).map((x) =>
          (x.textContent || '').trim(),
        );
        return {
          i,
          break: el.classList.contains('equip-pack-chunk--break'),
          top: Math.round(r.top),
          height: Math.round(r.height),
          modelPage: pageOf(r.top),
          rem: Math.round(TOP + pageOf(r.top) * CONTENT - r.top),
          bits,
          cats,
        };
      });
    },
    { TOP, CONTENT },
  );
  console.log(vrm, { TOP, CONTENT });
  console.log(JSON.stringify(after, null, 2));

  // Also check where section title / note sit
  const lead = await page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height) };
    };
    return {
      manuf: box(
        Array.from(document.querySelectorAll('.section-title')).find((el) =>
          (el.textContent || '').includes('Manufacturer'),
        ) || null,
      ),
      note: box(document.querySelector('.equip-note')),
    };
  });
  console.log('lead', lead);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
