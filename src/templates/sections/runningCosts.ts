/**
 * Running Costs section (matches the online Motovo report block).
 *
 * Fields shown:
 *   - Annual road tax
 *   - 6-month road tax (estimate)
 *   - Fuel economy (combined MPG)
 *   - Estimated fuel cost per mile
 *   - CO₂ emissions
 *   - Euro standard
 *
 * VED estimation:
 *   The upstream payload sometimes carries pre-computed `tax.ved_12m`/`ved_6m`.
 *   When those are null we fall back to a CO₂-based lookup approximating the
 *   DVLA V149 (2025/26) banded rates for vehicles first registered between
 *   2001 and 2017 (which covers the typical second-hand stock).
 *   - Vehicles registered after 1 April 2017 use a flat post-first-year rate,
 *     not banded — we surface a generic "Standard rate (post-2017)" estimate.
 *   - First-year/showroom rates are out of scope (PDF is for used cars).
 *
 * Fuel cost per mile is derived from `combined_mpg` and a national average
 * pump price (configurable via FUEL_PRICE_GBP_PER_LITRE).
 */

import { ReportPayload } from '../../types/report';
import { DASH, esc, fmtCurrency, fmtDate, fmtNumber, parseDate } from '../helpers';

const FUEL_PRICE_GBP_PER_LITRE = 1.55; // updated April 2026 — matches the online view note
const LITRES_PER_UK_GALLON = 4.546;
const SIX_MONTH_TO_TWELVE_MONTH_RATIO = 0.55; // DVLA charges 5–10% premium for the 6-month payment

interface RunningCostFields {
  annualTax: number | null;
  annualTaxSource: 'data' | 'v149' | 'flat' | 'unknown';
  sixMonthTax: number | null;
  combinedMpg: number | null;
  costPerMile: number | null;
  co2: number | null;
  euroStatus: string | null;
}

/**
 * Approximate "old VED" (CO₂-banded, registered between 2001 and 2017) at the
 * standard rate from V149 (April 2025/26). Petrol/diesel "TC49" rates.
 */
function vedFromCo2(co2: number): number {
  if (co2 <= 100) return 20;
  if (co2 <= 110) return 35;
  if (co2 <= 120) return 50;
  if (co2 <= 130) return 165;
  if (co2 <= 140) return 195;
  if (co2 <= 150) return 215;
  if (co2 <= 165) return 255;
  if (co2 <= 175) return 305;
  if (co2 <= 185) return 335;
  if (co2 <= 200) return 385;
  if (co2 <= 225) return 415;
  if (co2 <= 255) return 450;
  return 735;
}

/** Standard rate for cars first registered on or after 1 April 2017. */
const POST_2017_STANDARD_RATE = 190;

function pickAnnualVed(payload: ReportPayload): { value: number | null; source: RunningCostFields['annualTaxSource'] } {
  const tax = payload.report_data?.tax;
  if (typeof tax?.ved_12m === 'number') return { value: tax.ved_12m, source: 'data' };
  if (typeof tax?.ved_rate === 'number') return { value: tax.ved_rate, source: 'data' };

  const co2 = payload.report_data?.vehicle?.co2 ?? tax?.co2 ?? null;
  const firstRegStr = payload.report_data?.vehicle?.first_registration;
  const firstReg = parseDate(firstRegStr);

  // Post-1 April 2017 vehicles use the flat "standard rate"
  if (firstReg && firstReg.getTime() >= Date.UTC(2017, 3, 1)) {
    return { value: POST_2017_STANDARD_RATE, source: 'flat' };
  }

  if (typeof co2 === 'number' && co2 > 0) {
    return { value: vedFromCo2(co2), source: 'v149' };
  }
  return { value: null, source: 'unknown' };
}

function pickSixMonthVed(payload: ReportPayload, annual: number | null): number | null {
  const ved6 = payload.report_data?.tax?.ved_6m;
  if (typeof ved6 === 'number') return ved6;
  if (annual == null) return null;
  return Math.round(annual * SIX_MONTH_TO_TWELVE_MONTH_RATIO);
}

