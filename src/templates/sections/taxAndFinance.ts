import { ReportPayload } from '../../types/report';
import { esc, fmtBool, fmtDate } from '../helpers';

export function renderTaxAndFinance(payload: ReportPayload): string {
  const tax = payload.report_data?.tax;
  const finance = payload.report_data?.finance?.records || [];
  const police = payload.report_data?.police;
  if (!tax && !police && !finance.length) return '';

  return `
    <section class="section no-break">
      <div class="section-title"><span class="icon">§</span> Tax, MOT &amp; Compliance</div>
      <div class="grid grid-3">
        ${
          tax
            ? `
        <div class="card">
          <h4>Vehicle Tax</h4>
          <div class="kv mt-1">
            <div class="row"><div class="k">Tax valid</div><div class="v">${esc(fmtBool(tax.is_valid))}</div></div>
            <div class="row"><div class="k">Tax due</div><div class="v">${esc(fmtDate(tax.tax_due_date))}</div></div>
            <div class="row"><div class="k">CO₂</div><div class="v">${esc(tax.co2 ?? '—')} g/km</div></div>
            <div class="row"><div class="k">VED (12m)</div><div class="v">${esc(tax.ved_12m ?? '—')}</div></div>
          </div>
        </div>
        <div class="card">
          <h4>MOT Status</h4>
          <div class="kv mt-1">
            <div class="row"><div class="k">Status</div><div class="v">${esc(tax.mot_status)}</div></div>
            <div class="row"><div class="k">Next due</div><div class="v">${esc(fmtDate(tax.mot_due_date))}</div></div>
          </div>
        </div>`
            : ''
        }

        <div class="card">
          <h4>Police / Stolen</h4>
          <div class="kv mt-1">
            <div class="row"><div class="k">Reported stolen</div><div class="v">${esc(fmtBool(police?.is_stolen))}</div></div>
            <div class="row"><div class="k">Stolen date</div><div class="v">${esc(fmtDate(police?.stolen_date))}</div></div>
            <div class="row"><div class="k">Current status</div><div class="v">${esc(police?.current_status)}</div></div>
            <div class="row"><div class="k">Police force</div><div class="v">${esc(police?.police_force)}</div></div>
          </div>
        </div>
      </div>

      ${
        finance.length
          ? `
        <div class="card mt-2">
          <h4>Outstanding Finance Records (${esc(finance.length)})</h4>
          <div class="table-wrap mt-1">
            <table>
              <thead><tr>
                <th>Company</th><th>Agreement</th><th>Date</th><th>Term</th><th>Number</th>
              </tr></thead>
              <tbody>
                ${finance
                  .map(
                    (f) => `
                  <tr>
                    <td>${esc(f.finance_company)}</td>
                    <td>${esc(f.agreement_type)}</td>
                    <td>${esc(fmtDate(f.agreement_date))}</td>
                    <td>${esc(f.agreement_term)}</td>
                    <td>${esc(f.agreement_number)}</td>
                  </tr>`,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>`
          : `<div class="text-muted small mt-2">No active finance records detected.</div>`
      }
    </section>
  `;
}
