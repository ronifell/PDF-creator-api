/**
 * Running Costs section.
 *
 * Road tax logic mirrors the online Motovo view (see /lib/roadTax in the web
 * app) so PDF and website agree on the figure.
 *
 * Priority for the annual VED:
 *   1. Stored VDG `ved_12m`
 *   2. Structured `ved_rate` object (`standard_twelve_months` /
 *      `premium_twelve_months`)
 *   3. Legacy scalar `ved_rate`
 *   4. DVLA V149 (April 2026) calculation based on first-registration date,
 *      CO₂ band and fuel type
 *   5. null when there is not enough data
 *
 * V149 April 2026 systems modelled here:
 *
 *   POST-APRIL 2017
 *     Petrol / diesel / alt fuel / MILD or FULL HYBRID → £200/yr standard.
 *     Zero-emission is NO LONGER exempt as of 1 April 2025 — it now also
 *     pays the standard £200/yr rate. Pre-April-2025 zero-emission cars
 *     joined the standard rate on 1 April 2025 (they used to be free).
 *     Expensive-car supplement (>£40k list price) not modelled here.
 *
 *   PRE-APRIL 2017, POST-MARCH 2001 (registered 1 Mar 2001 – 31 Mar 2017)
 *     CO₂ band table (V149):
 *       A: 0–100    £20
 *       B: 101–110  £20
 *       C: 111–120  £35
 *       D: 121–130  £170
 *       E: 131–140  £200
 *       F: 141–150  £225
 *       G: 151–165  £275
 *       H: 166–175  £325
 *       I: 176–185  £360
 *       J: 186–200  £410
 *       K: 201–225  £445
 *       L: 226–255  £760
 *       M: 256+     £790
 *     Zero-emission in this era → Band B £20 (from 1 April 2025).
 *
 *   PRE-MARCH 2001
 *     Taxed by engine CC — no reliable data, so we return null and hide.
 *
 * EV fuel cost per mile: intentionally hidden. Petrol/diesel use published
 * UK pump-price arithmetic; without a proper pence-per-kWh + kWh-per-mile
 * calculation for EVs we do not display a stand-in figure.
 */

import { ReportPayload, VedRateObject } from '../../types/report';
import { DASH, esc, fmtDate, fmtNumber, parseDate } from '../helpers';
import { chunkItems, renderTileTable } from '../tileGrid';

const PETROL_PPL = 150; // pence per litre
const DIESEL_PPL = 155;
const LITRES_PER_UK_GALLON = 4.546;
const SIX_MONTH_RATIO = 0.55;

// ─── V149 April 2026 CO₂ band table (1 March 2001 – 31 March 2017) ────────────
function legacyBandRate(co2: number): number {
  const c = Math.round(co2);
  if (c <= 100) return 20;   // Band A
  if (c <= 110) return 20;   // Band B
  if (c <= 120) return 35;   // Band C
  if (c <= 130) return 170;  // Band D
  if (c <= 140) return 200;  // Band E
  if (c <= 150) return 225;  // Band F
  if (c <= 165) return 275;  // Band G
  if (c <= 175) return 325;  // Band H
  if (c <= 185) return 360;  // Band I
  if (c <= 200) return 410;  // Band J
  if (c <= 225) return 445;  // Band K
  if (c <= 255) return 760;  // Band L
  return 790;                // Band M
}

const POST_2017_STANDARD = 200;
const POST_2017_BOUNDARY = Date.UTC(2017, 3, 1); // 1 April 2017
const POST_2001_BOUNDARY = Date.UTC(2001, 2, 1); // 1 March 2001

function isVedRateObject(value: unknown): value is VedRateObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

type TaxSource = 'stored' | 'calculated' | 'unknown';

/** Broad fuel-type classification used by both tax and fuel-cost logic. */
type FuelCategory = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'other';

/**
 * Classify the vehicle's fuel type into one of a small set of categories.
 * Hybrids are treated as their combustion fuel for tax purposes (the
 * "Alternative Fuel Vehicle" £10 discount is not modelled) and get their
 * own bucket for fuel-cost display wording.
 */
export function classifyFuel(fuel: string | null | undefined): FuelCategory {
  const f = (fuel || '').toLowerCase().trim();
  if (!f) return 'other';
  // Match on word boundaries so "petrol mhev" registers as hybrid and doesn't
  // accidentally collide with substrings like "electric" inside a longer
  // vehicle description string.
  if (f.includes('hybrid') || /\b(mhev|phev|hev)\b/.test(f)) return 'hybrid';
  if (/\b(electric|ev|bev)\b/.test(f) || f.includes('electric')) return 'electric';
  if (f.includes('diesel')) return 'diesel';
  if (f.includes('petrol') || f.includes('gasoline') || f.includes('unleaded')) return 'petrol';
  return 'other';
}

