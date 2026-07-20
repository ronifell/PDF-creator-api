import { ReportMode, ReportPayload } from '../types/report';
import { reportStyles } from './styles';
import { esc, fmtDate } from './helpers';
import { readAssetDataUrl } from './assets';
import { renderCover } from './sections/cover';
import { renderVehicleOverview } from './sections/vehicle';
import { renderRiskChecks } from './sections/risks';
import { renderMileageTrend, renderMotHistory } from './sections/mot';
import { renderKeeperHistory } from './sections/keepers';
import { renderPlateHistory } from './sections/plateHistory';
import { renderWriteoffSection } from './sections/writeoff';
import { renderStolenSection } from './sections/stolen';
import { renderFinance } from './sections/finance';
import { renderValuation } from './sections/valuation';
import { renderEquipment } from './sections/equipment';
import { renderRunningCosts } from './sections/runningCosts';

/**
 * Resolve the report mode from a payload, defaulting to "dealer".
 * Kept as a helper so every template + header/footer function agrees on
 * the same source of truth.
 */
export function resolveReportMode(payload: ReportPayload): ReportMode {
  return payload.report_mode === 'public' ? 'public' : 'dealer';
}

function brandSubtitle(mode: ReportMode): string {
  return mode === 'public' ? 'Vehicle History Report' : 'Dealer Vehicle History Report';
}

function footerConfidentiality(mode: ReportMode): string {
  return mode === 'public'
    ? 'For your reference — not for resale distribution'
    : 'Confidential — for dealer use only';
}

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
  const mode = resolveReportMode(payload);

  return /* html */ `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <meta name="generator" content="Motovo PDF Service" />
    <meta name="motovo-report-mode" content="${esc(mode)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet" />
    <style>${reportStyles}</style>
  </head>
  <body>
    <main class="page">
      <!-- 1. Hero / cover -->
      <!-- 2. Key Findings    -->
      <!-- 3. Key Observations -->
      ${renderCover(payload, { brandSubtitle: brandSubtitle(mode) })}

      <!-- 4. Risk Check Summary -->
      ${renderRiskChecks(payload)}

      <!-- 5. Vehicle Overview -->
      ${renderVehicleOverview(payload)}

      <!-- 6. Running Costs -->
      ${renderRunningCosts(payload)}

      <!-- 7. Stolen / Theft Marker (only when the police flag is set) -->
      ${renderStolenSection(payload)}

      <!-- 8. Write-off Records + per-record Damage Area diagrams -->
      ${renderWriteoffSection(payload)}

      <!-- 9. Outstanding finance detail -->
      ${renderFinance(payload)}

      <!-- 10. Mileage Progression (graph + summary, table only on discrepancy) -->
      ${renderMileageTrend(payload)}

      <!-- 11. MOT History -->
      ${renderMotHistory(payload)}

      <!-- 12. Keeper History -->
      ${renderKeeperHistory(payload)}

      <!-- 13. Number Plate History (cherished transfer + previous VRMs) -->
      ${renderPlateHistory(payload)}

      <!-- 14. Valuation -->
      ${renderValuation(payload, { publicMode: mode === 'public' })}

          <!-- 15. Equipment List + 16. Disclaimer (rendered together inside
               the same <section>) so they share one flow context. -->
          ${renderEquipment(
            payload,
            /* html */ `
              <div class="disclaimer-strip" style="margin-top:14px;padding:14px 16px;border:1px solid #A8B2C0;border-radius:10px;background:#DDE4EC;color:#6B7280;font-size:8pt;line-height:1.45;display:inline-block;width:100%;break-inside:avoid !important;page-break-inside:avoid !important;-webkit-column-break-inside:avoid;box-sizing:border-box;">
                <div class="disclaimer-strip__title" style="font-size:9pt;font-weight:700;color:#163B5F;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid;">
                  Disclaimer &amp; Data Sources
                </div>
                <p class="disclaimer-strip__body" style="margin:0;break-inside:avoid;page-break-inside:avoid;">
                  This report is compiled from third-party data feeds (DVLA, DVSA, MIAFTR insurance loss
                  register, finance houses and trade valuation books) and is provided for informational
                  purposes only. Mileage figures originate from DVSA MOT records. Valuations and running
                  cost estimates are indicative and subject to market conditions. Every reasonable effort
                  is made to ensure accuracy, however Motovo accepts no liability for any decision made
                  on the basis of this report. Always verify VIN, mileage and condition in person before
                  purchase.
                </p>
              </div>
            `,
          )}
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

export function renderHeaderHtml(payload: ReportPayload): string {
  const vrm = payload.registration_number || payload.report_data?.registration_number || '';
  const make = payload.make || payload.report_data?.vehicle?.make || '';
  const model = payload.model || payload.report_data?.vehicle?.model || '';
  const mode = resolveReportMode(payload);
  const logoSrc = readAssetDataUrl('logo.png', 'image/png');
  const reportLabel = mode === 'public' ? 'Vehicle History Report' : 'Car Check Report';

  return `
    <div style="${HEADER_FOOTER_FONT} font-size:7.5pt; color:#111827; width:100%; padding:4mm 10mm 0; box-sizing:border-box;">
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #D1D4DC; padding-bottom:1.5mm;">
        <div style="display:flex; align-items:center; gap:6px;">
          <img src="${logoSrc}" alt="" style="width:11px; height:11px; display:block;" />
          <strong style="color:#163B5F; font-size:8pt; letter-spacing:.02em;">MOTOVO</strong>
          <span style="color:#6B7280;">${esc(reportLabel)}</span>
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
  const mode = resolveReportMode(payload);
  const confidentiality = footerConfidentiality(mode);
  return `
    <div style="${HEADER_FOOTER_FONT} font-size:7pt; color:#6B7280; width:100%; padding:1.5mm 10mm 3mm; box-sizing:border-box;">
      <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid #D1D4DC; padding-top:1.5mm;">
        <div>${esc(confidentiality)} · Generated ${esc(fmtDate(generated))}</div>
        <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      </div>
    </div>
  `;
}
