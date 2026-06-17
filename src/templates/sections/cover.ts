import { ReportPayload, ReportStatus } from '../../types/report';
import { esc, escAttr, fmtCurrency, fmtDate, fmtMileage } from '../helpers';
import { readAssetDataUrl } from '../assets';
import { gatherObservations } from '../insights';

type Tone = 'ok' | 'warn' | 'fail';

interface Finding {
  label: string;
  value: string;
  tone: Tone;
}

/** Returns the VIN if it looks like an actual VIN, otherwise null. */
function pickVin(payload: ReportPayload): string | null {
  const v = payload.report_data?.vehicle?.vin?.trim();
  if (!v) return null;
  // The upstream feed sometimes returns "Permission Required" / "N/A" /
  // "Unavailable" instead of an actual VIN. Treat anything that doesn't look
  // like a VIN (alnum 11-17 chars) as missing so the cover stays clean.
  if (!/^[A-HJ-NPR-Z0-9]{11,17}$/i.test(v)) return null;
  return v.toUpperCase();
}

function statusBannerHtml(status: ReportStatus | undefined, issues: string[]): string {
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

/**
 * Top-level summary cards: Stolen / Finance / Write-off / MOT / Tax / Keepers / Valuation.
 */
function findings(payload: ReportPayload): Finding[] {
  const r = payload.report_data;
  const writeoffCount = r?.writeoff?.records?.length ?? 0;
  const financeCount = r?.finance?.records?.length ?? 0;
  const keepers = r?.history?.keeper_changes?.length ?? 0;
  const motValid = r?.tax?.mot_status === 'Valid';
  const motDue = r?.tax?.mot_due_date || r?.mot?.mot_due_date;
  const taxValid = !!r?.tax?.is_valid;
  const valuation = r?.valuation?.suggested_sale_price;

  return [
    {
      label: 'Stolen Check',
      value: r?.is_stolen ? 'Reported' : 'Clear',
      tone: r?.is_stolen ? 'fail' : 'ok',
    },
    {
      label: 'Finance',
      value: financeCount > 0 ? `${financeCount} active` : 'Clear',
      tone: financeCount > 0 ? 'fail' : 'ok',
    },
    {
      label: 'Write-off',
      value: writeoffCount > 0 ? `${writeoffCount} record${writeoffCount === 1 ? '' : 's'}` : 'Clear',
      tone: writeoffCount > 0 ? 'fail' : 'ok',
    },
    {
      label: 'MOT Status',
      value: motValid ? 'Valid' : motDue ? 'Check' : '—',
      tone: motValid ? 'ok' : 'warn',
    },
    {
      label: 'Tax Status',
      value: taxValid ? 'Taxed' : 'Check',
      tone: taxValid ? 'ok' : 'warn',
    },
    {
      label: 'Keeper Activity',
      value: payload.has_high_keeper_turnover
        ? `${keepers} keepers`
        : `${keepers || '—'} keepers`,
      tone: payload.has_high_keeper_turnover ? 'warn' : 'ok',
    },
    {
      label: 'Valuation',
      value: valuation != null ? fmtCurrency(valuation) : '—',
      tone: 'ok',
    },
  ];
}

function observationsHtml(payload: ReportPayload): string {
  const items = gatherObservations(payload);
  return `
    <div class="observations">
      ${items
        .map(
          (o) => `
        <div class="observation ${o.tone}">
          <span class="dot"></span>
          <span>${esc(o.text)}</span>
        </div>`,
        )
        .join('')}
    </div>
  `;
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

  const issues: string[] = [];
  if (payload.has_writeoff_flag) issues.push('Insurance write-off recorded');
  if (payload.has_stolen_flag) issues.push('Reported stolen');
  if (payload.has_finance_flag) issues.push('Outstanding finance');
  if (payload.has_high_keeper_turnover) issues.push('High keeper turnover');

  const findingCards = findings(payload)
    .map(
      (f) => `
      <div class="finding ${f.tone}">
        <div class="label">${esc(f.label)}</div>
        <div class="value">${esc(f.value)}</div>
      </div>`,
    )
    .join('');

  const logoSrc = readAssetDataUrl('logo.png', 'image/png');

  return `
    <section class="cover">
      <div class="cover-bar">
        <div class="brand">
          <img class="brand-logo" src="${escAttr(logoSrc)}" alt="Motovo logo" />
          <div class="brand-text">
            <div class="brand-name">MOTOVO</div>
            <div class="brand-sub">Dealer Vehicle History Report</div>
          </div>
        </div>
        <div class="plate-wrap">
          <div class="plate-label">REGISTRATION</div>
          <span class="plate">${esc(vrm)}</span>
          ${(() => {
            const vin = pickVin(payload);
            return vin
              ? `<div class="vin-row"><span class="vin-label">VIN</span><span class="vin-value mono">${esc(vin)}</span></div>`
              : '';
          })()}
        </div>
      </div>

      <div class="cover-title">
        <div>
          <h1>${esc(year)} ${esc(make)} ${esc(model)}</h1>
          <div class="sub">${esc(derivative || '')}</div>
          <div class="meta">
            Report ID: <strong>${esc(payload.id || '—')}</strong> &nbsp;·&nbsp;
            Generated <strong>${esc(fmtDate(generated))}</strong>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="label">Mileage</div><div class="value">${esc(fmtMileage(payload.latest_mileage ?? null))}</div></div>
          <div class="hero-stat"><div class="label">Fuel</div><div class="value">${esc(v.fuel_type || '—')}</div></div>
          <div class="hero-stat"><div class="label">Gearbox</div><div class="value">${esc(v.transmission || '—')}</div></div>
          <div class="hero-stat"><div class="label">Colour</div><div class="value">${esc(v.colour || '—')}</div></div>
        </div>
      </div>
    </section>

    ${statusBannerHtml(status, issues)}

    <section class="section no-break">
      <div class="section-title"><span class="icon">★</span> Key Findings</div>
      <div class="findings-grid">${findingCards}</div>
    </section>

    <!-- Key Observations: this list can be long (MOT insights are added on top
         of the risk story), so we deliberately omit no-break here and let it
         flow across pages. The section title is sticky (break-after:avoid)
         and each observation row is itself break-inside:avoid. -->
    <section class="section">
      <div class="section-title"><span class="icon">i</span> Key Observations</div>
      ${observationsHtml(payload)}
    </section>

    ${
      payload.image_url || payload.report_data?.images?.primary
        ? `<section class="section no-break">
            <div class="vehicle-image-block" data-vrm="${escAttr(vrm)}">
              <img src="${escAttr(payload.image_url || payload.report_data?.images?.primary || '')}"
                   alt="${escAttr(`${year} ${make} ${model} stock photo`)}"
                   referrerpolicy="no-referrer"
                   onerror="this.closest('.vehicle-image-block')?.classList.add('image-missing'); this.remove();" />
              <div class="vehicle-image-fallback">
                <span class="badge solid-primary">PHOTO UNAVAILABLE</span>
                <div class="text-muted small">${escAttr(`${year} ${make} ${model}`.trim())}</div>
              </div>
            </div>
          </section>`
        : ''
    }
  `;
}
