import { ReportPayload, ReportStatus, VehicleInfo } from '../../types/report';
import { esc, escAttr, fmtCurrency, fmtDate, fmtMileage, latestRegistration, parseDate } from '../helpers';
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

/** Resolved vehicle photo for the cover banner, or null when missing. */
function resolvedVehicleImage(payload: ReportPayload): string | null {
  const src = payload.image_url || payload.report_data?.images?.primary;
  // Only use a fully-resolved data URL. The imageResolver replaces remote
  // URLs with base64 on success and CLEARS the field for missing/placeholder
  // images. No image → blank banner slot (never a silhouette card).
  if (!src || !src.startsWith('data:')) return null;
  return src;
}

/** Format a UK VRM for display (e.g. NU68XAA → NU68 XAA). */
function formatVrmDisplay(vrm: string): string {
  const clean = vrm.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  if (/^[A-Z]\d{1,3}[A-Z]{3}$/.test(clean)) {
    const letters = clean.match(/[A-Z]{3}$/)?.[0] || '';
    return `${clean.slice(0, clean.length - 3)} ${letters}`.trim();
  }
  if (/^[A-Z]{3}\d{1,3}[A-Z]$/.test(clean)) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  return clean || vrm;
}

function engineSizeLabel(vehicle: VehicleInfo | undefined): string {
  if (vehicle?.engine_size) return vehicle.engine_size;
  if (vehicle?.engine_capacity_litres != null) {
    return `${vehicle.engine_capacity_litres}L`;
  }
  if (vehicle?.engine_capacity_cc != null) {
    return `${vehicle.engine_capacity_cc}cc`;
  }
  return '—';
}

/** Inline SVG icons for the premium cover banner (print-safe).
 *  Modern outline style — thin stroke, rounded caps — sized via CSS. */
