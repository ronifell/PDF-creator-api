import { MotTest, ReportPayload } from '../../types/report';
import { esc, fmtDate, fmtMileage } from '../helpers';

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
  const summary = `
    <div class="card">
      <div class="kv">
        <div class="row">
          <div class="k">Latest test date</div>
          <div class="v">${esc(fmtDate(mot.latest_test_date))}</div>
        </div>
        <div class="row">
          <div class="k">Next due</div>
          <div class="v">${esc(fmtDate(mot.mot_due_date))}</div>
        </div>
        <div class="row">
          <div class="k">Tests on record</div>
          <div class="v">${esc(tests.length)}</div>
        </div>
        <div class="row">
          <div class="k">Pass / Fail</div>
          <div class="v">
            <span class="badge success">${esc(tests.filter((t) => t.passed === true).length)} pass</span>
            &nbsp;
            <span class="badge danger">${esc(tests.filter((t) => t.passed === false).length)} fail</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const list = tests.map((t, i) => renderTest(t, i)).join('');

  return `
    <section class="section">
      <div class="section-title"><span class="icon">✓</span> MOT History</div>
      ${summary}
      ${list || `<div class="text-muted small mt-2">No MOT tests recorded.</div>`}
    </section>
  `;
}

export function renderMileageTrend(payload: ReportPayload): string {
  const trend = payload.report_data?.mot?.mileage_trend || [];
  if (!trend.length) return '';

  const rows = trend
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(
      (p) => `
      <tr>
        <td>${esc(fmtDate(p.date))}</td>
        <td>${esc(fmtMileage(p.mileage ?? null))}</td>
      </tr>`,
    )
    .join('');

  return `
    <section class="section no-break">
      <div class="section-title"><span class="icon">↗</span> Mileage Trend</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Recorded mileage</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}
