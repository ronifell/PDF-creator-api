/**
 * Pre-PDF pagination pass.
 *
 * Equipment rows use CSS `break-inside: avoid` only. Forcing or soft-preferring
 * `break-before: avoid` across many consecutive rows makes Chromium cascade
 * whole chains onto the next page and *increases* empty space at page bottoms.
 *
 * `.section--fit-page` still moves whole sections when only a sliver remains.
 */
export function printPaginationScript(): string {
  return /* js */ `(() => {
    const PAGE_HEIGHT_PX = 1754;
    const TOP_MARGIN_PX = (22 / 297) * PAGE_HEIGHT_PX;
    const BOTTOM_MARGIN_PX = (16 / 297) * PAGE_HEIGHT_PX;
    const CONTENT_HEIGHT = PAGE_HEIGHT_PX - TOP_MARGIN_PX - BOTTOM_MARGIN_PX;

    function pageIndexForY(y) {
      return Math.floor(Math.max(0, y - TOP_MARGIN_PX) / CONTENT_HEIGHT);
    }

    function pageContentTop(pageIdx) {
      return TOP_MARGIN_PX + pageIdx * CONTENT_HEIGHT;
    }

    function remainingOnPage(top) {
      const idx = pageIndexForY(top);
      return pageContentTop(idx) + CONTENT_HEIGHT - top;
    }

    function breakShiftAt(continuousTop) {
      let shift = 0;
      Array.from(document.querySelectorAll('.page-break, .section--page-break'))
        .map((el) => el.getBoundingClientRect().top)
        .filter((top) => top <= continuousTop + 0.5)
        .sort((a, b) => a - b)
        .forEach((top) => {
          const effectiveTop = top + shift;
          const nextTop = pageContentTop(pageIndexForY(effectiveTop) + 1);
          shift += Math.max(0, nextTop - effectiveTop);
        });
      return shift;
    }

    // Drop leftover wrappers from older builds.
    document.querySelectorAll('.equip-pack-chunk').forEach((chunk) => {
      const parent = chunk.parentNode;
      if (!parent) return;
      while (chunk.firstChild) parent.insertBefore(chunk.firstChild, chunk);
      chunk.remove();
    });

    // Atomic sections — move whole block when only a sliver remains.
    document.querySelectorAll('.section--fit-page').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0) return;
      const effectiveTop = rect.top + breakShiftAt(rect.top);
      if (remainingOnPage(effectiveTop) < rect.height * 0.92) {
        el.classList.add('page-break');
      }
    });

    // Equipment rows — atomic only; do not set break-before avoid/page.
    document.querySelectorAll('.equip-row-table, .equip-grid-row, .equip-group-title').forEach((el) => {
      el.classList.remove('page-break');
      el.style.breakBefore = '';
      el.style.pageBreakBefore = '';
    });

    // Equalise paired equipment cards. Chromium print often fails to stretch
    // table-cell backgrounds to the row height; set an explicit pixel height
    // from the taller cell so left/right borders align.
    document.querySelectorAll('.equip-row-table tr').forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll('.equip-cell'));
      if (cells.length < 2) return;
      cells.forEach((c) => {
        c.style.height = '';
        const card = c.querySelector('.equip-cell-card');
        if (card) card.style.height = '';
      });
      const maxH = Math.max(...cells.map((c) => c.getBoundingClientRect().height));
      if (maxH > 0) {
        cells.forEach((c) => {
          c.style.height = Math.ceil(maxH) + 'px';
          const card = c.querySelector('.equip-cell-card');
          if (card) card.style.height = '100%';
        });
      }
    });

    // Disclaimer — never split across pages.
    //
    // Equipment rows use "break-inside: avoid", so Chromium may effectively
    // push later content down to the next printed page. We approximate that
    // by simulating page-fit for each ".equip-row-table" that appears before
    // the disclaimer, and then deciding whether the disclaimer would still fit
    // in the remaining space on its (simulated) page.
    document.querySelectorAll('.disclaimer-strip').forEach((el) => {
      el.classList.remove('page-break');
      el.style.breakBefore = '';
      el.style.pageBreakBefore = '';

      const disclaimerRect = el.getBoundingClientRect();
      if (disclaimerRect.height <= 0) return;

      // Simulate the accumulated "push down" offset caused by equipment rows
      // that don't fit in the current printed page.
      const equipRows = Array.from(document.querySelectorAll('.equip-row-table')).sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top;
      });

      let equipShift = 0;
      for (const row of equipRows) {
        const r = row.getBoundingClientRect();
        if (r.height <= 0) continue;
        if (r.top >= disclaimerRect.top) break; // only rows that come before the disclaimer

        const effectiveTop = r.top + equipShift;
        if (remainingOnPage(effectiveTop) < r.height) {
          const nextTop = pageContentTop(pageIndexForY(effectiveTop) + 1);
          equipShift += Math.max(0, nextTop - effectiveTop);
        }
      }

      const marginTop = parseFloat(getComputedStyle(el).marginTop) || 0;
      const effectiveDisclaimerTop = disclaimerRect.top + equipShift;
      const remaining = remainingOnPage(effectiveDisclaimerTop);
      const needed = disclaimerRect.height + marginTop;

      if (remaining < needed) {
        el.classList.add('page-break');
      }
    });
  })();`;
}
