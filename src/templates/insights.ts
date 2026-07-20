/**
 * Key Observations — ported directly from the online Motovo
 * <ObservationsPanel /> React component so the PDF tells exactly the same
 * story as the dealer-facing web view.
 *
 * Order of items (top → bottom):
 *   1. Police stolen marker (good / bad)
 *   2. Outstanding finance (good / warn)
 *   3. Write-off records   (good / bad)
 *   4. Scrapped / certificate-of-destruction (bad, only if true)
 *   5. High recent keeper turnover (warn, only if flagged)
 *   6. Latest MOT result with advisory count (good / warn / bad)
 *   7. Repeated advisory themes — only emitted when a keyword appears
 *      in ≥3 advisories across all MOT history.
 *      Themes: suspension, exhaust, tyre, brake, oil, rust, wiper.
 *   8. Vehicle tax validity (good / bad)
 *
 * Items are then grouped by severity — green (ok), red (fail), orange (warn)
 * — so each colour band reads together on the cover page.
 *
 * The list is capped at MAX_VISIBLE (10) items so the cover stays clean.
 * If we exceed the cap, "ok" observations are dropped from the end first,
 * then "warn" — never a "fail" item.
 */

import { MileagePoint, MotTest, ReportPayload } from '../types/report';
import { parseDate } from './helpers';
import { realWriteoffRecords } from './sections/writeoff';

export type Tone = 'ok' | 'warn' | 'fail';

export interface InsightItem {
  tone: Tone;
  text: string;
  source?: 'risk' | 'mot' | 'mileage' | 'history';
}

/** Advisory keyword themes — same list as the online Observations panel. */
const ADVISORY_THEMES = [
  'suspension',
  'exhaust',
  'tyre',
  'brake',
  'oil',
  'rust',
  'wiper',
] as const;

const THEME_MIN_COUNT = 3;
const MAX_VISIBLE = 10;

function flattenAdvisoryText(tests: MotTest[]): string[] {
  const out: string[] = [];
  for (const t of tests) {
    for (const a of t.advisories || []) {
      if (a.text) out.push(a.text.toLowerCase());
    }
  }
  return out;
}

function checkMileageConsistency(trend: MileagePoint[]): {
  consistent: boolean;
  decreases: number;
} {
  const pts = (trend || [])
    .map((p) => ({ d: parseDate(p.date), m: Number(p.mileage) }))
    .filter((p) => p.d && Number.isFinite(p.m)) as Array<{ d: Date; m: number }>;
  if (pts.length < 2) return { consistent: true, decreases: 0 };

  pts.sort((a, b) => a.d.getTime() - b.d.getTime());

  let decreases = 0;
  for (let i = 1; i < pts.length; i++) {
    // ≤50 mi back-steps are noise (UKVD sometimes lists two reads on the same
    // day at slightly different odometer values).
    if (pts[i].m + 50 < pts[i - 1].m) decreases++;
  }
  return { consistent: decreases === 0, decreases };
}

const TONE_ORDER: Record<Tone, number> = { ok: 0, fail: 1, warn: 2 };

