import { ReportPayload, WriteoffRecord } from '../../types/report';
import { esc, fmtDate } from '../helpers';
import { renderDamageDiagram } from './damageDiagram';

/**
 * Valid ABI/DVLA write-off category codes. A record without one of these
 * codes AND without a "write-off"/"total loss"/"damage" cue in its status
 * string is NOT a real insurance write-off — it might be a stolen/theft
 * record that the feed lumped in here. We separate those so the report
 * never advises "category check" for a stolen record.
 */
const VALID_WRITEOFF_CATEGORIES = new Set(['A', 'B', 'C', 'D', 'N', 'S']);
const WRITEOFF_STATUS_CUES = ['write-off', 'writeoff', 'total loss', 'damage'];

/**
 * Filter out records that don't look like real write-offs.
 * Exported so `insights.ts` uses the exact same rule when it decides
 * whether to emit the "N write-off records found" observation.
 */
export function realWriteoffRecords(records: WriteoffRecord[] | undefined | null): WriteoffRecord[] {
  return (records || []).filter((r) => {
    const cat = (r.category || '').trim().toUpperCase();
    if (cat && VALID_WRITEOFF_CATEGORIES.has(cat)) return true;
    const status = (r.status || '').toLowerCase();
    if (WRITEOFF_STATUS_CUES.some((cue) => status.includes(cue))) return true;
    // Records without a category, no matching status cue, and no damage areas
    // are treated as non-write-off data (e.g. a theft record mis-classified
    // by the feed). We do NOT count them here.
    return false;
  });
}

function categoryBadge(category: string | undefined): string {
  const c = (category || '').toUpperCase().trim();
  const map: Record<string, { label: string; cls: string }> = {
    A: { label: 'CAT A', cls: 'solid-danger' },
    B: { label: 'CAT B', cls: 'solid-danger' },
    S: { label: 'CAT S', cls: 'solid-danger' },
    N: { label: 'CAT N', cls: 'solid-accent' },
    C: { label: 'CAT C', cls: 'solid-accent' },
    D: { label: 'CAT D', cls: 'solid-accent' },
  };
  const info = map[c] || { label: c || 'CAT —', cls: 'info' };
  return `<span class="badge ${info.cls}">${esc(info.label)}</span>`;
}

/**
 * Render a single write-off record with its OWN matching damage diagram.
 *
 * The details card sits on top with the damage diagram immediately below it
 * at full width, so the diagram is large enough to read at a glance. The
 * whole pair is wrapped in `writeoff-record no-break` so the diagram never
 * gets separated from the record it belongs to.
 */
function renderRecord(r: WriteoffRecord, index: number): string {
  const areas = r.damage_areas || [];
  return /* html */ `
    <div class="writeoff-record no-break">
      <div class="card writeoff-card">
        <div class="row-between" style="margin-bottom:6px;">
          <div class="row-gap">
            ${categoryBadge(r.category)}
            <strong>${esc(r.status || 'Insurance write-off')}</strong>
          </div>
          <div class="text-muted small">
            Record #${esc(index + 1)} · Loss date: <strong>${esc(fmtDate(r.loss_date))}</strong>
          </div>
        </div>
        <div class="kv" style="grid-template-columns: auto 1fr auto 1fr; gap: 2px 16px;">
          <div class="row"><div class="k">Cause of damage</div><div class="v">${esc(r.cause_of_damage)}</div></div>
          <div class="row"><div class="k">Theft indicator</div><div class="v">${esc(r.theft_indicator)}</div></div>
          <div class="row"><div class="k">Insurer</div><div class="v">${esc(r.insurer)}</div></div>
          <div class="row"><div class="k">MIAFTR date</div><div class="v">${esc(fmtDate(r.miaftr_date))}</div></div>
        </div>
        <div class="writeoff-damage-strip">
          <span class="writeoff-damage-strip-label">Damage areas</span>
          <span class="writeoff-damage-strip-value">${
            areas.length
              ? areas.map((a) => `<span class="badge danger">${esc(a)}</span>`).join(' ')
              : '—'
          }</span>
        </div>
      </div>

      ${
        areas.length
          ? `<div class="writeoff-diagram">${renderDamageDiagram(areas)}</div>`
          : `<div class="writeoff-diagram-empty text-muted small">No damage area specified by the insurer.</div>`
      }
    </div>
  `;
}

/**
 * Write-off & scrap status section.
 *
 * Three independent facts, always rendered as their OWN banner so they can
 * never be conflated:
 *
 *   • Insurance write-off — filtered to records with a real CAT code or
 *     status cue. Stolen-only entries from the feed do not appear here.
 *   • Scrap marker
 *   • Certificate of Destruction
 */
export function renderWriteoffSection(payload: ReportPayload): string {
  const records = realWriteoffRecords(payload.report_data?.writeoff?.records);
  const history = payload.report_data?.history;
  const scrapped = !!history?.is_scrapped;
  const cod = !!history?.certificate_of_destruction;
  const hasScrapMarker = scrapped || cod;

  // Nothing to say → hide the section entirely.
  if (!records.length && !hasScrapMarker) return '';

  const writeoffBanner = records.length
    ? `<div class="status-banner fail" style="margin-top:0; margin-bottom:8px;">
        <span class="dot"></span>
        <span><strong>This vehicle is recorded as an insurance write-off.</strong>&nbsp;
          Each record below is paired with a diagram showing its specific damage area.</span>
      </div>`
    : `<div class="status-banner ok" style="margin-top:0; margin-bottom:8px;">
        <span class="dot"></span>
        <span><strong>No insurance write-off record found.</strong></span>
      </div>`;

  const scrapLabel = cod && scrapped
    ? 'Certificate of Destruction / scrapped marker detected'
    : cod
      ? 'Certificate of Destruction issued'
      : 'Scrapped marker detected';
  const scrapBanner = hasScrapMarker
    ? `<div class="status-banner fail" style="margin-top:0; margin-bottom:8px;">
        <span class="dot"></span>
        <span><strong>${esc(scrapLabel)} — do not purchase.</strong>&nbsp;
          The DVLA lists this vehicle as scrapped and/or has issued a Certificate of Destruction.</span>
      </div>`
    : '';

  const headingCount = records.length ? ` (${esc(records.length)})` : '';

  return `
    <section class="section section--compact">
      <div class="section-lead">
        <div class="section-title"><span class="icon">⚠</span> Write-off &amp; Scrap Status${headingCount}</div>
        ${writeoffBanner}
        ${scrapBanner}
      </div>

      ${
        records.length
          ? `<div class="writeoff-list">${records.map((r, i) => renderRecord(r, i)).join('')}</div>`
          : ''
      }
    </section>
  `;
}
