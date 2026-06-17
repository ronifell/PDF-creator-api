import { ReportPayload } from '../../types/report';
import { esc, fmtDate, normaliseArea } from '../helpers';
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

export function renderWriteoffSection(payload: ReportPayload): string {
  const records = payload.report_data?.writeoff?.records || [];
  if (!records.length) return '';

  // Aggregate all damage areas across all records (deduplicated)
  const allAreas = Array.from(
    new Set(
      records.flatMap((r) => (r.damage_areas || []).map((a) => normaliseArea(a))).filter(Boolean),
    ),
  );

  const cards = records
    .map(
      (r) => `
      <div class="card mt-2 no-break">
        <div class="row-between" style="margin-bottom:6px;">
          <div class="row-gap">
            ${categoryBadge(r.category)}
            <strong>${esc(r.status || 'Insurance write-off')}</strong>
          </div>
          <div class="text-muted small">Loss date: <strong>${esc(fmtDate(r.loss_date))}</strong></div>
        </div>
        <div class="kv" style="grid-template-columns: 1fr 1fr;">
          <div class="row"><div class="k">Cause of damage</div><div class="v">${esc(r.cause_of_damage)}</div></div>
          <div class="row"><div class="k">Theft indicator</div><div class="v">${esc(r.theft_indicator)}</div></div>
          <div class="row"><div class="k">Insurer</div><div class="v">${esc(r.insurer)}</div></div>
          <div class="row"><div class="k">MIAFTR date</div><div class="v">${esc(fmtDate(r.miaftr_date))}</div></div>
          <div class="row"><div class="k">Damage areas</div>
            <div class="v">${
              (r.damage_areas || []).length
                ? (r.damage_areas || [])
                    .map((a) => `<span class="badge danger">${esc(a)}</span>`)
                    .join(' ')
                : '—'
            }</div>
          </div>
        </div>
      </div>
    `,
    )
    .join('');

  return `
    <section class="section">
      <div class="section-title section-title-sticky"><span class="icon">⚠</span> Write-off Records (${esc(records.length)})</div>
      <div class="status-banner fail" style="margin-top:0; margin-bottom:8px;">
        <span class="dot"></span>
        <span><strong>This vehicle is recorded as an insurance write-off.</strong>&nbsp; See details and damage diagram below.</span>
      </div>

      <div class="writeoff-cards">${cards}</div>

      <div class="no-break">
        <div class="section-title section-title-sub" style="margin-top:14px;">
          <span class="icon">◬</span> Damage Area Diagram
        </div>
        ${renderDamageDiagram(allAreas)}
      </div>
    </section>
  `;
}