function pickAnnualTax(payload: ReportPayload): { value: number | null; source: TaxSource } {
  const tax = payload.report_data?.tax;

  // (1) Direct stored 12-month figure
  if (typeof tax?.ved_12m === 'number') return { value: tax.ved_12m, source: 'stored' };

  // (2) Structured VDG ved_rate
  const rate = tax?.ved_rate;
  if (isVedRateObject(rate)) {
    const std = rate.standard_twelve_months;
    const prem = rate.premium_twelve_months;
    if (rate.is_premium_vehicle === true && typeof prem === 'number') {
      return { value: prem, source: 'stored' };
    }
    if (typeof std === 'number') return { value: std, source: 'stored' };
  }

  // (3) Legacy scalar ved_rate
  if (typeof rate === 'number') return { value: rate, source: 'stored' };

  // (4) DVLA V149 calculation
  const v = payload.report_data?.vehicle || {};
  const reg = parseDate(v.first_registration || null);
  const category = classifyFuel(v.fuel_type);
  const co2 = typeof v.co2 === 'number' ? v.co2 : (typeof tax?.co2 === 'number' ? tax.co2 : null);

  // Pre-March 2001: engine-CC system, no reliable data
  if (reg && reg.getTime() < POST_2001_BOUNDARY) return { value: null, source: 'unknown' };

  // Post-April 2017: flat standard rate. As of 1 April 2025 electric vehicles
  // are no longer exempt so they pay the same standard rate as everything
  // else registered in this window.
  if (reg && reg.getTime() >= POST_2017_BOUNDARY) {
    return { value: POST_2017_STANDARD, source: 'calculated' };
  }

  // 2001–2017 banded by CO₂
  if (category === 'electric') return { value: 20, source: 'calculated' }; // Band B post-Apr-2025
  if (typeof co2 === 'number' && co2 >= 0) {
    return { value: legacyBandRate(co2), source: 'calculated' };
  }
  return { value: null, source: 'unknown' };
}

function pickSixMonthTax(payload: ReportPayload, annual: number | null): {
  value: number | null;
  source: TaxSource;
} {
  const ved6 = payload.report_data?.tax?.ved_6m;
  if (typeof ved6 === 'number') return { value: ved6, source: 'stored' };
  if (annual == null) return { value: null, source: 'unknown' };
  if (annual === 0) return { value: 0, source: 'calculated' };
  return { value: Math.round(annual * SIX_MONTH_RATIO), source: 'calculated' };
}

function fuelPricePerLitre(category: FuelCategory): number {
  return category === 'diesel' ? DIESEL_PPL : PETROL_PPL;
}

function pickCostPerMilePence(mpg: number | null, category: FuelCategory): number | null {
  if (category === 'electric') return null;
  if (mpg == null || mpg <= 0) return null;
  const ppl = fuelPricePerLitre(category);
  return (ppl * LITRES_PER_UK_GALLON) / mpg;
}

function fmtTaxValue(annual: number | null): string {
  if (annual == null) return DASH;
  if (annual === 0) return 'Free (£0)';
  return `£${annual.toLocaleString('en-GB')}/yr`;
}

function fmtSixMonthValue(six: number | null, source: TaxSource): string {
  if (six == null) return DASH;
  if (six === 0) return 'Free (£0)';
  const formatted = `£${six.toLocaleString('en-GB')}`;
  return source === 'stored' ? formatted : `${formatted} est.`;
}

/**
 * Render the free-form "foot" text under the Annual Road Tax tile.
 *
 * The previous version always said "Next due DD MMM YYYY" — including for
 * dates that had already passed. That's misleading: a past date isn't a
 * "next" due date, it's an expired one. This rewrite distinguishes:
 *
 *   • Tax currently valid → "Next due DD MMM YYYY"
 *   • Tax not valid and date is in the past → "Tax expired DD MMM YYYY"
 *   • Tax not valid and no date supplied → "Currently UNTAXED"
 *   • Tax not valid and future date supplied → "Last tax due DD MMM YYYY"
 *     (interpreted as the last known due date on record)
 */
