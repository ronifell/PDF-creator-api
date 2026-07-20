import { chromium } from 'playwright';
import { renderReportHtml } from '../src/templates/report';
import { printPaginationScript } from '../src/templates/printPagination';
import * as fs from 'fs';

async function diagnose(vrm: string) {
  const payload = JSON.parse(fs.readFileSync(`../test/motovo-sample-report-${vrm}.json`, 'utf8'));
  const html = renderReportHtml(payload);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.emulateMedia({ media: 'print' });

  const before = await page.evaluate(() => {
    const PAGE_HEIGHT_PX = 1754;
    const TOP_MARGIN_PX = (22 / 297) * PAGE_HEIGHT_PX;
    const BOTTOM_MARGIN_PX = (16 / 297) * PAGE_HEIGHT_PX;
    const CONTENT_HEIGHT = PAGE_HEIGHT_PX - TOP_MARGIN_PX - BOTTOM_MARGIN_PX;
    return Array.from(document.querySelectorAll('.equip-grid-row')).map((el, i) => {
      const r = el.getBoundingClientRect();
      const cats = Array.from(el.querySelectorAll('.equip-cat h4')).map((h) => h.textContent?.trim());
      const contentY = Math.max(0, r.top - TOP_MARGIN_PX);
      const pageIdx = Math.floor(contentY / CONTENT_HEIGHT);
      const pageBottom = TOP_MARGIN_PX + (pageIdx + 1) * CONTENT_HEIGHT;
      return {
        i,
        cats,
        top: Math.round(r.top),
        height: Math.round(r.height),
        page: pageIdx + 1,
        remaining: Math.round(pageBottom - r.top),
        fits: r.height <= pageBottom - r.top,
      };
    });
  });

  await page.evaluate(printPaginationScript());

  const after = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.equip-grid-row')).map((el, i) => {
      const r = el.getBoundingClientRect();
      const cats = Array.from(el.querySelectorAll('.equip-cat h4')).map((h) => h.textContent?.trim());
      return {
        i,
        cats,
        top: Math.round(r.top),
        height: Math.round(r.height),
        pageBreak: el.classList.contains('page-break'),
        breakBefore: (el as HTMLElement).style.breakBefore,
        breakInside: (el as HTMLElement).style.breakInside,
      };
    });
  });

  console.log('\n===', vrm, 'BEFORE pack ===');
  console.table(before);
  console.log('===', vrm, 'AFTER pack ===');
  console.table(after);

  await browser.close();
}

(async () => {
  for (const v of process.argv.slice(2)) await diagnose(v);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
