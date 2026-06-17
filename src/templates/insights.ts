/**
 * Insight extractors used by the cover-page Key Observations section.
 *
 * These functions scan MOT advisories + mileage history to surface
 * "story-level" findings (repeated tyre/brake/suspension issues, dangerous
 * defects, MOT failures, oil-leak mentions, mileage consistency) so the front
 * of the report reads like a premium summary rather than a data dump.
 */

import { Advisory, MileagePoint, MotTest, ReportPayload } from '../types/report';
import { parseDate } from './helpers';

export type Tone = 'ok' | 'warn' | 'fail';

export interface InsightItem {
  tone: Tone;
  text: string;
  /** Where it came from — purely informational, kept for future use. */
  source?: 'risk' | 'mot' | 'mileage' | 'history';
}

/** Buckets of keywords whose appearance across MOT records we want to surface. */
const KEYWORD_BUCKETS: Array<{ label: string; tone: Tone; words: RegExp[] }> = [
  { label: 'tyre',       tone: 'warn', words: [/\btyre/i, /\btyres\b/i, /tread/i] },
  { label: 'brake',      tone: 'warn', words: [/\bbrake\b/i, /\bbrakes\b/i, /handbrake/i] },
  { label: 'suspension', tone: 'warn', words: [/suspension/i, /ball ?joint/i, /shock absorber/i, /strut/i] },
  { label: 'headlamp',   tone: 'warn', words: [/headlamp/i, /headlight/i] },
];

const OIL_LEAK_RE = /oil\s*leak/i;
const MIN_RECORDS_FOR_REPEAT = 2; // surface only when seen in ≥2 separate tests

interface AdvisoryWithTest {
  test: MotTest;
  adv: Advisory;
}

function flattenAdvisories(tests: MotTest[]): AdvisoryWithTest[] {
  const out: AdvisoryWithTest[] = [];
  for (const test of tests) {
    for (const adv of test.advisories || []) {
      out.push({ test, adv });
    }
  }
  return out;
}

/**
 * Count distinct MOT tests (not advisories) that contain advisories matching
 * any of the keywords in a bucket. We dedupe per-test so a single test with
 * five tyre advisories counts as 1 record, not 5 — matching the wording in
 * the online view ("Repeated 'tyre' advisories across 9 MOT records").
 */
function countTestsMatchingBucket(tests: MotTest[], words: RegExp[]): number {
  let count = 0;
  for (const test of tests) {
    const advs = test.advisories || [];
    if (advs.some((a) => words.some((rx) => rx.test(a.text || '')))) {
      count++;
    }
  }
  return count;
}

function checkMileageConsistency(trend: MileagePoint[]): {
  consistent: boolean;
  decreases: number;
  bigJumpDays?: number;
} {
  const pts = (trend || [])
    .map((p) => ({ d: parseDate(p.date), m: Number(p.mileage) }))
    .filter((p) => p.d && Number.isFinite(p.m)) as Array<{ d: Date; m: number }>;
  if (pts.length < 2) return { consistent: true, decreases: 0 };

  pts.sort((a, b) => a.d.getTime() - b.d.getTime());

  let decreases = 0;
  for (let i = 1; i < pts.length; i++) {
    // small back-steps (≤ 50 mi) are noise — UKVD often lists two reads on
    // the same day at slightly different odometer values.
    if (pts[i].m + 50 < pts[i - 1].m) decreases++;
  }
  return { consistent: decreases === 0, decreases };
}

/**
 * Compute all observations for the cover, blending the existing risk-flag
 * findings with MOT-derived insights.
 */
