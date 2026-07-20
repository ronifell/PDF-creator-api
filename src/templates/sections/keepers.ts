import { ReportPayload } from '../../types/report';
import { esc, fmtDate } from '../helpers';

export function renderKeeperHistory(payload: ReportPayload): string {
  const keepers = payload.report_data?.history?.keeper_changes || [];
  if (!keepers.length) return '';

  const sorted = keepers
    .slice()
    .sort((a, b) => (b.number_of_previous_keepers ?? 0) - (a.number_of_previous_keepers ?? 0));

  const rows = sorted
    .map(
      (k) => `
      <tr>
        <td><strong>Keeper #${esc(k.number_of_previous_keepers ?? '—')}</strong></td>
        <td>${esc(fmtDate(k.keeper_start_date))}</td>
      </tr>`,
    )
    .join('');

  return `
    <section class="section section--compact">
      <!-- The section-lead (heading + warning banner) is kept together and
           glued to at least the first table row via break-after: avoid on the
           section title. The table body is allowed to flow across pages so
           it naturally fills the bottom of the preceding page rather than
           jumping to a fresh page and leaving a gap behind it. -->
      <div class="section-lead">
        <div class="section-title"><span class="icon">◇</span> Keeper History (${esc(keepers.length)})</div>
        ${
          payload.has_high_keeper_turnover
            ? `<div class="status-banner warn" style="margin-top:0; margin-bottom:8px;">
                <span class="dot"></span>
                <span><strong>High keeper turnover detected.</strong>&nbsp; This vehicle has changed hands frequently — investigate ownership reasons.</span>
              </div>`
            : ''
        }
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:40%">Keeper</th>
              <th>Start date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}
