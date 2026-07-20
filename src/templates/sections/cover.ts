import { ReportPayload, ReportStatus } from '../../types/report';
import { esc, escAttr, fmtCurrency, fmtDate, fmtMileage, parseDate } from '../helpers';
import { readAssetDataUrl } from '../assets';
import { gatherObservations } from '../insights';
import { realWriteoffRecords } from './writeoff';
import { chunkItems, renderTileTable } from '../tileGrid';

type Tone = 'ok' | 'warn' | 'fail';

interface Finding {
  label: string;
  value: string;
  tone: Tone;
}

/** Returns the VIN if it looks like an actual VIN, otherwise null. */
function pickVin(payload: ReportPayload): string | null {
  const v = payload.report_data?.vehicle?.vin?.trim();
  if (!v) return null;
  // The upstream feed sometimes returns "Permission Required" / "N/A" /
  // "Unavailable" instead of an actual VIN. Treat anything that doesn't look
  // like a VIN (alnum 11-17 chars) as missing so the cover stays clean.
  if (!/^[A-HJ-NPR-Z0-9]{11,17}$/i.test(v)) return null;
  return v.toUpperCase();
}

/**
 * Categories of critical-risk marker. When ANY of these are set we always
 * render the strongest red "Critical risk — do not proceed" banner, no
 * matter what `overall_status` claims. These are deal-breakers the buyer
 * should never be able to gloss over on the way past a soft amber warning.
 */
function criticalRiskLabels(payload: ReportPayload): string[] {
  const r = payload.report_data;
  const out: string[] = [];
  if (payload.has_stolen_flag || r?.is_stolen || r?.police?.is_stolen) {
    out.push('Reported stolen on PNC');
  }
  if (r?.is_scrapped || r?.history?.is_scrapped) {
    out.push('Scrapped');
  }
  if (r?.history?.certificate_of_destruction) {
    out.push('Certificate of Destruction issued');
  }
  return out;
}

function statusBannerHtml(payload: ReportPayload, status: ReportStatus | undefined, issues: string[]): string {
  const critical = criticalRiskLabels(payload);
  if (critical.length) {
    return `
      <div class="status-banner critical">
        <span class="dot"></span>
        <div>
          <strong>Critical risk — do not proceed.</strong>
          <div class="status-banner-sub">${esc(critical.join(' · '))}</div>
        </div>
      </div>`;
  }
  if (status === 'pass' && issues.length === 0) {
    return `
      <div class="status-banner ok">
        <span class="dot"></span>
        <strong>All checks passed.</strong>&nbsp; No risk indicators were found for this vehicle.
      </div>`;
  }
  if (status === 'fail') {
    return `
      <div class="status-banner fail">
        <span class="dot"></span>
        <strong>High risk.</strong>&nbsp; ${esc(issues.join(' · ') || 'Critical issues detected — review report.')}
      </div>`;
  }
  return `
    <div class="status-banner warn">
      <span class="dot"></span>
      <strong>Warnings present.</strong>&nbsp; ${esc(
        issues.join(' · ') || 'Some checks require attention — review the report carefully.',
      )}
    </div>`;
}

/**
 * Human-readable Keeper Activity summary.
 *
 * The upstream feed sometimes returns 0 or a nullish count for vehicles where
 * the keeper history is genuinely missing (rather than "zero previous
 * keepers"). We surface that as "Keeper data unavailable" so the tile never
 * shows "0 keepers" or "1 keepers" (pluralisation bug in the older draft).
 */
function keeperSummary(count: number | null | undefined): string {
  if (count == null || count <= 0) return 'Unavailable';
  return count === 1 ? '1 keeper' : `${count} keepers`;
}

type MotStatus = { text: string; tone: Tone };
type TaxStatus = { text: string; tone: Tone };

/**
 * Resolve MOT status into one of: Valid / Expired / Not yet due /
 * No MOT data / Check required. Newer vehicles that haven't had their first
 * test yet are shown as "MOT not yet due" (they have a future `mot_due_date`
 * but no historical tests).
 */
function motStatus(payload: ReportPayload): MotStatus {
  const r = payload.report_data;
  const mot = r?.mot;
  const tests = mot?.tests || [];
  const dueRaw = r?.tax?.mot_due_date || mot?.mot_due_date;
  const dueDate = parseDate(dueRaw);
  const today = new Date();

  if (r?.tax?.mot_status === 'Valid') return { text: 'Valid', tone: 'ok' };
  if (dueDate && dueDate.getTime() >= today.getTime()) {
    if (tests.length === 0) return { text: 'MOT not yet due', tone: 'ok' };
    return { text: 'Valid', tone: 'ok' };
  }
  if (dueDate && dueDate.getTime() < today.getTime()) {
    return { text: 'Expired', tone: 'fail' };
  }
  if (!tests.length && !dueDate) return { text: 'No MOT data', tone: 'warn' };
  return { text: 'Check required', tone: 'warn' };
}

