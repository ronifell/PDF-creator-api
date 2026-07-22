import { PlateChange, ReportPayload } from '../../types/report';
import { esc, fmtDate, parseDate } from '../helpers';

/**
 * Number Plate History
 *
 * Shows Cherished Transfer status plus any recorded previous VRMs.
 *
 * Cherished-transfer resolution — the DVLA/VDG feed is the primary source
 * of truth, but a personal/dateless plate (e.g. A1EKY on a 2025 car) will
 * often come back with `cherished_transfer: false` and no plate_changes
 * because the DVLA simply doesn't record the original assignment as a
 * "transfer". We therefore also flag the vehicle as *likely* cherished
 * when the VRM does not match the standard age-identifier pattern for
 * the vehicle's first-registration year:
 *
 *   • Current format (2001+): AA00AAA  — two letters, two digits, three letters
 *   • Prefix   (1983–2001):   A123ABC  — one letter, up to three digits, three letters
 *   • Suffix   (1963–1983):   ABC123A  — three letters, up to three digits, one letter
 *
 * Anything else on a vehicle registered ≥ 2001 is treated as a private /
 * cherished plate ("likely" — we still print the DVLA answer verbatim
 * alongside the pattern-based warning).
 *
 * Display mirrors the Motovo online report: each real change is a card with
 * the previous plate prominent and "Date of change" underneath. When the
 * feed only supplies a legacy `vrm` (previous plate) with no `current_vrm`,
 * we fall back to the vehicle's current registration so the row still makes
 * sense.
 */
type CherishedState = 'yes' | 'no' | 'likely' | 'unknown';

const CURRENT_FORMAT = /^[A-Z]{2}\d{2}[A-Z]{3}$/;
const PREFIX_FORMAT = /^[A-Z]\d{1,3}[A-Z]{3}$/;
const SUFFIX_FORMAT = /^[A-Z]{3}\d{1,3}[A-Z]$/;

function isStandardVrmForYear(vrm: string, year: number | undefined): boolean {
  const v = vrm.replace(/\s+/g, '').toUpperCase();
  if (!v) return true; // unknown → don't flag
  if (CURRENT_FORMAT.test(v)) {
    if (!year) return true;
    // For current format, digits 3-4 encode the age identifier. 51+ = second
    // half of year. Reject only when we're confident the plate cannot match
    // the vehicle's first-reg year (± 1 year for grace).
    const yy = Number(v.slice(2, 4));
    if (!Number.isFinite(yy)) return true;
    const half = yy >= 51;
    const encodedYear = half ? 2000 + (yy - 50) : 2000 + yy;
    return Math.abs(encodedYear - year) <= 1;
  }
  if (PREFIX_FORMAT.test(v)) return !year || year < 2002;
  if (SUFFIX_FORMAT.test(v)) return !year || year < 1984;
  return false;
}

function realPlateChanges(changes: PlateChange[] | undefined | null): PlateChange[] {
  return (changes || []).filter((p) => {
    const prev = (p.previous_vrm || p.vrm || '').trim();
    const curr = (p.current_vrm || '').trim();
    // Date-only stubs (date set, both VRMs empty) are noise from the feed —
    // don't treat them as real transfers.
    return prev.length > 0 || curr.length > 0;
  });
}

function resolveCherished(
  flag: boolean | null | undefined,
  hasPlates: boolean,
  vrmLooksCherished: boolean,
): CherishedState {
  if (flag === true || hasPlates) return 'yes';
  if (vrmLooksCherished) return 'likely';
  if (flag === false) return 'no';
  return 'unknown';
}

function badgeFor(state: CherishedState): string {
  switch (state) {
    case 'yes':
      return `<span class="badge warning">Yes</span>`;
    case 'likely':
      return `<span class="badge warning">Likely</span>`;
    case 'no':
      return `<span class="badge success">No</span>`;
    case 'unknown':
      return `<span class="badge info">Not confirmed</span>`;
  }
}

function summaryFor(state: CherishedState, hasPlates: boolean): string {
  switch (state) {
    case 'yes':
      return hasPlates
        ? 'Previous plates listed below — this vehicle has changed registration at least once.'
        : 'Cherished transfer flagged by the feed but no previous plates were supplied.';
    case 'likely':
      return 'The current registration does not follow the standard UK age-identifier pattern for this vehicle, which suggests a personal/cherished plate. The data source did not return an explicit transfer record — verify manually via DVLA.';
    case 'no':
      return 'The data source explicitly confirms no cherished transfer — this vehicle is on its original registration.';
    case 'unknown':
      return 'No previous registration data returned by the data source — cherished-transfer status cannot be confirmed.';
  }
}

