/**
 * Print-safe tile grids for PDF output.
 *
 * Chromium's page.pdf() frequently slices CSS-grid/flex tile rows across
 * pages (labels on page N, values on page N+1). HTML tables with
 * break-inside:avoid on each <tr> and on the outer wrapper are much more
 * reliable — this helper centralises that pattern.
 */

export function chunkItems<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export function renderTileTable(
  cellHtmlRows: string[][],
  opts: {
    tableClass: string;
    rowClass: string;
    cellClass: string;
    columns: number;
    wrapperClass?: string;
  },
): string {
  const wrapperClass = opts.wrapperClass || 'tile-grid-block';
  const body = cellHtmlRows
    .map((cells) => {
      const tds = cells.map((html) => `<td class="${opts.cellClass}">${html}</td>`).join('');
      const pad = opts.columns - cells.length;
      const empty =
        pad > 0
          ? Array.from({ length: pad }, () => `<td class="${opts.cellClass} ${opts.cellClass}--empty"></td>`).join('')
          : '';
      return `<tr class="${opts.rowClass}">${tds}${empty}</tr>`;
    })
    .join('');

  return `<div class="${wrapperClass}"><table class="${opts.tableClass}" role="presentation"><tbody>${body}</tbody></table></div>`;
}