const ICON_ATTRS =
  'class="cover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const ICONS = {
  calendar: `<svg ${ICON_ATTRS}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5"/><path d="M8 13h2M12 13h2M16 13h.01M8 16.5h2M12 16.5h2"/></svg>`,
  mileage: `<svg ${ICON_ATTRS}><circle cx="12" cy="13" r="8"/><path d="M12 13l4.2-4.2"/><path d="M8.2 18.2a7.2 7.2 0 0 1 7.6 0"/><circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  engine: `<svg ${ICON_ATTRS}><path d="M7 8h2V6h4v2h2"/><path d="M6 10h10a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H9l-2 2H5v-2H4a1 1 0 0 1-1-1v-3a2 2 0 0 1 2-2h1z"/><path d="M18 12h2v3h-2"/><path d="M9 13.5h4"/></svg>`,
  fuel: `<svg ${ICON_ATTRS}><rect x="3.5" y="3.5" width="10" height="17" rx="1.5"/><path d="M13.5 7h1.8l2.7 2.7V16a2 2 0 0 1-2 2h-.5"/><path d="M16.5 10.5V8.5"/><path d="M6.5 7.5h4v3.5h-4z"/></svg>`,
  gearbox: `<svg ${ICON_ATTRS}><circle cx="6.5" cy="5.5" r="1.4"/><circle cx="12" cy="5.5" r="1.4"/><circle cx="17.5" cy="5.5" r="1.4"/><circle cx="6.5" cy="18.5" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/><circle cx="17.5" cy="12" r="1.4"/><path d="M6.5 5.5v13M17.5 5.5v6.5M12 5.5v13M6.5 12h11"/></svg>`,
  colour: `<svg ${ICON_ATTRS}><path d="M12 3a9 9 0 0 1 9 9c0 3.2-2.2 5.5-5 5.5h-1.2a1.8 1.8 0 0 0-1.8 1.8 1.7 1.7 0 1 1-1.7-1.7"/><circle cx="7.5" cy="11" r="1.15" fill="currentColor" stroke="none"/><circle cx="10.2" cy="7.8" r="1.15" fill="currentColor" stroke="none"/><circle cx="14.2" cy="7.8" r="1.15" fill="currentColor" stroke="none"/><circle cx="16.8" cy="11" r="1.15" fill="currentColor" stroke="none"/></svg>`,
} as const;

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
  // Banner plate must show the plate currently on the vehicle (after any
  // cherished transfer), not merely the registration used to look up the report.
  const vrm = latestRegistration(payload);
  const make = payload.make || v.make || '';
  const model = payload.model || v.model || payload.derivative || '';
  const range = v.range || '';
  const trim = (v.model_variant || '').trim();
  const year = payload.year || v.year || '';
  const status = payload.overall_status || payload.report_data?.overall_status;
  const generated = payload.generated_at || payload.created_date;
  const brandSubtitle = opts.brandSubtitle || 'Dealer Vehicle History Report';
  const imageSrc = resolvedVehicleImage(payload);

  // Headline: make on its own line when we also have a range/model, matching
  // the Motovo banner (VAUXHALL / CROSSLAND X). Trim sits on the blue line.
  const makeLine = (make || '').trim().toUpperCase();
  const modelLine = (range || model || '').trim().toUpperCase();
  const headlineCore = [makeLine, modelLine].filter(Boolean).join(' ');
  const mileageText =
    payload.latest_mileage == null ? 'Unavailable' : fmtMileage(payload.latest_mileage);

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
  const vin = pickVin(payload);

  const imageHtml = imageSrc
    ? `<img class="cover-vehicle-img" src="${escAttr(imageSrc)}" alt="${escAttr(headlineCore)}" />`
    : '';

  const headlineHtml =
    makeLine && modelLine && makeLine !== modelLine
      ? `<h1><span class="cover-make">${esc(makeLine)}</span><span class="cover-model">${esc(modelLine)}</span></h1>`
      : `<h1>${esc(headlineCore || '—')}</h1>`;

  const specCards = [
    { icon: ICONS.engine, label: 'Engine Size', value: engineSizeLabel(v) },
    { icon: ICONS.fuel, label: 'Fuel', value: v.fuel_type || '—' },
    { icon: ICONS.gearbox, label: 'Gearbox', value: v.transmission || '—' },
    { icon: ICONS.colour, label: 'Colour', value: v.colour || '—' },
  ]
    .map(
      (s) => `
        <div class="cover-spec">
          ${s.icon}
          <div class="cover-spec-text">
            <div class="cover-spec-label">${esc(s.label)}</div>
            <div class="cover-spec-value">${esc(s.value)}</div>
          </div>
        </div>`,
    )
    .join('');

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
          <span class="plate">${esc(formatVrmDisplay(vrm))}</span>
        </div>
      </div>

      <div class="cover-body${imageSrc ? '' : ' cover-body--no-image'}">
        <div class="cover-identity">
          ${headlineHtml}
          ${trim ? `<div class="cover-trim">${esc(trim)}</div>` : ''}
          <div class="cover-quick-stats">
            ${year ? `<span class="cover-quick">${ICONS.calendar}<span>${esc(String(year))}</span></span>` : ''}
            ${year ? `<span class="cover-quick-sep"></span>` : ''}
            <span class="cover-quick${payload.latest_mileage == null ? ' unavailable' : ''}">${ICONS.mileage}<span>${esc(mileageText)}</span></span>
          </div>
          ${
            vin
              ? `<div class="vin-row"><span class="vin-label">VIN</span><span class="vin-value mono">${esc(vin)}</span></div>`
              : ''
          }
        </div>

        ${
          imageSrc
            ? `<div class="cover-vehicle">${imageHtml}</div>`
            : ''
        }

        <div class="cover-specs">
          ${specCards}
        </div>
      </div>

      <div class="cover-meta">
        Report ID: ${esc(payload.id || '—')} &nbsp;·&nbsp; Generated ${esc(fmtDate(generated))}
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
  `;
}
