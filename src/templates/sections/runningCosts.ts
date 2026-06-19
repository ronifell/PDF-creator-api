/**
 * Running Costs section.
 *
 * Road tax is calculated using the exact same logic as the online Motovo view
 * (see /lib/roadTax in the web app), so the PDF and the website never
 * disagree on the figure shown to the dealer.
 *
 * Priority for the annual VED (`getAnnualTax`):
 *   1. Stored VDG `ved_12m` (authoritative when the feed already worked it
 *      out for us)
 *   2. Structured `ved_rate` object with `standard_twelve_months` /
 *      `premium_twelve_months` (used by newer VDG payloads)
 *   3. Legacy scalar `ved_rate` (older payloads)
 *   4. DVLA V149 (April 2026) calculation based on first-registration date,
 *      CO₂ band and fuel type
 *   5. null when there's not enough data to be sure
 *
 * Two VED systems live in V149 April 2026:
 *
 *   POST-APRIL 2017
 *     Petrol/diesel/alt fuel registered on or after 1 April 2017 → flat £200/yr
 *     standard rate (the £640 expensive-car supplement is a list-price lookup
 *     we don't model here).
 *     Zero-emission registered on or after 1 April 2025 → £200/yr.
 *     Zero-emission registered 1 April 2017 – 31 March 2025 → £0 (free).
 *
 *   PRE-APRIL 2017, POST-MARCH 2001 (registered 1 Mar 2001 – 31 Mar 2017)
 *     CO₂ band table (V149 April 2026):
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
 *     Zero-emission in this era = Band A = £20.
 *
 *   PRE-MARCH 2001
 *     Taxed by engine CC — no reliable data, so we return null and hide.
 *
 * 6-month tax uses the stored VDG figure when present, otherwise 55% of the
 * annual rate (the DVLA charges a small premium for paying half-yearly).
 *
 * Fuel cost per mile uses pence-per-litre arithmetic matching the online
 * view: 150p/L for petrol, 155p/L for diesel, none for electric.
 */

import { ReportPayload, VedRateObject } from '../../types/report';
import { DASH, esc, fmtDate, fmtNumber, parseDate } from '../helpers';

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
  if (c <= 200) return 410;  // Band J  ← 186-200
  if (c <= 225) return 445;  // Band K
  if (c <= 255) return 760;  // Band L
  return 790;                // Band M (256+)
}

const POST_2017_STANDARD = 200;
const ZERO_EMISSION_PHASE_IN = Date.UTC(2025, 3, 1); // 1 April 2025
const POST_2017_BOUNDARY      = Date.UTC(2017, 3, 1); // 1 April 2017
const POST_2001_BOUNDARY      = Date.UTC(2001, 2, 1); // 1 March 2001

function isVedRateObject(value: unknown): value is VedRateObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

type TaxSource = 'stored' | 'calculated' | 'unknown';

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
  const fuel = (v.fuel_type || '').toLowerCase();
  const isElectric = fuel === 'electric';
  const co2 = typeof v.co2 === 'number' ? v.co2 : (typeof tax?.co2 === 'number' ? tax.co2 : null);

  // Pre-March 2001: engine-CC system, no reliable data
  if (reg && reg.getTime() < POST_2001_BOUNDARY) return { value: null, source: 'unknown' };

  // Post-April 2017: flat standard rate
  if (reg && reg.getTime() >= POST_2017_BOUNDARY) {
    if (isElectric) {
      return reg.getTime() >= ZERO_EMISSION_PHASE_IN
        ? { value: POST_2017_STANDARD, source: 'calculated' }
        : { value: 0, source: 'calculated' };
    }
    return { value: POST_2017_STANDARD, source: 'calculated' };
  }

  // 2001–2017 banded by CO₂
  if (isElectric) return { value: 20, source: 'calculated' };
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

function fuelPricePerLitre(fuel: string | undefined): number {
  const f = (fuel || '').toLowerCase();
  return f === 'diesel' ? DIESEL_PPL : PETROL_PPL; // pence
}

