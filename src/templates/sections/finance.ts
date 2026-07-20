import { FinanceRecord, ReportPayload } from '../../types/report';
import { esc, fmtDate } from '../helpers';

/**
 * Mask a finance agreement/reference number.
 *
 * Full agreement numbers are personal-identifiable info — we show only the
 * last 4 characters so a dealer can cross-check against a settlement letter
 * without the PDF itself being a leak vector. If the number is shorter than
 * 5 characters we return "—" rather than a value that would be trivial to
 * guess.
 */
function maskReference(raw: string | undefined | null): string {
  const s = (raw || '').toString().trim();
  if (!s) return '—';
  if (s.length <= 4) return '••••';
  return `${'•'.repeat(Math.max(4, s.length - 4))} ${s.slice(-4)}`;
}

function renderRecord(record: FinanceRecord, index: number): string {
  return `
    <div class="finance-record card keep-together">
      <div class="row-between" style="margin-bottom:6px;">
        <div class="row-gap">
          <span class="badge solid-danger">Active finance</span>
          <strong>${esc(record.finance_company || 'Finance company not specified')}</strong>
        </div>
        <div class="text-muted small">Record #${esc(index + 1)}</div>
      </div>
      <div class="kv" style="grid-template-columns: auto 1fr auto 1fr; gap: 2px 16px;">
        <div class="row"><div class="k">Agreement type</div><div class="v">${esc(record.agreement_type)}</div></div>
        <div class="row"><div class="k">Agreement date</div><div class="v">${esc(fmtDate(record.agreement_date))}</div></div>
        <div class="row"><div class="k">Term</div><div class="v">${esc(record.agreement_term)}</div></div>
        <div class="row"><div class="k">Reference (masked)</div><div class="v mono">${esc(maskReference(record.agreement_number))}</div></div>
        <div class="row"><div class="k">Contact</div><div class="v">${esc(record.contact_number)}</div></div>
      </div>
    </div>
  `;
}

/**
 * Outstanding finance section.
 *
 * Three states:
 *
 *   1. Detailed records supplied → render each record with masked reference
 *      numbers and settlement guidance.
 *   2. Marker only (`has_finance` / `has_finance_flag`) but no record detail
 *      → show the "Active finance recorded" placeholder wording asked for
 *      in the July 2026 client brief.
 *   3. No marker and no records → hide the section entirely (the cover
 *      "Finance: Clear" tile already conveys this).
 */
export function renderFinance(payload: ReportPayload): string {
  const records = payload.report_data?.finance?.records || [];
  const marker = !!(payload.has_finance_flag || payload.report_data?.has_finance);

  if (!records.length && !marker) return '';

  const guidance = `
    <div class="status-banner fail" style="margin-top:0; margin-bottom:8px;">
      <span class="dot"></span>
      <span><strong>Outstanding finance detected.</strong>&nbsp;
        Obtain written settlement confirmation from the finance company before
        completing the purchase. Buying a vehicle with active finance may leave
        it subject to repossession.</span>
    </div>
  `;

  if (!records.length) {
    return `
      <section class="section section--compact">
        <div class="section-lead">
          <div class="section-title"><span class="icon">£</span> Outstanding Finance</div>
          ${guidance}
        </div>
        <div class="card">
          <p style="margin:0;">
            <strong>Active finance recorded.</strong> Agreement details were not
            supplied by the data source. Obtain written settlement confirmation
            before purchase.
          </p>
        </div>
      </section>
    `;
  }

  const headingCount = ` (${records.length})`;
  return `
    <section class="section section--compact">
      <div class="section-lead">
        <div class="section-title"><span class="icon">£</span> Outstanding Finance${esc(headingCount)}</div>
        ${guidance}
      </div>
      <div class="finance-list">
        ${records.map((r, i) => renderRecord(r, i)).join('')}
      </div>
      <div class="text-muted small mt-2">
        Agreement/reference numbers are masked. Contact the finance company using
        the details shown to obtain a written settlement figure before purchase.
      </div>
    </section>
  `;
}
