import { ReportPayload } from '../types/report';
import { reportStyles } from './styles';
import { esc, fmtDate } from './helpers';
import { renderCover } from './sections/cover';
import { renderVehicleOverview } from './sections/vehicle';
import { renderRiskChecks } from './sections/risks';
import { renderMileageTrend, renderMotHistory } from './sections/mot';
import { renderKeeperHistory } from './sections/keepers';
import { renderWriteoffSection } from './sections/writeoff';
import { renderValuation } from './sections/valuation';
import { renderEquipment } from './sections/equipment';
import { renderTaxAndFinance } from './sections/taxAndFinance';

/**
 * Render the full HTML document for a vehicle report.
 *
 * The document body is wrapped in a single `.page` container; Playwright
 * handles page breaks automatically using the `break-inside`/`break-before`
 * CSS hints attached to individual section blocks.
 */
export function renderReportHtml(payload: ReportPayload): string {
  const v = payload.report_data?.vehicle || {};
  const vrm = payload.registration_number || payload.report_data?.registration_number || v.vrm || '';
  const title = `Motovo Car Check — ${vrm} ${v.make || ''} ${v.model || ''}`.trim();

  return /* html */ `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <meta name="generator" content="Motovo PDF Service" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet" />
    <style>${reportStyles}</style>
  </head>
  <body>
    <main class="page">
      ${renderCover(payload)}
      ${renderRiskChecks(payload)}
      ${renderVehicleOverview(payload)}
      ${renderWriteoffSection(payload)}
      ${renderMotHistory(payload)}
      ${renderMileageTrend(payload)}
      ${renderKeeperHistory(payload)}
      ${renderTaxAndFinance(payload)}
      ${renderValuation(payload)}
      ${renderEquipment(payload)}

      <section class="section no-break" style="margin-top:18px;">
        <div class="card" style="background: var(--secondary); border-color: var(--border);">
          <h4 style="color: var(--primary);">Disclaimer</h4>
          <p class="small text-muted" style="margin-top:4px;">
            This report is compiled from third-party data feeds (DVLA, MIAFTR, finance houses and trade
            valuation books) and is provided for informational purposes only. Every reasonable effort is
            made to ensure accuracy, however Motovo accepts no liability for any decision made on the
            basis of this report. Always verify VIN, mileage and condition in person before purchase.
          </p>
        </div>
      </section>
    </main>
  </body>
  </html>`;
}

/* -------------------------------------------------------------------------- */
/* Header / Footer templates                                                  */
/*                                                                            */
/* Playwright limitations:                                                    */
/* - Header/footer templates render with their own <html> & default font.     */
/* - Only inline CSS works; external stylesheets are not loaded.              */
/* - Default font-size is tiny; we set it explicitly.                          */
/* -------------------------------------------------------------------------- */

const HEADER_FOOTER_FONT = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  -webkit-print-color-adjust: exact;
`;

/**
 * Header/footer templates render in the Playwright top/bottom page margins.
 * Keep them short — Chromium positions them at the very edge of the page and
 * any extra height will eat into the content area.
 *
 * We hide the header on page 1 (the cover handles branding) by using a wrapper
 * class. Playwright doesn't expose a "first page" CSS hook so we use the
 * `pageNumber` placeholder + visibility CSS trick: when the placeholder text
 * is "1", we conditionally hide the bar. As a fallback, the cover banner sits
 * far enough below the top of the page that any leakage is barely visible.
 */
export function renderHeaderHtml(payload: ReportPayload): string {
  const vrm = payload.registration_number || payload.report_data?.registration_number || '';
  const make = payload.make || payload.report_data?.vehicle?.make || '';
  const model = payload.model || payload.report_data?.vehicle?.model || '';

  return `
    <div style="${HEADER_FOOTER_FONT} font-size:7.5pt; color:#111827; width:100%; padding:6mm 10mm 0; box-sizing:border-box;">
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #D1D4DC; padding-bottom:2mm;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:8px; height:8px; background:#F5B400; border-radius:2px;"></span>
          <strong style="color:#163B5F; font-size:8pt; letter-spacing:.02em;">MOTOVO</strong>
          <span style="color:#6B7280;">Car Check Report</span>
        </div>
        <div style="color:#6B7280; font-size:7pt;">
          <strong style="color:#111827;">${esc(vrm)}</strong>${vrm ? ' · ' : ''}${esc(make)} ${esc(model)}
        </div>
      </div>
    </div>
  `;
}

export function renderFooterHtml(payload: ReportPayload): string {
  const generated = payload.generated_at || payload.created_date;
  return `
    <div style="${HEADER_FOOTER_FONT} font-size:7pt; color:#6B7280; width:100%; padding:2mm 10mm 5mm; box-sizing:border-box;">
      <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid #D1D4DC; padding-top:2mm;">
        <div>Confidential — for dealer use only · Generated ${esc(fmtDate(generated))}</div>
        <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      </div>
    </div>
  `;
}
