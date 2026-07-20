import { ReportPayload, VehicleInfo } from '../../types/report';
import { esc, fmtDate, fmtNumber } from '../helpers';

function row(k: string, v: string): string {
  return `<div class="row"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`;
}

/**
 * VIN cell renderer. The upstream feed sometimes returns
 * "Permission Required" / "N/A" / "" etc. Rather than displaying those raw
 * strings — which look like error messages inline with real data — we
 * substitute a neutral "Not provided" placeholder. A syntactically valid VIN
 * (11-17 alnum excluding I/O/Q) is rendered as-is in monospace.
 */
function vinCell(vin: string | undefined): string {
  const v = (vin || '').trim();
  if (!v) return esc('Not provided');
  if (/^[A-HJ-NPR-Z0-9]{11,17}$/i.test(v)) {
    return `<span class="mono">${esc(v.toUpperCase())}</span>`;
  }
  return esc('Not provided');
}

/** Fuel-type based classification used to decide hybrid vs pure-EV wording. */
function isHybridFuel(fuel: string | undefined): boolean {
  const f = (fuel || '').toLowerCase();
  // Word-boundary matches so "petrol mhev" and "1.5 phev" register as hybrid,
  // while "electric" (pure BEV) does not accidentally match "hev" inside a
  // longer word.
  if (f.includes('hybrid')) return true;
  return /\b(mhev|phev|hev)\b/.test(f);
}
function isPureElectric(fuel: string | undefined): boolean {
  const f = (fuel || '').toLowerCase();
  if (isHybridFuel(fuel)) return false;
  if (/\b(electric|ev|bev)\b/.test(f)) return true;
  return f.includes('electric');
}

/**
 * Human-readable "Powertrain" label.
 *
 * Feeds use inconsistent wording — the same PHEV might come back as
 * "Hybrid", "PHEV", "Plug-in Hybrid", "Petrol Plug-in Hybrid Electric"…
 * We normalise those into one of:
 *
 *   • "Mild hybrid" (mHEV / MHEV / 48V / mild)
 *   • "Plug-in hybrid" (PHEV / plug in)
 *   • "Full hybrid"   (any other hybrid string)
 *   • "Electric"      (pure BEV)
 *   • "ICE"           (petrol / diesel / other)
 *
 * If nothing readable is available we fall back to the raw `powertrain_type`
 * string with a leading capital.
 */
function powertrainLabel(v: VehicleInfo): string {
  const fuel = (v.fuel_type || '').toLowerCase();
  const pt = (v.powertrain_type || '').toLowerCase();
  const combined = `${fuel} ${pt}`;

  if (combined.includes('mhev') || combined.includes('mild')) return 'Mild hybrid';
  if (combined.includes('phev') || combined.includes('plug')) return 'Plug-in hybrid';
  if (combined.includes('hybrid') || combined.includes('hev')) return 'Full hybrid';
  if (isPureElectric(v.fuel_type)) return 'Electric';
  if (v.powertrain_type) {
    // Title-case the raw value if we have no better label.
    const raw = v.powertrain_type.trim();
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : '—';
  }
  return 'ICE';
}

/**
 * Human-readable "Engine" label.
 *
 * The upstream `engine_size` field is often a bare "1.5L" or similar. That
 * looks wrong on a hybrid (which has an ICE + electric motor combo) and even
 * more wrong on the pure EVs where the feed sometimes literally sends
 * "Electric motor" as the engine string alongside a 1,499cc capacity from a
 * previous ICE version of the trim.
 *
 * Rules:
 *   • Pure EV → "Electric motor" (capacity/torque/power still show if given)
 *   • Hybrid with a real combustion capacity → "1.5L petrol hybrid" (or
 *     diesel hybrid). The size is derived from `engine_size` if it looks
 *     numeric, otherwise from `engine_capacity_litres`, otherwise from cc.
 *   • Otherwise → the raw `engine_size` string.
 */
function engineLabel(v: VehicleInfo): string {
  if (isPureElectric(v.fuel_type)) return 'Electric motor';
  if (isHybridFuel(v.fuel_type)) {
    const combustionLabel = deriveCombustionLabel(v);
    const combustionFuel = deriveCombustionFuel(v);
    return combustionLabel
      ? `${combustionLabel} ${combustionFuel} hybrid`
      : `${combustionFuel} hybrid`;
  }
  return v.engine_size && v.engine_size.trim() ? v.engine_size : '—';
}

function deriveCombustionLabel(v: VehicleInfo): string {
  const raw = (v.engine_size || '').trim();
  if (raw && /\d/.test(raw) && !/electric/i.test(raw)) return raw;
  if (typeof v.engine_capacity_litres === 'number' && v.engine_capacity_litres > 0) {
    return `${v.engine_capacity_litres.toFixed(1)}L`;
  }
  if (typeof v.engine_capacity_cc === 'number' && v.engine_capacity_cc > 0) {
    return `${(v.engine_capacity_cc / 1000).toFixed(1)}L`;
  }
  return '';
}

function deriveCombustionFuel(v: VehicleInfo): string {
  const f = (v.fuel_type || '').toLowerCase();
  if (f.includes('diesel')) return 'diesel';
  if (f.includes('petrol') || f.includes('gasoline') || f.includes('unleaded')) return 'petrol';
  // Hybrids that don't identify the ICE fuel — default to petrol which is the
  // vast majority of mHEV / HEV / PHEV in the UK market.
  return 'petrol';
}

export function renderVehicleOverview(payload: ReportPayload): string {
  const v = payload.report_data?.vehicle || {};
  const pureEv = isPureElectric(v.fuel_type);

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
    row('Powertrain', esc(powertrainLabel(v))),
    row('Transmission', `${esc(v.transmission)}${v.number_of_gears ? ` · ${esc(v.number_of_gears)}-speed` : ''}`),
    row('Drive', esc(v.drive_type)),
    row('Engine', esc(engineLabel(v))),
    // Capacity is meaningless for pure EVs — the feed often carries over the
    // ICE capacity from a related trim. Show "—" so the row doesn't lie.
    row('Capacity', pureEv
      ? '—'
      : v.engine_capacity_cc ? `${fmtNumber(v.engine_capacity_cc)} cc` : '—'),
    row('Power', v.engine_power_bhp ? `${fmtNumber(v.engine_power_bhp)} bhp` : '—'),
    row('Torque', v.torque_nm ? `${fmtNumber(v.torque_nm)} Nm` : '—'),
    row('CO₂', v.co2 != null ? `${fmtNumber(v.co2)} g/km` : '—'),
    row('Combined MPG', v.combined_mpg
      ? `${fmtNumber(v.combined_mpg, { decimals: 1 })} ${pureEv ? 'mpg-e' : 'mpg'}`
      : '—'),
  ].join('');

  const codes = payload.report_data?.codes || {};
  const extra = [
    row('VIN', vinCell(v.vin)),
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
    <section class="section section--tight">
      <div class="section-lead">
        <div class="section-title"><span class="icon">▣</span> Vehicle Overview</div>
      </div>
      <div class="grid grid-2">
        <div class="card card--flow">
          <div class="kv">${leftRows}</div>
        </div>
        <div class="card card--flow">
          <div class="kv">${rightRows}</div>
        </div>
      </div>
      <div class="card card--flow mt-2">
        <div class="kv" style="grid-template-columns: 1fr 1fr 1fr 1fr;">${extra}</div>
      </div>
    </section>
  `;
}
