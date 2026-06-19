import { MotTest, ReportPayload } from '../../types/report';
import { esc, fmtDate, fmtMileage, fmtNumber, parseDate } from '../helpers';
import { renderMileageChart } from './mileageChart';
import { detectMileageDiscrepancy } from '../insights';

function advisoryTag(type: string | undefined): string {
  const t = (type || '').toUpperCase();
  const allowed = ['ADVISORY', 'MINOR', 'MAJOR', 'DANGEROUS', 'PRS', 'FAIL'];
  const cls = allowed.includes(t) ? t : 'ADVISORY';
  return `<span class="tag ${cls}">${esc(t || 'NOTE')}</span>`;
}

function renderTest(test: MotTest, index: number): string {
  const passed = test.passed === true;
  const failed = test.passed === false;
  const badge = passed
    ? `<span class="badge success">✓ PASS</span>`
    : failed
    ? `<span class="badge danger">✕ FAIL</span>`
    : `<span class="badge info">RESULT</span>`;

  const advisories = (test.advisories || [])
    .map(
      (a) => `
      <li>
        ${advisoryTag(a.type)}
        <span>${esc(a.text || '—')}</span>
      </li>`,
    )
    .join('');

  return `
    <div class="card mot-card mt-2">
      <div class="mot-head">
        <div class="left">
          <strong>${esc(fmtDate(test.test_date))}</strong>
          ${badge}
          <span class="text-muted small">Mileage</span>
          <span class="badge info">${esc(fmtMileage(test.odometer ?? null, test.odometer_unit))}</span>
          ${
            test.expiry_date
              ? `<span class="text-muted small">Expires</span> <span class="badge">${esc(fmtDate(test.expiry_date))}</span>`
              : ''
          }
        </div>
        <div class="text-muted small">Test #${esc(index + 1)}</div>
      </div>
      ${
        advisories
          ? `<ul class="advisory-list">${advisories}</ul>`
          : `<div class="text-muted small">No advisories recorded.</div>`
      }
    </div>
  `;
}

export function renderMotHistory(payload: ReportPayload): string {
  const mot = payload.report_data?.mot;
  if (!mot) return '';

  const tests = mot.tests || [];
  const passCount = tests.filter((t) => t.passed === true).length;
  const failCount = tests.filter((t) => t.passed === false).length;

  // Compact 4-tile summary strip (matches the .cost / .val tile rhythm) — keeps
  // the MOT lead-in short so it can land at the bottom of a page below the
  // mileage chart without forcing the whole section to a new page.
  const summary = `
    <div class="mot-summary">
      <div class="mot-stat"><div class="label">Latest test</div><div class="value">${esc(fmtDate(mot.latest_test_date))}</div></div>
      <div class="mot-stat"><div class="label">Next due</div><div class="value">${esc(fmtDate(mot.mot_due_date))}</div></div>
      <div class="mot-stat"><div class="label">Tests on record</div><div class="value">${esc(tests.length)}</div></div>
      <div class="mot-stat"><div class="label">Pass / Fail</div>
        <div class="value mot-pf">
          <span class="badge success">${esc(passCount)} pass</span>
          <span class="badge danger">${esc(failCount)} fail</span>
        </div>
      </div>
    </div>
  `;

  const list = tests.map((t, i) => renderTest(t, i)).join('');

  return `
    <section class="section">
      <div class="section-lead">
        <div class="section-title"><span class="icon">✓</span> MOT History</div>
        ${summary}
      </div>
      ${list || `<div class="text-muted small mt-2">No MOT tests recorded.</div>`}
    </section>
  `;
}

/**
 * Mileage progression: line chart + a brief plain-English summary.
 *
 * The full table is intentionally **only** rendered when a discrepancy is
 * detected (mileage stepping backwards). Otherwise the chart already conveys
 * the whole story, and the same data is shown again next to each test card
 * in the MOT History section below.
 */
export function renderMileageTrend(payload: ReportPayload): string {
  const trend = payload.report_data?.mot?.mileage_trend || [];
  if (!trend.length) return '';

  // Sort chronologically for the summary stats.
  const sorted = trend
    .slice()
    .map((p) => ({ ...p, _t: parseDate(p.date)?.getTime() ?? 0 }))
    .sort((a, b) => a._t - b._t);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last && first
    ? Math.max(0, (last.mileage ?? 0) - (first.mileage ?? 0))
    : 0;

  const { hasDiscrepancy, decreases } = detectMileageDiscrepancy(trend);

  const summary = hasDiscrepancy
    ? `<span class="badge danger" style="margin-right:6px;">DISCREPANCY</span>
       Mileage steps backwards <strong>${esc(decreases)}</strong> time${decreases === 1 ? '' : 's'} —
       inspect the recorded readings below before purchase.`
    : `Mileage progression appears <strong>consistent</strong> from
       <strong>${esc(fmtDate(first.date))}</strong> to
       <strong>${esc(fmtDate(last.date))}</strong>
       (+${esc(fmtNumber(span))} mi across ${esc(sorted.length)} reading${sorted.length === 1 ? '' : 's'}).`;

  // Table is only emitted when we detected an anomaly.
  const tableHtml = hasDiscrepancy
    ? `
      <div class="table-wrap mt-2">
        <table>
          <thead><tr><th>Date</th><th>Recorded mileage</th></tr></thead>
          <tbody>${sorted
            .slice()
            .reverse()
            .map(
              (p) => `
              <tr>
                <td>${esc(fmtDate(p.date))}</td>
                <td>${esc(fmtMileage(p.mileage ?? null))}</td>
              </tr>`,
            )
            .join('')}
          </tbody>
        </table>
      </div>`
    : '';

  // Chart card stays atomic (break-inside:avoid via .card) so the SVG and
  // its caption are never separated. With the chart's flat aspect ratio
  // (800x130) the whole unit is small enough that, when space allows,
  // Chromium can pull it onto the same page as the write-off records.
  return `
    <section class="section">
      <div class="section-title"><span class="icon">↗</span> Mileage Progression</div>
      <div class="card">
        ${renderMileageChart(trend)}
        <div class="text-muted small mt-2">${summary}</div>
      </div>
      ${tableHtml}
    </section>
  `;
}