function buildTaxFoot(payload: ReportPayload, source: TaxSource): string {
  const taxBlock = payload.report_data?.tax;
  const parts: string[] = [];
  parts.push(source === 'stored' ? 'From VDG data' : 'Calculated (V149)');

  const isValid = taxBlock?.is_valid;
  const dueRaw = taxBlock?.tax_due_date || null;
  const dueDate = parseDate(dueRaw);
  const now = new Date();
  const dueIsPast = dueDate ? dueDate.getTime() < now.getTime() : false;

  if (isValid === true) {
    parts.push('Currently taxed');
    if (dueRaw) parts.push(`Next due ${fmtDate(dueRaw)}`);
  } else if (isValid === false) {
    parts.push('Currently UNTAXED');
    if (dueRaw && dueIsPast) {
      parts.push(`Tax expired ${fmtDate(dueRaw)}`);
    } else if (dueRaw) {
      parts.push(`Last tax due ${fmtDate(dueRaw)}`);
    }
  } else if (dueRaw) {
    // Unknown validity but we do have a date — describe it neutrally.
    parts.push(dueIsPast ? `Last tax due ${fmtDate(dueRaw)}` : `Next due ${fmtDate(dueRaw)}`);
  }
  return parts.join(' · ');
}

export function renderRunningCosts(payload: ReportPayload): string {
  const v = payload.report_data?.vehicle || {};
  const taxBlock = payload.report_data?.tax;
  const annual = pickAnnualTax(payload);
  const six = pickSixMonthTax(payload, annual.value);
  const mpg = typeof v.combined_mpg === 'number' ? v.combined_mpg : null;
  const co2 = typeof v.co2 === 'number' ? v.co2 : (typeof taxBlock?.co2 === 'number' ? taxBlock.co2 : null);
  const euro = v.euro_status || null;
  const category = classifyFuel(v.fuel_type);
  const costPerMile = pickCostPerMilePence(mpg, category);

  // If we have literally nothing useful, hide the section so we don't waste
  // a page with empty tiles.
  if (annual.value == null && mpg == null && co2 == null && !euro) return '';

  const taxFoot = buildTaxFoot(payload, annual.source);
  const sixFoot = six.source === 'stored' ? 'From VDG data' : 'Approx. 55% of annual';

  const fuelLabel = category === 'diesel' ? '£1.55' : category === 'petrol' || category === 'hybrid' ? '£1.50' : '';
  const costFoot = fuelLabel ? `Based on ${fuelLabel}/L avg` : 'UK average pump price';

  const tile = (label: string, value: string, foot?: string, featured = false) => `
    <div class="cost ${featured ? 'feature' : ''}">
      <div class="label">${esc(label)}</div>
      <div class="value">${value}</div>
      ${foot ? `<div class="foot">${esc(foot)}</div>` : ''}
    </div>`;

  // Fuel-cost-per-mile: hidden for pure EVs, replaced with a "not applicable"
  // tile whose value doesn't look like missing data.
  const fuelCostTile = category === 'electric'
    ? tile(
        'Est. fuel cost per mile',
        'N/A',
        'Not calculated for EV — electricity pricing varies by tariff',
      )
    : tile(
        'Est. fuel cost per mile',
        costPerMile != null ? `${costPerMile.toFixed(1)}p` : DASH,
        costPerMile != null ? costFoot : 'Fuel economy not supplied',
      );

  const fuelEconomyTile = category === 'electric'
    ? tile('Efficiency', mpg != null ? `${fmtNumber(mpg, { decimals: 1 })} mpg-e` : DASH, 'Manufacturer figure')
    : tile('Fuel economy', mpg != null ? `${fmtNumber(mpg, { decimals: 1 })} mpg` : DASH, 'Combined (manufacturer)');

  const costTiles = [
    tile('Annual road tax', fmtTaxValue(annual.value), taxFoot, true),
    tile('6-month road tax', fmtSixMonthValue(six.value, six.source), annual.value != null ? sixFoot : DASH),
    fuelEconomyTile,
    fuelCostTile,
    tile('CO₂ emissions', co2 != null ? `${fmtNumber(co2)} g/km` : DASH, 'WLTP / NEDC combined'),
    tile('Euro standard', euro || DASH, 'Engine emissions class'),
  ];

  const costGridHtml = renderTileTable(
    chunkItems(costTiles, 3).map((row) => row),
    {
      tableClass: 'cost-table',
      rowClass: 'cost-table-row',
      cellClass: 'cost-cell',
      columns: 3,
      wrapperClass: 'cost-grid-block',
    },
  );

  return /* html */ `
    <section class="section">
      <div class="section-lead">
        <div class="section-title"><span class="icon">£</span> Running Costs</div>
      </div>
      ${costGridHtml}
      <p class="small text-muted mt-2">
        Road tax calculated using DVLA V149 April 2026 rates. As of 1 April 2025, zero-emission
        vehicles are no longer exempt and pay the standard rate. Fuel cost estimates are based
        on UK average pump prices and are indicative only — actual costs depend on driving
        style and conditions.
      </p>
    </section>
  `;
}
