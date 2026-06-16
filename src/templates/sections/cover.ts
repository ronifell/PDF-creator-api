import { ReportPayload, ReportStatus } from '../../types/report';
import { esc, escAttr, fmtDate, fmtMileage } from '../helpers';

function statusBanner(status?: ReportStatus, payload?: ReportPayload): string {
  const issues: string[] = [];
  if (payload?.has_writeoff_flag) issues.push('Insurance write-off recorded');
  if (payload?.has_stolen_flag) issues.push('Reported stolen');
  if (payload?.has_finance_flag) issues.push('Outstanding finance');
  if (payload?.has_high_keeper_turnover) issues.push('High keeper turnover');

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

export function renderCover(payload: ReportPayload): string {
  const v = payload.report_data?.vehicle || {};
  const vrm = payload.registration_number || payload.report_data?.registration_number || v.vrm || '';
  const make = payload.make || v.make || '';
  const model = payload.model || v.model || payload.derivative || '';
  const derivative = payload.derivative || v.derivative || '';
  const year = payload.year || v.year || '';
  const status = payload.overall_status || payload.report_data?.overall_status;

  const generated = payload.generated_at || payload.created_date;

  const imageSrc = payload.image_url || payload.report_data?.images?.primary || '';

  return `
    <section class="cover">
      <div class="brand-row">
        <div class="brand">
          <span class="logo-dot"></span>
          MOTOVO <span style="opacity:.7; font-weight:500; font-size:11pt; letter-spacing:.02em;">Car Check Report</span>
        </div>
        <div class="meta">
          Report ID: <strong>${esc(payload.id || '—')}</strong><br/>
          Generated: <strong>${esc(fmtDate(generated))}</strong>
        </div>
      </div>

      <div class="title-row">
        <div>
          <div class="row-gap" style="margin-bottom:8px;">
            <span class="plate">${esc(vrm)}</span>
            <span class="badge solid-accent">${esc(year)}</span>
          </div>
          <h1>${esc(make)} ${esc(model)}</h1>
          <div class="sub">${esc(derivative || '')}</div>
        </div>
        <div class="vehicle-image">
          ${
            imageSrc
              ? `<img src="${escAttr(imageSrc)}" alt="${escAttr(`${make} ${model}`)}" crossorigin="anonymous" />`
              : `<span class="placeholder">No vehicle image available</span>`
          }
        </div>
      </div>

      <div class="stat-strip">
        <div class="stat">
          <div class="label">Mileage</div>
          <div class="value">${esc(fmtMileage(payload.latest_mileage ?? null))}</div>
        </div>
        <div class="stat">
          <div class="label">Fuel</div>
          <div class="value">${esc(v.fuel_type || '—')}</div>
        </div>
        <div class="stat">
          <div class="label">Transmission</div>
          <div class="value">${esc(v.transmission || '—')}</div>
        </div>
        <div class="stat">
          <div class="label">Colour</div>
          <div class="value">${esc(v.colour || '—')}</div>
        </div>
      </div>
    </section>

    ${statusBanner(status, payload)}
  `;
}