interface PlateRow {
  changedOn: string;
  /** Previous / outgoing plate — the one the online report highlights. */
  previous: string;
  /** Incoming / current plate after the change (may be inferred). */
  current: string;
}

function toDisplayRows(changes: PlateChange[], currentVrm: string): PlateRow[] {
  // Sort by date ascending so the story reads chronologically (oldest first).
  const sorted = changes.slice().sort((a, b) => {
    const da = parseDate(a.date || '')?.getTime() ?? 0;
    const db = parseDate(b.date || '')?.getTime() ?? 0;
    return da - db;
  });
  return sorted.map((p) => {
    const previous = ((p.previous_vrm || p.vrm || '') as string).toUpperCase().trim();
    let current = ((p.current_vrm || '') as string).toUpperCase().trim();
    // Legacy feeds often only send the previous plate under `vrm`. Fill in the
    // vehicle's current registration so the card still shows a coherent change.
    if (!current && previous && currentVrm && previous !== currentVrm) {
      current = currentVrm;
    }
    return {
      changedOn: fmtDate(p.date || ''),
      previous: previous || '—',
      current: current || '—',
    };
  });
}

function renderChangeCards(rows: PlateRow[]): string {
  if (!rows.length) return '';
  const cards = rows
    .map((r) => {
      const dateLine = r.changedOn && r.changedOn !== '—'
        ? `<div class="plate-change-date">Date of change: <strong>${esc(r.changedOn)}</strong></div>`
        : '';
      const became =
        r.current && r.current !== '—' && r.current !== r.previous
          ? `<div class="plate-change-became">Became <span class="plate sm">${esc(r.current)}</span></div>`
          : '';
      return `
        <div class="plate-change-card">
          <div class="plate-change-top">
            <div class="plate-change-label">Plate change</div>
            <span class="plate sm">${esc(r.previous)}</span>
          </div>
          ${dateLine}
          ${became}
        </div>`;
    })
    .join('');

  return `
    <div class="plate-change-list mt-2">
      <div class="plate-change-heading">Previous plate changes</div>
      ${cards}
      <p class="small text-muted mt-1">
        Plate change data sourced from DVLA via VDG. Indicates the vehicle previously held a different registration.
      </p>
    </div>`;
}

export function renderPlateHistory(payload: ReportPayload): string {
  const history = payload.report_data?.history;
  const vrm = (
    payload.registration_number ||
    payload.report_data?.registration_number ||
    payload.report_data?.vehicle?.vrm ||
    ''
  ).toUpperCase();
  const year = payload.year || payload.report_data?.vehicle?.year || undefined;
  const vrmLooksCherished = !!vrm && !isStandardVrmForYear(vrm, year || undefined);

  if (!history) {
    const state = resolveCherished(undefined, false, vrmLooksCherished);
    return `
      <section class="section section--compact">
        <div class="section-lead">
          <div class="section-title"><span class="icon">▤</span> Number Plate History</div>
        </div>
        <div class="plate-history">
          <div class="plate-row">
            <div class="plate-row-label">Cherished transfer</div>
            <div class="plate-row-value">${badgeFor(state)}</div>
          </div>
          <div class="text-muted small mt-1">${summaryFor(state, false)}</div>
        </div>
      </section>
    `;
  }

  const changes = realPlateChanges(history.plate_changes);
  const state = resolveCherished(history.cherished_transfer, changes.length > 0, vrmLooksCherished);
  const displayRows = toDisplayRows(changes, vrm);

  return `
    <section class="section section--compact">
      <div class="section-lead">
        <div class="section-title"><span class="icon">▤</span> Number Plate History</div>
      </div>
      <div class="plate-history">
        <div class="plate-row">
          <div class="plate-row-label">Cherished transfer</div>
          <div class="plate-row-value">${badgeFor(state)}</div>
        </div>
        <div class="text-muted small mt-1">${summaryFor(state, displayRows.length > 0)}</div>
      </div>
      ${renderChangeCards(displayRows)}
    </section>
  `;
}
