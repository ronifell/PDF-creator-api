import { chromium } from 'playwright';
import { renderReportHtml } from '../src/templates/report';
import { printPaginationScript } from '../src/templates/printPagination';
import * as fs from 'fs';

async function main() {
  const vrm = process.argv[2] || 'A1EKY';
  const payload = JSON.parse(
    fs.readFileSync(`../test/motovo-sample-report-${vrm}.json`, 'utf8'),
  );
  const html = renderReportHtml(payload);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1240, height: 1754 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  const before = await page.evaluate(() => {
    const styleText = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\\n');
    const el = document.querySelector('.disclaimer-strip');
    if (!el) return { height: -1 };

    const ruleExists = (selector: string) => {
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          const rules = sheet.cssRules ? Array.from(sheet.cssRules) : [];
          for (const rule of rules) {
            const st = (rule as any)?.selectorText as string | undefined;
            if (rule && st && st.includes(selector)) return true;
          }
        }
      } catch {
        // ignore
      }
      return false;
    };

    let sheetInfo: any = null;
    try {
      const sheet = document.styleSheets[0];
      const rules = sheet?.cssRules ? Array.from(sheet.cssRules) : [];
      sheetInfo = {
        ruleCount: rules.length,
        lastSelectors: rules.slice(-5).map((r: any) => r.selectorText || r.cssText?.slice?.(0, 40)).filter(Boolean),
      };
    } catch {
      sheetInfo = { error: 'no cssRules' };
    }

    const ruleDisclaimer = ruleExists('.disclaimer-strip');
    const rulePageBreak = ruleExists('.page-break');
    const ruleEquipCell = ruleExists('.equip-cell');

    const s = getComputedStyle(el);
    const t = document.querySelector('.disclaimer-strip__title');
    const tb = document.querySelector('.disclaimer-strip__body');
    const ts = t ? getComputedStyle(t) : null;
    const bs = tb ? getComputedStyle(tb) : null;
    return {
      height: el.getBoundingClientRect().height,
      cssHasRule: styleText.includes('.disclaimer-strip'),
      cssRuleParsedDisclaimer: ruleDisclaimer,
      cssRuleParsedPageBreak: rulePageBreak,
      cssRuleParsedEquipCell: ruleEquipCell,
      sheetInfo,
      display: s.display,
      backgroundColor: s.backgroundColor,
      borderTopWidth: s.borderTopWidth,
      borderTopStyle: s.borderTopStyle,
      borderTopColor: s.borderTopColor,
      titleColor: ts?.color || null,
      bodyColor: bs?.color || null,
    };
  });

  const beforeCard = await page.evaluate(() => {
    const card = document.querySelector('.equip-cell-card') as HTMLElement | null;
    if (!card) return null;
    const s = getComputedStyle(card);
    return {
      backgroundColor: s.backgroundColor,
      borderTopWidth: s.borderTopWidth,
      borderTopColor: s.borderTopColor,
      borderTopStyle: s.borderTopStyle,
    };
  });

  const beforeRects = await page.evaluate(() => {
    const el = document.querySelector('.disclaimer-strip');
    if (!el) return { count: 0 };
    const rects = Array.from(el.getClientRects());
    return {
      count: rects.length,
      tops: rects.slice(0, 5).map((r) => Math.round(r.top)),
      bottoms: rects.slice(0, 5).map((r) => Math.round(r.bottom)),
    };
  });

  await page.evaluate(printPaginationScript());

  const after = await page.evaluate(() => {
    const PAGE = 1754;
    const TOP = (22 / 297) * PAGE;
    const BOTTOM = (16 / 297) * PAGE;
    const CONTENT = PAGE - TOP - BOTTOM;
    const el = document.querySelector('.disclaimer-strip');
    const lastEquip = document.querySelector('.equip-row-table:last-of-type');
    if (!el) return { error: 'no disclaimer-strip' };
    const r = el.getBoundingClientRect();
    const lr = lastEquip?.getBoundingClientRect();
    const pageIdx = Math.floor(Math.max(0, r.top - TOP) / CONTENT);
    const rem = TOP + (pageIdx + 1) * CONTENT - r.top;
    return {
      disclaimerTop: Math.round(r.top),
      disclaimerHeight: Math.round(r.height),
      lastEquipBottom: lr ? Math.round(lr.bottom) : null,
      hasPageBreak: el.classList.contains('page-break'),
      remaining: Math.round(rem),
      needed: Math.round(r.height + parseFloat(getComputedStyle(el).marginTop || '0')),
      pageIdx,
      contentHeight: Math.round(CONTENT),
    };
  });

  console.log(vrm, { before, beforeCard, after });
  console.log('beforeRects', beforeRects);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
