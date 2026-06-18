import { ReportPayload, SpecItem } from '../../types/report';
import { esc, groupBy } from '../helpers';

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

  return `
    <div class="equip-cat">
      <h4>${esc(category)}</h4>
      <ul>${lis}</ul>
    </div>
  `;
}

export function renderEquipment(payload: ReportPayload, trailer = ''): string {
  const standard = payload.report_data?.specification?.standard || [];
  const optional = payload.report_data?.specification?.optional || [];

  if (!standard.length && !optional.length) return trailer;

  const grouped = groupBy(standard, (s) => s.category || 'Other');
  const categories = Object.keys(grouped).sort();

  const cards = categories.map((c) => renderCategory(c, grouped[c])).join('');

  const optionalCard = optional.length
    ? `<div class="equip-cat">
        <h4>Optional Equipment</h4>
        <ul>
          ${optional
            .map(
              (i) => `<li><span><strong>${esc(i.name)}</strong>${
                i.description ? ` <span class="desc">— ${esc(i.description)}</span>` : ''
              }</span></li>`,
            )
            .join('')}
        </ul>
      </div>`
    : '';

  // Render the equipment grid and any trailing content (e.g. the disclaimer
  // card) inside a single <section>. Keeping them as siblings of the same
  // section block gives Chromium a unified flow context, which lets the
  // disclaimer slide into the strip below the grid on the same page instead
  // of being pushed onto its own page.
  return `
    <section class="section">
      <div class="section-title"><span class="icon">⚙</span> Standard Equipment (${esc(standard.length)})</div>
      <div class="equip-grid">${cards}${optionalCard}</div>
      ${trailer}
    </section>
  `;
}
