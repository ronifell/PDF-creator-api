import { ReportPayload } from '../../types/report';
import { esc, fmtCurrency, fmtDate, fmtMileage, fmtNumber } from '../helpers';
import { chunkItems, renderTileTable } from '../tileGrid';

/** Absolute mileage-difference threshold that triggers the amber warning. */
const MATERIAL_MILEAGE_DELTA_ABS = 5_000;
/** Relative mileage-difference threshold (fraction of latest known mileage). */
const MATERIAL_MILEAGE_DELTA_REL = 0.1;

interface MileageReconciliation {
  provider: number | null;
  latest: number | null;
  delta: number | null;
  material: boolean;
  status: 'match' | 'differs' | 'no-latest' | 'no-provider';
}

/**
 * Reconcile the valuation's own mileage (`valuation_mileage`, i.e. the
 * mileage the trade book used to price the car) against the mileage we
 * actually know about (the latest MOT reading — or the top-level
 * `latest_mileage` if MOT data is missing).
 *
 * Divergence rules — an amber "may not reflect current mileage" warning is
 * emitted when EITHER threshold is crossed:
 *   • absolute delta ≥ 5,000 miles, OR
 *   • relative delta ≥ 10% of the latest known figure.
 *
 * Buyers routinely see valuations quoted for a lower/idealised mileage than
 * the car actually has on the clock — this stops that going unflagged.
 */
export function reconcileMileage(payload: ReportPayload): MileageReconciliation {
  const provider = payload.report_data?.valuation?.valuation_mileage ?? null;
  const tests = payload.report_data?.mot?.tests || [];
  const latestFromMot = tests.find((t) => typeof t.odometer === 'number')?.odometer ?? null;
  const latest = latestFromMot ?? payload.latest_mileage ?? null;

  if (provider == null) return { provider, latest, delta: null, material: false, status: 'no-provider' };
  if (latest == null) return { provider, latest, delta: null, material: false, status: 'no-latest' };

  const delta = provider - latest;
  const abs = Math.abs(delta);
  const material = abs >= MATERIAL_MILEAGE_DELTA_ABS || (latest > 0 && abs / latest >= MATERIAL_MILEAGE_DELTA_REL);
  if (abs === 0) return { provider, latest, delta: 0, material: false, status: 'match' };
  return { provider, latest, delta, material, status: 'differs' };
}

function mileageWarningBanner(reco: MileageReconciliation): string {
  if (!reco.material || reco.provider == null || reco.latest == null || reco.delta == null) return '';
  const direction = reco.delta > 0 ? 'higher' : 'lower';
  return `
    <div class="status-banner warn" style="margin-top:0; margin-bottom:8px;">
      <span class="dot"></span>
      <span>
        <strong>Valuation may not reflect current mileage.</strong>&nbsp;
        Provider used <strong>${esc(fmtMileage(reco.provider))}</strong> — the latest
        known mileage on this vehicle is <strong>${esc(fmtMileage(reco.latest))}</strong>
        (${esc(fmtNumber(Math.abs(reco.delta)))} miles ${direction}). Adjust the price
        estimate accordingly.
      </span>
    </div>
  `;
}

function mileageSummaryLine(reco: MileageReconciliation): string {
  if (reco.provider == null) {
    return `<div class="text-muted small mt-1">Valuation mileage not supplied by the provider.</div>`;
  }
  const provider = fmtMileage(reco.provider);
  if (reco.status === 'no-latest') {
    return `<div class="text-muted small mt-1">
      Valuation based on provider mileage: <strong>${esc(provider)}</strong>. No current
      mileage was returned for this vehicle so we cannot compare against the latest
      known reading.
    </div>`;
  }
  if (reco.status === 'match') {
    return `<div class="text-muted small mt-1">
      Valuation based on provider mileage: <strong>${esc(provider)}</strong> — matches
      the latest known mileage on record.
    </div>`;
  }
  return `<div class="text-muted small mt-1">
    Valuation based on provider mileage: <strong>${esc(provider)}</strong>. Latest known
    mileage: <strong>${esc(fmtMileage(reco.latest))}</strong>.
  </div>`;
}

interface RenderOptions {
  /** When true, dealer-only valuation tiles are hidden (public report mode). */
  publicMode?: boolean;
}

export function renderValuation(payload: ReportPayload, opts: RenderOptions = {}): string {
  const v = payload.report_data?.valuation;
  if (!v) return '';

  // Dealer report shows the full grid; public report drops dealer-only tiles.
  const dealerOnlyLabels = new Set(['Trade retail', 'Trade average', 'Auction', 'Part exchange']);
  const allTiles: Array<{ label: string; value: string; feature?: boolean }> = [
    { label: 'Suggested sale price', value: fmtCurrency(v.suggested_sale_price), feature: true },
    { label: 'Dealer forecourt', value: fmtCurrency(v.dealer_forecourt) },
    { label: 'Private (clean)', value: fmtCurrency(v.private_clean) },
    { label: 'Private (average)', value: fmtCurrency(v.private_average) },
    { label: 'Part exchange', value: fmtCurrency(v.part_exchange) },
    { label: 'Trade retail', value: fmtCurrency(v.trade_retail) },
    { label: 'Trade average', value: fmtCurrency(v.trade_average) },
    { label: 'Auction', value: fmtCurrency(v.auction) },
  ];
  const tiles = opts.publicMode
    ? allTiles.filter((t) => !dealerOnlyLabels.has(t.label))
    : allTiles;

  const tileRows = chunkItems(tiles, 4).map((row) =>
    row.map(
      (t) => `
        <div class="val ${t.feature ? 'feature' : ''}">
          <div class="label">${esc(t.label)}</div>
          <div class="value">${t.value}</div>
        </div>`,
    ),
  );

  const tileGridHtml = renderTileTable(tileRows, {
    tableClass: 'val-table',
    rowClass: 'val-table-row',
    cellClass: 'val-cell',
    columns: 4,
    wrapperClass: 'val-grid-block',
  });

  const reco = reconcileMileage(payload);
  const warning = mileageWarningBanner(reco);
  const summary = mileageSummaryLine(reco);

  return `
    <section class="section section--compact">
      <div class="section-lead">
        <div class="section-title"><span class="icon">£</span> Valuation</div>
        ${warning}
      </div>
      ${tileGridHtml}
      ${summary}

      <div class="card mt-2 keep-together valuation-details">
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
