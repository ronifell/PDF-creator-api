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

  // The Equipment List flows naturally after Valuation. Each category card is
  // break-inside:avoid so individual categories never split mid-page; the
  // grid as a whole is free to break wherever it can, which lets earlier
  // pages fill up cleanly before the rest spills over. The disclaimer trailer
  // sits inside the same <section> so it slides into any empty strip
  // remaining below the grid on the final page.
  return `
    <section class="section">
      <div class="section-title"><span class="icon">⚙</span> Standard Equipment (${esc(standard.length)})</div>
      <div class="equip-grid">${cards}${optionalCard}</div>
      ${trailer}
    </section>
  `;
}
