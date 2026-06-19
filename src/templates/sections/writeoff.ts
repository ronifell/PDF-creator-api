import { ReportPayload, WriteoffRecord } from '../../types/report';
import { esc, fmtDate } from '../helpers';
import { renderDamageDiagram } from './damageDiagram';

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
        <!-- 4-column kv so each visual row holds two key/value pairs. This halves
             the card height vs. a single-column listing without sacrificing
             readability — the labels stay left-aligned, the values right-aligned
             within their column pair. -->
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

export function renderWriteoffSection(payload: ReportPayload): string {
  const records = payload.report_data?.writeoff?.records || [];
  if (!records.length) return '';

  // Section heading + status banner are wrapped in section-lead so the heading
  // cannot end up alone at the bottom of a page (matches the page-break fix
  // already in place for Keeper History).
  return `
    <section class="section">
      <div class="section-lead">
        <div class="section-title"><span class="icon">⚠</span> Write-off Records (${esc(records.length)})</div>
        <div class="status-banner fail" style="margin-top:0; margin-bottom:8px;">
          <span class="dot"></span>
          <span><strong>This vehicle is recorded as an insurance write-off.</strong>&nbsp;
            Each record below is paired with a diagram showing its specific damage area.</span>
        </div>
      </div>

      <div class="writeoff-list">
        ${records.map((r, i) => renderRecord(r, i)).join('')}
      </div>
    </section>
  `;
}
