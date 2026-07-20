import { ReportPayload } from '../../types/report';
import { esc, fmtDate } from '../helpers';

/**
 * Stolen / theft records section.
 *
 * Rendered as its own block — never merged with the write-off list — so that
 * a stolen entry never triggers "write-off category check advised" wording.
 *
 * Two states:
 *   • Police marker set (`is_stolen === true`) → red banner + PNC details.
 *   • Anything else → the section is hidden. The cover already conveys the
 *     "clear" state via the Stolen Check tile.
 */
export function renderStolenSection(payload: ReportPayload): string {
  const police = payload.report_data?.police;
  if (!police?.is_stolen) return '';

  return `
    <section class="section">
      <div class="section-lead">
        <div class="section-title"><span class="icon">⚠</span> Stolen / Theft Marker</div>
        <div class="status-banner fail" style="margin-top:0; margin-bottom:8px;">
          <span class="dot"></span>
          <span>
            <strong>This vehicle is currently listed on the Police National Computer as
              stolen.</strong>&nbsp; Do not proceed with any purchase until the marker
            has been formally cleared by the reporting police force.
          </span>
        </div>
      </div>
      <div class="card">
        <div class="kv" style="grid-template-columns: auto 1fr auto 1fr; gap: 2px 16px;">
          <div class="row"><div class="k">Reported stolen</div><div class="v">${esc(fmtDate(police.stolen_date))}</div></div>
          <div class="row"><div class="k">Added to PNC</div><div class="v">${esc(fmtDate(police.added_to_pnc))}</div></div>
          <div class="row"><div class="k">Current status</div><div class="v">${esc(police.current_status)}</div></div>
          <div class="row"><div class="k">Reporting force</div><div class="v">${esc(police.police_force)}</div></div>
        </div>
      </div>
    </section>
  `;
}