function pickCostPerMile(mpg: number | null): number | null {
  if (mpg == null || mpg <= 0) return null;
  return (FUEL_PRICE_GBP_PER_LITRE * LITRES_PER_UK_GALLON) / mpg;
}

function gatherFields(payload: ReportPayload): RunningCostFields {
  const v = payload.report_data?.vehicle || {};
  const annual = pickAnnualVed(payload);
  const mpg = typeof v.combined_mpg === 'number' ? v.combined_mpg : null;

  return {
    annualTax: annual.value,
    annualTaxSource: annual.source,
    sixMonthTax: pickSixMonthVed(payload, annual.value),
    combinedMpg: mpg,
    costPerMile: pickCostPerMile(mpg),
    co2: typeof v.co2 === 'number' ? v.co2 : payload.report_data?.tax?.co2 ?? null,
    euroStatus: v.euro_status || null,
  };
}

function fmtPenceFromGbp(value: number | null): string {
  if (value == null) return DASH;
  return `${(value * 100).toFixed(1)}p`;
}

function annualTaxNote(source: RunningCostFields['annualTaxSource']): string {
  switch (source) {
    case 'data': return 'From DVLA';
    case 'v149': return 'Calculated (V149)';
    case 'flat': return 'Standard rate (post-2017)';
    default:     return 'Insufficient data';
  }
}

export function renderRunningCosts(payload: ReportPayload): string {
  const f = gatherFields(payload);
  const taxDueDate = payload.report_data?.tax?.tax_due_date || null;
  const taxValid = payload.report_data?.tax?.is_valid === true;

  // If we genuinely have nothing useful, skip the section so we don't waste a
  // page with six "—" values.
  if (
    f.annualTax == null &&
    f.combinedMpg == null &&
    f.co2 == null &&
    !f.euroStatus
  ) {
    return '';
  }

  const tile = (label: string, value: string, foot?: string, featured = false) => `
    <div class="cost ${featured ? 'feature' : ''}">
      <div class="label">${esc(label)}</div>
      <div class="value">${value}</div>
      ${foot ? `<div class="foot">${esc(foot)}</div>` : ''}
    </div>`;

  // Surface the tax expiry / validity directly on the Annual road tax tile so
  // dealers have a single place to look — replaces the old Tax & Compliance
  // duplicate section.
  const taxFootParts: string[] = [annualTaxNote(f.annualTaxSource)];
  if (taxValid)        taxFootParts.push('Currently taxed');
  else if (taxDueDate) taxFootParts.push('Currently UNTAXED');
  if (taxDueDate)      taxFootParts.push(`Next due ${fmtDate(taxDueDate)}`);
  const taxFoot = taxFootParts.join(' · ');

  return /* html */ `
    <section class="section no-break">
      <div class="section-title"><span class="icon">£</span> Running Costs</div>
      <div class="cost-grid">
        ${tile(
          'Annual road tax',
          f.annualTax != null ? fmtCurrency(f.annualTax) + '/yr' : DASH,
          taxFoot,
          true,
        )}
        ${tile(
          '6-month road tax',
          f.sixMonthTax != null ? fmtCurrency(f.sixMonthTax) + ' est.' : DASH,
          f.annualTax != null ? 'Approx. 55% of annual' : '—',
        )}
        ${tile(
          'Fuel economy',
          f.combinedMpg != null ? `${fmtNumber(f.combinedMpg, { decimals: 1 })} mpg` : DASH,
          'Combined (manufacturer)',
        )}
        ${tile(
          'Est. fuel cost per mile',
          fmtPenceFromGbp(f.costPerMile),
          `Based on £${FUEL_PRICE_GBP_PER_LITRE.toFixed(2)}/L avg`,
        )}
        ${tile(
          'CO₂ emissions',
          f.co2 != null ? `${fmtNumber(f.co2)} g/km` : DASH,
          'WLTP / NEDC combined',
        )}
        ${tile(
          'Euro standard',
          f.euroStatus || DASH,
          'Engine emissions class',
        )}
      </div>
      <p class="small text-muted mt-2">
        Road tax estimates use DVLA V149 rates. Fuel cost estimates use UK average pump prices and
        are indicative only — actual costs depend on driving style and conditions.
      </p>
    </section>
  `;
}