export function gatherObservations(payload: ReportPayload): InsightItem[] {
  const out: InsightItem[] = [];
  const r = payload.report_data;
  const tests = r?.mot?.tests || [];
  const trend = r?.mot?.mileage_trend || [];

  // -------------------- Core risk story ----------------------
  out.push(
    r?.is_stolen
      ? { tone: 'fail', text: 'Reported as STOLEN on the Police National Computer.', source: 'risk' }
      : { tone: 'ok',   text: 'Not recorded as stolen on the Police National Computer.', source: 'risk' },
  );

  const financeCount = r?.finance?.records?.length ?? 0;
  out.push(
    financeCount > 0
      ? { tone: 'fail', text: `${financeCount} outstanding finance record${financeCount === 1 ? '' : 's'} found.`, source: 'risk' }
      : { tone: 'ok',   text: 'No outstanding finance records found.', source: 'risk' },
  );

  const writeoffCount = r?.writeoff?.records?.length ?? 0;
  if (writeoffCount > 0) {
    out.push({
      tone: 'fail',
      text: `${writeoffCount} write-off record${writeoffCount === 1 ? '' : 's'} found — inspect structural integrity.`,
      source: 'risk',
    });
  }

  if (payload.has_high_keeper_turnover) {
    const n = r?.history?.keeper_changes?.length ?? 0;
    out.push({
      tone: 'warn',
      text: `High keeper turnover detected (${n} keeper changes) — review ownership reasons carefully.`,
      source: 'history',
    });
  }

  if (r?.tax?.is_valid)         out.push({ tone: 'ok', text: 'Vehicle tax is currently valid.', source: 'risk' });
  else if (r?.tax?.tax_due_date) out.push({ tone: 'warn', text: 'Vehicle tax is not currently valid — verify SORN/relicense.', source: 'risk' });

  if (r?.history?.imported)        out.push({ tone: 'warn', text: 'Vehicle imported into the UK.', source: 'history' });
  if (r?.history?.exported)        out.push({ tone: 'warn', text: 'Vehicle exported from the UK.',  source: 'history' });
  if (r?.history?.is_scrapped)     out.push({ tone: 'fail', text: 'Vehicle recorded as scrapped.',  source: 'history' });
  if (r?.history?.certificate_of_destruction) {
    out.push({ tone: 'fail', text: 'Certificate of destruction issued — vehicle should not be on the road.', source: 'history' });
  }

  // -------------------- MOT-derived insights ----------------------
  const flat = flattenAdvisories(tests);

  // Dangerous defects → always elevate
  const dangerousCount = flat.filter((a) => (a.adv.type || '').toUpperCase() === 'DANGEROUS').length;
  if (dangerousCount > 0) {
    out.push({
      tone: 'fail',
      text: `${dangerousCount} DANGEROUS defect${dangerousCount === 1 ? '' : 's'} flagged in MOT history — verify each has been rectified.`,
      source: 'mot',
    });
  }

  // MOT failures (passed: false)
  const failureCount = tests.filter((t) => t.passed === false).length;
  if (failureCount > 0) {
    out.push({
      tone: 'warn',
      text: `${failureCount} MOT failure${failureCount === 1 ? '' : 's'} on record — confirm fault categories and subsequent rectification.`,
      source: 'mot',
    });
  }

  // Repeated keyword advisories (tyre, brake, suspension, headlamp)
  for (const bucket of KEYWORD_BUCKETS) {
    const matchCount = countTestsMatchingBucket(tests, bucket.words);
    if (matchCount >= MIN_RECORDS_FOR_REPEAT) {
      out.push({
        tone: bucket.tone,
        text: `Repeated "${bucket.label}" advisories across ${matchCount} MOT record${matchCount === 1 ? '' : 's'} — inspect carefully.`,
        source: 'mot',
      });
    }
  }

  // Oil leak mention — even a single one is worth surfacing
  const oilLeaks = flat.filter((a) => OIL_LEAK_RE.test(a.adv.text || ''));
  if (oilLeaks.length > 0) {
    out.push({
      tone: 'warn',
      text: `Oil leak noted in ${oilLeaks.length} MOT advisor${oilLeaks.length === 1 ? 'y' : 'ies'} — request a recent service history.`,
      source: 'mot',
    });
  }

  // MOT validity (positive observation if valid)
  if (r?.tax?.mot_status === 'Valid' && r?.mot?.mot_due_date) {
    out.push({
      tone: 'ok',
      text: `MOT currently valid until ${formatShortDate(r.mot.mot_due_date)}.`,
      source: 'mot',
    });
  }

  // -------------------- Mileage consistency ----------------------
  const mileageStatus = checkMileageConsistency(trend);
  if (mileageStatus.consistent) {
    out.push({
      tone: 'ok',
      text: 'Mileage progression appears consistent across MOT records.',
      source: 'mileage',
    });
  } else {
    out.push({
      tone: 'fail',
      text: `Mileage discrepancy detected (${mileageStatus.decreases} step${mileageStatus.decreases === 1 ? '' : 's'} backwards) — investigate before purchase.`,
      source: 'mileage',
    });
  }

  return out;
}

/** Local mileage check exported for the Mileage Progression section. */
export function detectMileageDiscrepancy(trend: MileagePoint[] | undefined): {
  hasDiscrepancy: boolean;
  decreases: number;
} {
  const r = checkMileageConsistency(trend || []);
  return { hasDiscrepancy: !r.consistent, decreases: r.decreases };
}

function formatShortDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
