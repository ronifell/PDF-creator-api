import { ReportPayload } from '../../types/report';
import { esc } from '../helpers';
import { realWriteoffRecords } from './writeoff';
import { chunkItems, renderTileTable } from '../tileGrid';

const CURRENT_FORMAT = /^[A-Z]{2}\d{2}[A-Z]{3}$/;
const PREFIX_FORMAT = /^[A-Z]\d{1,3}[A-Z]{3}$/;
const SUFFIX_FORMAT = /^[A-Z]{3}\d{1,3}[A-Z]$/;

function looksLikeCherishedVrm(vrm: string, year: number | undefined): boolean {
  const v = vrm.replace(/\s+/g, '').toUpperCase();
  if (!v) return false;
  if (CURRENT_FORMAT.test(v)) {
    if (!year) return false;
    const yy = Number(v.slice(2, 4));
    if (!Number.isFinite(yy)) return false;
    const encodedYear = yy >= 51 ? 2000 + (yy - 50) : 2000 + yy;
    return Math.abs(encodedYear - year) > 1;
  }
  if (PREFIX_FORMAT.test(v)) return !!year && year >= 2002;
  if (SUFFIX_FORMAT.test(v)) return !!year && year >= 1984;
  return true;
}

type RiskTone = 'ok' | 'warn' | 'fail';
interface RiskCheck {
  label: string;
  value: string;
  tone: RiskTone;
}

function check(label: string, hit: boolean, hitLabel = 'Detected', okLabel = 'Clear', toneIfHit: RiskTone = 'fail'): RiskCheck {
  return {
    label,
    value: hit ? hitLabel : okLabel,
    tone: hit ? toneIfHit : 'ok',
  };
}

/** Soft circular SVG status marks — cleaner than unicode ✓/✕ glyphs in print. */
function pillFor(tone: RiskTone): string {
  const common =
    'viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"';
  switch (tone) {
    case 'ok':
      return `<svg class="pill-svg" ${common}>
        <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.14"/>
        <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="1.35"/>
        <path d="M5.8 10.2l2.7 2.7 5.7-5.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    case 'warn':
      return `<svg class="pill-svg" ${common}>
        <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.14"/>
        <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="1.35"/>
        <path d="M10 5.6v5.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <circle cx="10" cy="14.1" r="0.95" fill="currentColor"/>
      </svg>`;
    case 'fail':
      return `<svg class="pill-svg" ${common}>
        <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.14"/>
        <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="1.35"/>
        <path d="M6.8 6.8l6.4 6.4M13.2 6.8l-6.4 6.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>`;
  }
}

export function renderRiskChecks(payload: ReportPayload): string {
  const r = payload.report_data;
  // Prefer a filtered record count over the raw `has_writeoff` flag: on
  // several UKVD payloads the flag was set for stolen entries that carried
  // no CAT code. The tile now agrees with what the write-off section
  // actually renders.
  const filteredWriteoffCount = realWriteoffRecords(r?.writeoff?.records).length;
  const hasRealWriteoff = filteredWriteoffCount > 0 || (!!r?.has_writeoff && (r?.writeoff?.records?.length ?? 0) === 0);
  const financeMarker = !!(payload.has_finance_flag || r?.has_finance);
  const financeRecords = r?.finance?.records?.length ?? 0;
  const financeActive = financeMarker || financeRecords > 0;

  const checks: RiskCheck[] = [
    check('Insurance write-off', hasRealWriteoff, filteredWriteoffCount > 0 ? `${filteredWriteoffCount} record${filteredWriteoffCount === 1 ? '' : 's'}` : 'Recorded'),
    check('Stolen (police)', !!r?.is_stolen, 'Reported stolen'),
    check('Outstanding finance', financeActive, financeRecords > 0 ? `${financeRecords} record${financeRecords === 1 ? '' : 's'}` : 'Active'),
    check('Scrapped', !!r?.is_scrapped || !!r?.history?.is_scrapped, 'Scrapped'),
    check('Imported', !!r?.history?.imported, 'Yes', 'No', 'warn'),
    check('Exported', !!r?.history?.exported, 'Yes', 'No', 'warn'),
    check(
      'High keeper turnover',
      !!r?.has_high_keeper_turnover,
      'Yes',
      'Normal',
      'warn',
    ),
    check(
      'Certificate of destruction',
      !!r?.history?.certificate_of_destruction,
      'Issued',
    ),
    (() => {
      const vrm = payload.registration_number || r?.registration_number || r?.vehicle?.vrm || '';
      const year = payload.year || r?.vehicle?.year || undefined;
      const explicitYes = !!r?.history?.cherished_transfer;
      const hasPreviousPlates =
        !!r?.history?.plate_changes?.some((p) => {
          const prev = (p.previous_vrm || p.vrm || '').trim();
          const curr = (p.current_vrm || '').trim();
          return prev.length > 0 || curr.length > 0;
        });
      const patternHit = looksLikeCherishedVrm(vrm, year);
      if (explicitYes || hasPreviousPlates) {
        return { label: 'Cherished plate transfer', value: 'Yes', tone: 'warn' as const };
      }
      if (patternHit) {
        return { label: 'Cherished plate transfer', value: 'Likely', tone: 'warn' as const };
      }
      return { label: 'Cherished plate transfer', value: 'No', tone: 'ok' as const };
    })(),
  ];

  const riskGridHtml = renderTileTable(
    chunkItems(checks, 3).map((row) =>
      row.map(
        (c) => `
        <div class="risk ${c.tone}">
          <div class="pill">${pillFor(c.tone)}</div>
          <div>
            <div class="label">${esc(c.label)}</div>
            <div class="value">${esc(c.value)}</div>
          </div>
        </div>`,
      ),
    ),
    {
      tableClass: 'risk-table',
      rowClass: 'risk-table-row',
      cellClass: 'risk-cell',
      columns: 3,
      wrapperClass: 'risk-grid-block',
    },
  );

  return `
    <section class="section section--compact section--fit-page">
      <div class="section-title"><span class="icon">⚠</span> Risk Checks Summary</div>
      ${riskGridHtml}
    </section>
  `;
}