function pickCostPerMilePence(mpg: number | null, fuel: string | undefined): number | null {
  const f = (fuel || '').toLowerCase();
  if (f === 'electric') return null;
  if (mpg == null || mpg <= 0) return null;
  const ppl = fuelPricePerLitre(fuel);
  return (ppl * LITRES_PER_UK_GALLON) / mpg; // pence per mile
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

export function renderRunningCosts(payload: ReportPayload): string {
  const v = payload.report_data?.vehicle || {};
  const taxBlock = payload.report_data?.tax;
  const annual = pickAnnualTax(payload);
  const six = pickSixMonthTax(payload, annual.value);
  const mpg = typeof v.combined_mpg === 'number' ? v.combined_mpg : null;
  const co2 = typeof v.co2 === 'number' ? v.co2 : (typeof taxBlock?.co2 === 'number' ? taxBlock.co2 : null);
  const euro = v.euro_status || null;
  const fuel = v.fuel_type || null;
  const costPerMile = pickCostPerMilePence(mpg, fuel || undefined);

  // If we have literally nothing useful, hide the section so we don't waste
  // a page with five "—" tiles.
  if (annual.value == null && mpg == null && co2 == null && !euro) return '';

  // ── Annual road tax tile foot text ─────────────────────────────────────────
  const taxFootParts: string[] = [];
  taxFootParts.push(annual.source === 'stored' ? 'From VDG data' : 'Calculated (V149)');
  if (taxBlock?.is_valid === true)         taxFootParts.push('Currently taxed');
  else if (taxBlock?.is_valid === false)   taxFootParts.push('Currently UNTAXED');
  if (taxBlock?.tax_due_date)              taxFootParts.push(`Next due ${fmtDate(taxBlock.tax_due_date)}`);
  const taxFoot = taxFootParts.join(' · ');

  const sixFoot = six.source === 'stored' ? 'From VDG data' : 'Approx. 55% of annual';

  const fuelLabel = fuel ? (fuel.toLowerCase() === 'diesel' ? '£1.55' : '£1.50') : '£1.50';
  const costFoot = fuel ? `Based on ${fuelLabel}/L avg` : 'UK average pump price';

  const tile = (label: string, value: string, foot?: string, featured = false) => `
    <div class="cost ${featured ? 'feature' : ''}">
      <div class="label">${esc(label)}</div>
      <div class="value">${value}</div>
      ${foot ? `<div class="foot">${esc(foot)}</div>` : ''}
    </div>`;

  return /* html */ `
    <section class="section">
      <div class="section-lead">
        <div class="section-title"><span class="icon">£</span> Running Costs</div>
      </div>
      <div class="cost-grid">
        ${tile(
          'Annual road tax',
          fmtTaxValue(annual.value),
          taxFoot,
          true,
        )}
        ${tile(
          '6-month road tax',
          fmtSixMonthValue(six.value, six.source),
          annual.value != null ? sixFoot : DASH,
        )}
        ${tile(
          'Fuel economy',
          mpg != null ? `${fmtNumber(mpg, { decimals: 1 })} mpg` : DASH,
          'Combined (manufacturer)',
        )}
        ${tile(
          'Est. fuel cost per mile',
          costPerMile != null ? `${costPerMile.toFixed(1)}p` : DASH,
          costPerMile != null ? costFoot : 'Electric vehicles not estimated',
        )}
        ${tile(
          'CO₂ emissions',
          co2 != null ? `${fmtNumber(co2)} g/km` : DASH,
          'WLTP / NEDC combined',
        )}
        ${tile(
          'Euro standard',
          euro || DASH,
          'Engine emissions class',
        )}
      </div>
      <p class="small text-muted mt-2">
        Road tax calculated using DVLA V149 April 2026 rates. Fuel cost estimates based on UK
        average pump prices and are indicative only — actual costs depend on driving style and
        conditions.
      </p>
    </section>
  `;
}