/** Resolve Tax status into one of: Taxed / Untaxed / SORN / Unknown. */
function taxStatus(payload: ReportPayload): TaxStatus {
  const tax = payload.report_data?.tax;
  // SORN can appear in a free-form `status` field on some feeds — check it
  // defensively even though the typed TaxInfo doesn't declare it.
  const raw = (tax as { status?: unknown } | undefined)?.status;
  const rawStatus = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (rawStatus.includes('sorn')) return { text: 'SORN', tone: 'warn' };
  if (tax?.is_valid === true) return { text: 'Taxed', tone: 'ok' };
  if (tax?.is_valid === false) return { text: 'Untaxed', tone: 'fail' };
  return { text: 'Unknown', tone: 'warn' };
}

/**
 * Top-level summary cards: Stolen / Finance / Write-off / MOT / Tax / Keepers / Valuation.
 */
function findings(payload: ReportPayload): Finding[] {
  const r = payload.report_data;
  // Filter to REAL insurance write-offs so stolen-only records don't count.
  const writeoffCount = realWriteoffRecords(r?.writeoff?.records).length;
  const financeRecords = r?.finance?.records?.length ?? 0;
  const financeMarker = !!(payload.has_finance_flag || r?.has_finance);
  const financeCount = financeRecords || (financeMarker ? 1 : 0);
  const keepers = r?.history?.keeper_changes?.length ?? 0;
  const valuation = r?.valuation?.suggested_sale_price;

  const mot = motStatus(payload);
  const tax = taxStatus(payload);

  return [
    {
      label: 'Stolen Check',
      value: r?.is_stolen ? 'Reported' : 'Clear',
      tone: r?.is_stolen ? 'fail' : 'ok',
    },
    {
      label: 'Finance',
      value: financeRecords > 0
        ? `${financeRecords} active`
        : financeMarker
          ? 'Marker set'
          : 'Clear',
      tone: financeCount > 0 ? 'fail' : 'ok',
    },
    {
      label: 'Write-off',
      value: writeoffCount > 0 ? `${writeoffCount} record${writeoffCount === 1 ? '' : 's'}` : 'Clear',
      tone: writeoffCount > 0 ? 'fail' : 'ok',
    },
    {
      label: 'MOT Status',
      value: mot.text,
      tone: mot.tone,
    },
    {
      label: 'Tax Status',
      value: tax.text,
      tone: tax.tone,
    },
    {
      label: 'Keeper Activity',
      value: keeperSummary(keepers),
      tone: payload.has_high_keeper_turnover ? 'warn' : (keepers > 0 ? 'ok' : 'warn'),
    },
    {
      label: 'Valuation',
      value: valuation != null ? fmtCurrency(valuation) : '—',
      tone: 'ok',
    },
  ];
}

function vehicleImageHtml(payload: ReportPayload, vrm: string, year: number | string, make: string, model: string): string {
  const src = payload.image_url || payload.report_data?.images?.primary;

  // Only render the vehicle photo when we have a fully-resolved data URL.
  // The imageResolver replaces the remote URL with a base64 data URL on
  // successful fetch and CLEARS the field when the image is missing or looks
  // like a UKVD placeholder. Per the client brief: "if no image is returned,
  // just don't show a picture" — never a placeholder card.
  //
  // No image → omit the block entirely and do NOT force a page break.
  // An empty section--page-break here was leaving page 1 half blank and
  // pushing Risk Checks to page 2 even when there was room to continue.
  if (!src || !src.startsWith('data:')) {
    return '';
  }

  const label = `${year} ${make} ${model}`.trim();

  return `<!-- Vehicle photo is intentionally pushed to page 2 (section--page-break)
             so the cover, Key Findings and Key Observations on page 1 read as a
             single composed summary spread. The photo then sits as a clean
             header on page 2 above the Risk Checks Summary. -->
          <section class="section section--page-break">
            <div class="vehicle-image-block" data-vrm="${escAttr(vrm)}">
              <img src="${escAttr(src)}" alt="${escAttr(`${label} stock photo`)}" />
            </div>
          </section>`;
}

