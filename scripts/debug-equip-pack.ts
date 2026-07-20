import { chromium } from 'playwright';
import { renderReportHtml } from '../src/templates/report';
import { printPaginationScript } from '../src/templates/printPagination';
import * as fs from 'fs';

async function main() {
  const vrm = process.argv[2] || 'A1EKY';
  const payload = JSON.parse(fs.readFileSync(`../test/motovo-sample-report-${vrm}.json`, 'utf8'));
  const html = renderReportHtml(payload);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });

  const before = await page.evaluate(() => {
    const PAGE_HEIGHT_PX = 1754;
    const TOP_MARGIN_PX = (22 / 297) * PAGE_HEIGHT_PX;
    const BOTTOM_MARGIN_PX = (16 / 297) * PAGE_HEIGHT_PX;
    const CONTENT_HEIGHT = PAGE_HEIGHT_PX - TOP_MARGIN_PX - BOTTOM_MARGIN_PX;
    function pageIndexForY(y: number) {
      return Math.floor(Math.max(0, y - TOP_MARGIN_PX) / CONTENT_HEIGHT);
    }
    function remainingOnPage(top: number) {
      const idx = pageIndexForY(top);
      return TOP_MARGIN_PX + (idx + 1) * CONTENT_HEIGHT - top;
    }
    return Array.from(document.querySelectorAll('.equip-grid-row')).map((el, i) => {
      const r = el.getBoundingClientRect();
      const cats = Array.from(el.querySelectorAll('h4')).map((h) => h.textContent?.trim());
      return {
        i,
        cats,
        top: Math.round(r.top),
        height: Math.round(r.height),
        page: pageIndexForY(r.top),
        remaining: Math.round(remainingOnPage(r.top)),
        fits: r.height <= remainingOnPage(r.top) + 10,
      };
    });
  });
  console.log('BEFORE pagination:', JSON.stringify(before, null, 2));

  await page.evaluate(printPaginationScript());

  const after = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.equip-grid-row')).map((el, i) => {
      const cats = Array.from(el.querySelectorAll('h4')).map((h) => h.textContent?.trim());
      return {
        i,
        cats,
        pageBreak: el.classList.contains('page-break'),
        breakInside: (el as HTMLElement).style.breakInside,
      };
    });
  });
  console.log('AFTER pagination:', JSON.stringify(after, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
