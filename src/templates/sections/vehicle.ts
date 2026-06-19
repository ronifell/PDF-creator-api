import { ReportPayload } from '../../types/report';
import { esc, fmtDate, fmtNumber } from '../helpers';

function row(k: string, v: string): string {
  return `<div class="row"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`;
}

export function renderVehicleOverview(payload: ReportPayload): string {
  const v = payload.report_data?.vehicle || {};

  const leftRows = [
    row('Make', esc(v.make)),
    row('Model', esc(v.model)),
    row('Derivative', esc(v.derivative)),
    row('Series', esc(v.series)),
    row('Year', esc(v.year)),
    row('First registered', esc(fmtDate(v.first_registration))),
    row('Body style', esc(v.body_style)),
    row('Colour', esc(v.colour)),
    row('Doors', esc(v.doors)),
    row('Seats', esc(v.seats)),
  ].join('');

  const rightRows = [
    row('Fuel type', esc(v.fuel_type)),
    row('Powertrain', esc(v.powertrain_type)),
    row('Transmission', `${esc(v.transmission)}${v.number_of_gears ? ` · ${esc(v.number_of_gears)}-speed` : ''}`),
    row('Drive', esc(v.drive_type)),
    row('Engine', esc(v.engine_size)),
    row('Capacity', v.engine_capacity_cc ? `${fmtNumber(v.engine_capacity_cc)} cc` : '—'),
    row('Power', v.engine_power_bhp ? `${fmtNumber(v.engine_power_bhp)} bhp` : '—'),
    row('Torque', v.torque_nm ? `${fmtNumber(v.torque_nm)} Nm` : '—'),
    row('CO₂', v.co2 ? `${fmtNumber(v.co2)} g/km` : '—'),
    row('Combined MPG', v.combined_mpg ? `${fmtNumber(v.combined_mpg, { decimals: 1 })} mpg` : '—'),
  ].join('');

  const codes = payload.report_data?.codes || {};
  const extra = [
    row('VIN', esc(v.vin)),
    row('Engine number', esc(codes.engine_number)),
    row('UKVD ID', esc(codes.ukvd_id)),
    row('Euro status', esc(v.euro_status)),
    row('Country of origin', esc(v.country_of_origin)),
  ].join('');

  // Vehicle Overview is allowed to flow across pages — each .card has
  // break-inside: avoid so individual sub-blocks stay atomic, but the
  // section as a whole can split if it would otherwise leave a half-empty
  // page above. section-lead keeps the heading attached to at least the
  // first row of data.
  return `
    <section class="section">
      <div class="section-lead">
        <div class="section-title"><span class="icon">▣</span> Vehicle Overview</div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="kv">${leftRows}</div>
        </div>
        <div class="card">
          <div class="kv">${rightRows}</div>
        </div>
      </div>
      <div class="card mt-2">
        <div class="kv" style="grid-template-columns: 1fr 1fr 1fr 1fr;">${extra}</div>
      </div>
    </section>
  `;
}
