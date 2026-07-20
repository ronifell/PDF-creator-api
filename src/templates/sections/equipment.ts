import { ReportPayload, SpecItem } from '../../types/report';
import { esc, groupBy } from '../helpers';

/** Long lists get a 2-col layout so paired rows stay shorter and more of them
 *  can fill leftover space at the bottom of a page. */
const MULTI_COL_THRESHOLD = 8;

function renderCategory(category: string, items: SpecItem[]): string {
  const lis = items
    .map(
      (i) => `
      <li>
        <span>
          <strong>${esc(i.name)}</strong>${
            i.description ? ` <span class="desc">— ${esc(i.description)}</span>` : ''
          }
        </span>
      </li>`,
    )
    .join('');

  const listClass = items.length >= MULTI_COL_THRESHOLD ? 'equip-list equip-list--cols' : 'equip-list';

  return `
    <div class="equip-cat">
      <div class="equip-cat-header">
        <h4>${esc(category)}</h4>
        <span class="equip-ref-chip">Reference only — not confirmed fitted</span>
      </div>
      <ul class="${listClass}">${lis}</ul>
    </div>
  `;
}

function renderGroup(title: string, items: SpecItem[]): string {
  if (!items.length) return '';
  const grouped = groupBy(items, (s) => s.category || 'Other');
  // Alphabetical pairing keeps neighbouring categories predictable and avoids
  // pairing the longest list with the shortest (which made the first Optional
  // row too tall to fill leftover space on the previous page).
  const categories = Object.keys(grouped).sort();
  const rows: string[] = [];
  for (let i = 0; i < categories.length; i += 2) {
    const left = renderCategory(categories[i], grouped[categories[i]]);
    if (categories[i + 1]) {
      const right = renderCategory(categories[i + 1], grouped[categories[i + 1]]);
      rows.push(
        `<table class="equip-row-table" role="presentation"><tr class="equip-grid-row"><td class="equip-cell"><div class="equip-cell-card">${left}</div></td><td class="equip-cell"><div class="equip-cell-card">${right}</div></td></tr></table>`,
      );
    } else {
      rows.push(
        `<table class="equip-row-table equip-row-table--solo" role="presentation"><tr class="equip-grid-row"><td class="equip-cell"><div class="equip-cell-card">${left}</div></td></tr></table>`,
      );
    }
  }
  return `
    <div class="equip-group">
      <div class="equip-group-title">${esc(title)} <span class="equip-group-count">(${esc(
        items.length,
      )})</span></div>
      <div class="equip-grid">${rows.join('')}</div>
    </div>
  `;
}

/**
 * "Manufacturer Options Reference"
 *
 * VDG confirmed that the specification list is *possible* factory equipment
 * for the model/trim — not confirmed-fitted to the specific VRM. We therefore:
 *   1. Label the section explicitly as a reference list, not a fitted list.
 *   2. Split it into Standard vs. Optional so buyers can see at a glance what
 *      came as standard on the trim.
 *   3. Include a disclaimer sourced from the client brief.
 *   4. Deliberately DO NOT use any colour/paint spec item from this list to
 *      override the main vehicle colour — the vehicle overview draws colour
 *      from `report_data.vehicle.colour` only. See vehicle.ts.
 */
export function renderEquipment(payload: ReportPayload, trailer = ''): string {
  const standard = payload.report_data?.specification?.standard || [];
  const optional = payload.report_data?.specification?.optional || [];

  if (!standard.length && !optional.length) return trailer;

  const standardHtml = renderGroup('Standard equipment', standard);
  const optionalHtml = optional.length
    ? renderGroup('Optional equipment', optional)
    : `<div class="equip-group">
        <div class="equip-group-title">Optional equipment <span class="equip-group-count">(0)</span></div>
        <div class="text-muted small">No optional equipment supplied by the manufacturer data source.</div>
      </div>`;

  return `
    <section class="section">
      <div class="section-title section-title--flow"><span class="icon">⚙</span> Manufacturer Options Reference</div>
      <div class="equip-note">
        Options / specification data is supplied by third-party vehicle data sources and may
        include items available for this model or trim, not necessarily confirmed as fitted to
        this exact vehicle. Always verify optional equipment in person.
      </div>
      ${standardHtml}
      ${optionalHtml}
      ${trailer}
    </section>
  `;
}