function observationsHtml(payload: ReportPayload): string {
  const items = gatherObservations(payload);
  return `
    <div class="observations">
      ${items
        .map(
          (o) => `
        <div class="observation ${o.tone}">
          <span class="dot"></span>
          <span>${esc(o.text)}</span>
        </div>`,
        )
        .join('')}
    </div>
  `;
}

interface CoverOptions {
  /** Subtitle rendered under the MOTOVO wordmark (dealer vs public wording). */
  brandSubtitle?: string;
}

export function renderCover(payload: ReportPayload, opts: CoverOptions = {}): string {
  const v = payload.report_data?.vehicle || {};
  const vrm = payload.registration_number || payload.report_data?.registration_number || v.vrm || '';
  const make = payload.make || v.make || '';
  const model = payload.model || v.model || payload.derivative || '';
  const derivative = payload.derivative || v.derivative || '';
  const year = payload.year || v.year || '';
  const status = payload.overall_status || payload.report_data?.overall_status;
  const generated = payload.generated_at || payload.created_date;
  const brandSubtitle = opts.brandSubtitle || 'Dealer Vehicle History Report';

  const issues: string[] = [];
  if (payload.has_writeoff_flag) issues.push('Insurance write-off recorded');
  if (payload.has_stolen_flag) issues.push('Reported stolen');
  if (payload.has_finance_flag) issues.push('Outstanding finance');
  if (payload.has_high_keeper_turnover) issues.push('High keeper turnover');

  const findingGridHtml = renderTileTable(
    chunkItems(findings(payload), 4).map((row) =>
      row.map(
        (f) => `
        <div class="finding ${f.tone}">
          <div class="label">${esc(f.label)}</div>
          <div class="value">${esc(f.value)}</div>
        </div>`,
      ),
    ),
    {
      tableClass: 'findings-table',
      rowClass: 'findings-table-row',
      cellClass: 'findings-cell',
      columns: 4,
      wrapperClass: 'findings-grid-block',
    },
  );

  const logoSrc = readAssetDataUrl('logo.png', 'image/png');

  return `
    <section class="cover">
      <div class="cover-bar">
        <div class="brand">
          <img class="brand-logo" src="${escAttr(logoSrc)}" alt="Motovo logo" />
          <div class="brand-text">
            <div class="brand-name">MOTOVO</div>
            <div class="brand-sub">${esc(brandSubtitle)}</div>
          </div>
        </div>
        <div class="plate-wrap">
          <div class="plate-label">REGISTRATION</div>
          <span class="plate">${esc(vrm)}</span>
          ${(() => {
            const vin = pickVin(payload);
            return vin
              ? `<div class="vin-row"><span class="vin-label">VIN</span><span class="vin-value mono">${esc(vin)}</span></div>`
              : '';
          })()}
        </div>
      </div>

      <div class="cover-title">
        <div>
          <h1>${esc(year)} ${esc(make)} ${esc(model)}</h1>
          <div class="sub">${esc(derivative || '')}</div>
          <div class="meta">
            Report ID: <strong>${esc(payload.id || '—')}</strong> &nbsp;·&nbsp;
            Generated <strong>${esc(fmtDate(generated))}</strong>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="label">Mileage</div>
            <div class="value${payload.latest_mileage == null ? ' unavailable' : ''}">${
              payload.latest_mileage == null
                ? 'Unavailable'
                : esc(fmtMileage(payload.latest_mileage))
            }</div>
          </div>
          <div class="hero-stat"><div class="label">Fuel</div><div class="value">${esc(v.fuel_type || '—')}</div></div>
          <div class="hero-stat"><div class="label">Gearbox</div><div class="value">${esc(v.transmission || '—')}</div></div>
          <div class="hero-stat"><div class="label">Colour</div><div class="value">${esc(v.colour || '—')}</div></div>
        </div>
      </div>
    </section>

    ${statusBannerHtml(payload, status, issues)}

    <section class="section">
      <div class="section-title"><span class="icon">★</span> Key Findings</div>
      ${findingGridHtml}
    </section>

    <!-- Key Observations: this list can be long (MOT insights are added on top
         of the risk story), so we deliberately omit no-break here and let it
         flow across pages. The section title is sticky (break-after:avoid)
         and each observation row is itself break-inside:avoid. -->
    <section class="section">
      <div class="section-title"><span class="icon">i</span> Key Observations</div>
      ${observationsHtml(payload)}
    </section>

    ${vehicleImageHtml(payload, vrm, year, make, model)}
  `;
}