/** Group observations by severity: green, then red, then orange. */
function sortObservationsByTone(items: InsightItem[]): InsightItem[] {
  return [...items].sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/** Drop "ok" then "warn" items from the end until we fit MAX_VISIBLE. */
function capObservations(items: InsightItem[], max = MAX_VISIBLE): InsightItem[] {
  if (items.length <= max) return items;
  const result = [...items];
  for (const tone of ['ok', 'warn'] as const) {
    for (let i = result.length - 1; i >= 0 && result.length > max; i--) {
      if (result[i].tone === tone) result.splice(i, 1);
    }
    if (result.length <= max) break;
  }
  return result.slice(0, max);
}

/**
 * Build the Key Observations list shown on the cover page.
 *
 * Mirrors `ObservationsPanel` from the online Motovo view (same wording
 * and severity), grouped green → red → orange for the PDF cover layout.
 */
export function gatherObservations(payload: ReportPayload): InsightItem[] {
  const out: InsightItem[] = [];
  const r = payload.report_data;
  const tests = r?.mot?.tests || [];

  // 1. Police stolen marker
  if (r?.is_stolen) {
    out.push({ tone: 'fail', text: 'Vehicle reported as STOLEN on PNC — do not proceed.', source: 'risk' });
  } else {
    out.push({ tone: 'ok', text: 'No police stolen marker found.', source: 'risk' });
  }

  // 2. Outstanding finance — prefer record count when supplied, fall back to
  //    the marker flag so we still surface finance when only the boolean was
  //    supplied by the feed.
  const financeCount = r?.finance?.records?.length ?? 0;
  const financeMarker = !!(payload.has_finance_flag || r?.has_finance);
  if (financeCount > 0) {
    out.push({
      tone: 'fail',
      text: `${financeCount} finance record${financeCount === 1 ? '' : 's'} found — obtain written settlement confirmation before purchase.`,
      source: 'risk',
    });
  } else if (financeMarker) {
    out.push({
      tone: 'fail',
      text: 'Active finance marker recorded — agreement details not supplied. Obtain written settlement confirmation before purchase.',
      source: 'risk',
    });
  } else {
    out.push({ tone: 'ok', text: 'No outstanding finance records found.', source: 'risk' });
  }

  // 3. Write-off records — filtered to REAL insurance write-offs (with a
  //    category code or status cue), so stolen-only entries the feed
  //    misfiled here don't trigger "category check advised".
  const writeoffCount = realWriteoffRecords(r?.writeoff?.records).length;
  if (writeoffCount > 0) {
    out.push({
      tone: 'fail',
      text: `${writeoffCount} insurance write-off record${writeoffCount === 1 ? '' : 's'} found — category check advised.`,
      source: 'risk',
    });
  } else {
    out.push({ tone: 'ok', text: 'No insurance write-off records found.', source: 'risk' });
  }

  // 4. Scrapped / certificate of destruction (only when true)
  if (r?.history?.is_scrapped || r?.history?.certificate_of_destruction) {
    out.push({
      tone: 'fail',
      text: 'Vehicle has been scrapped or has a Certificate of Destruction — do not purchase.',
      source: 'history',
    });
  }

  // 5. High recent keeper turnover (only when flagged)
  if (payload.has_high_keeper_turnover) {
    const n = r?.history?.keeper_changes?.length ?? 0;
    out.push({
      tone: 'warn',
      text: `High recent keeper turnover detected (${n} keeper changes) — review carefully.`,
      source: 'history',
    });
  }

  // 6. Latest MOT result (tests are stored newest-first in the payload)
  const latestMot = tests[0];
  if (latestMot) {
    const advisoryCount = latestMot.advisories?.length || 0;
    const passed = latestMot.passed === true;
    const failed = latestMot.passed === false;
    if (passed && advisoryCount > 0) {
      out.push({
        tone: 'warn',
        text: `Latest MOT passed with ${advisoryCount} advisor${advisoryCount === 1 ? 'y' : 'ies'}.`,
        source: 'mot',
      });
    } else if (passed) {
      out.push({ tone: 'ok', text: 'Latest MOT passed with no advisories.', source: 'mot' });
    } else if (failed) {
      out.push({ tone: 'fail', text: 'Most recent MOT test failed.', source: 'mot' });
    }
  }

  // 7. Repeated advisory themes — only when >=3 advisories mention the keyword
  //    across all MOT history (matches the React panel's threshold exactly).
  const allAdvisoryText = flattenAdvisoryText(tests);
  for (const theme of ADVISORY_THEMES) {
    const count = allAdvisoryText.filter((t) => t.includes(theme)).length;
    if (count >= THEME_MIN_COUNT) {
      out.push({
        tone: 'warn',
        text: `Repeated "${theme}" advisories found across multiple MOTs — inspect carefully.`,
        source: 'mot',
      });
    }
  }

  // 8. Vehicle tax validity
  if (r?.tax?.is_valid === true) {
    out.push({ tone: 'ok', text: 'Vehicle tax currently valid.', source: 'risk' });
  } else if (r?.tax?.is_valid === false) {
    out.push({ tone: 'fail', text: 'Vehicle is NOT currently taxed.', source: 'risk' });
  }

  return capObservations(sortObservationsByTone(out));
}

/** Mileage discrepancy detector — used by Mileage Progression to decide
 *  whether to show the full table or just the chart + summary. */
export function detectMileageDiscrepancy(trend: MileagePoint[] | undefined): {
  hasDiscrepancy: boolean;
  decreases: number;
} {
  const r = checkMileageConsistency(trend || []);
  return { hasDiscrepancy: !r.consistent, decreases: r.decreases };
}
