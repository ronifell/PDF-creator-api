import { ReportPayload } from '../../types/report';
import { esc, fmtCurrency, fmtDate, fmtMileage } from '../helpers';

export function renderValuation(payload: ReportPayload): string {
  const v = payload.report_data?.valuation;
  if (!v) return '';

  const tiles: Array<{ label: string; value: string; feature?: boolean }> = [
    { label: 'Suggested sale price', value: fmtCurrency(v.suggested_sale_price), feature: true },
    { label: 'Dealer forecourt', value: fmtCurrency(v.dealer_forecourt) },
    { label: 'Private (clean)', value: fmtCurrency(v.private_clean) },
    { label: 'Private (average)', value: fmtCurrency(v.private_average) },
    { label: 'Part exchange', value: fmtCurrency(v.part_exchange) },
    { label: 'Trade retail', value: fmtCurrency(v.trade_retail) },
    { label: 'Trade average', value: fmtCurrency(v.trade_average) },
    { label: 'Auction', value: fmtCurrency(v.auction) },
  ];

  const tileHtml = tiles
    .map(
      (t) => `
      <div class="val ${t.feature ? 'feature' : ''}">
        <div class="label">${esc(t.label)}</div>
        <div class="value">${t.value}</div>
      </div>`,
    )
    .join('');

  return `
    <section class="section no-break">
      <div class="section-title"><span class="icon">£</span> Valuation</div>
      <div class="val-grid">${tileHtml}</div>

      <div class="card mt-2">
        <div class="kv" style="grid-template-columns: 1fr 1fr 1fr 1fr;">
          <div class="row"><div class="k">Valuation date</div><div class="v">${esc(fmtDate(v.valuation_time))}</div></div>
          <div class="row"><div class="k">Valuation mileage</div><div class="v">${esc(fmtMileage(v.valuation_mileage ?? null))}</div></div>
          <div class="row"><div class="k">Valuation book</div><div class="v">${esc(v.valuation_book)}</div></div>
          <div class="row"><div class="k">Base midpoint</div><div class="v">${esc(fmtCurrency(v.base_midpoint))}</div></div>
          <div class="row"><div class="k">On the road (new)</div><div class="v">${esc(fmtCurrency(v.on_the_road))}</div></div>
          <div class="row"><div class="k">Optional uplift</div><div class="v">${esc(fmtCurrency(v.optional_uplift))}</div></div>
          <div class="row"><div class="k">Vehicle description</div><div class="v" style="text-align:right;">${esc(v.vehicle_description)}</div></div>
        </div>
      </div>
      <div class="text-muted small mt-1">
        Valuations are indicative only and may vary with condition, location and current market demand.
      </div>
    </section>
  `;
}
