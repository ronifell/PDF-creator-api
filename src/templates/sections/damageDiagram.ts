/**
 * Inline SVG damage diagram for the write-off section.
 *
 * The regions correspond to the standard UK damage-area vocabulary used by
 * the MIAFTR feed. The matcher is intentionally fuzzy — area labels may be
 * "Front offside", "Nearside", "Rear N/S", "Roof", etc.
 */

import { normaliseArea } from '../helpers';

const REGION_MATCHERS: { id: string; tests: RegExp[] }[] = [
  { id: 'front',           tests: [/^front$/, /^front-centre$/, /front$/] },
  { id: 'front-offside',   tests: [/front.*offside/, /offside.*front/, /front.*o-s/, /o-s.*front/] },
  { id: 'front-nearside',  tests: [/front.*nearside/, /nearside.*front/, /front.*n-s/, /n-s.*front/] },
  { id: 'rear',            tests: [/^rear$/, /^rear-centre$/, /rear$/] },
  { id: 'rear-offside',    tests: [/rear.*offside/, /offside.*rear/, /rear.*o-s/, /o-s.*rear/] },
  { id: 'rear-nearside',   tests: [/rear.*nearside/, /nearside.*rear/, /rear.*n-s/, /n-s.*rear/] },
  { id: 'offside',         tests: [/^offside$/, /^o-s$/, /right-side/, /driver-side/] },
  { id: 'nearside',        tests: [/^nearside$/, /^n-s$/, /left-side/, /passenger-side/] },
  { id: 'roof',            tests: [/roof/, /top/] },
  { id: 'underbody',       tests: [/under/, /floor/, /chassis/] },
];

function regionsToHighlight(damageAreas: string[]): Set<string> {
  const ids = new Set<string>();
  for (const raw of damageAreas) {
    const v = normaliseArea(raw);
    if (!v) continue;
    for (const r of REGION_MATCHERS) {
      if (r.tests.some((rx) => rx.test(v))) ids.add(r.id);
    }
  }
  return ids;
}

export function renderDamageDiagram(damageAreas: string[]): string {
  const hits = regionsToHighlight(damageAreas);
  const cls = (id: string) => `region${hits.has(id) ? ' hit' : ''}`;

  return /* html */ `
    <svg class="damage-diagram" viewBox="0 0 360 600" xmlns="http://www.w3.org/2000/svg" aria-label="Damage diagram">
      <title>Vehicle damage diagram</title>

      <!-- Body outline -->
      <g>
        <rect x="80" y="40" width="200" height="520" rx="60" ry="60"
              fill="#FFFFFF" stroke="#163B5F" stroke-width="2"/>

        <!-- Windscreen -->
        <path d="M110 130 L250 130 L240 180 L120 180 Z" fill="#E6EEF6" stroke="#B9CADC"/>
        <!-- Rear glass -->
        <path d="M120 470 L240 470 L250 510 L110 510 Z" fill="#E6EEF6" stroke="#B9CADC"/>

        <!-- Wheels -->
        <rect x="68"  y="140" width="22" height="50" rx="6" fill="#111827"/>
        <rect x="270" y="140" width="22" height="50" rx="6" fill="#111827"/>
        <rect x="68"  y="430" width="22" height="50" rx="6" fill="#111827"/>
        <rect x="270" y="430" width="22" height="50" rx="6" fill="#111827"/>

        <!-- Headlights -->
        <rect x="100" y="60" width="40" height="14" rx="4" fill="#F5B400" opacity="0.6"/>
        <rect x="220" y="60" width="40" height="14" rx="4" fill="#F5B400" opacity="0.6"/>

        <!-- Tail lights -->
        <rect x="100" y="528" width="40" height="14" rx="4" fill="#C72929" opacity="0.6"/>
        <rect x="220" y="528" width="40" height="14" rx="4" fill="#C72929" opacity="0.6"/>
      </g>

      <!-- Regions (clickable hit areas) -->
      <g>
        <!-- Front corners + centre -->
        <path id="front-nearside" class="${cls('front-nearside')}"
              d="M80 100 Q80 65, 140 50 L180 50 L180 110 L80 110 Z" opacity="0.55"/>
        <path id="front-offside" class="${cls('front-offside')}"
              d="M280 100 Q280 65, 220 50 L180 50 L180 110 L280 110 Z" opacity="0.55"/>
        <rect id="front" class="${cls('front')}" x="120" y="50" width="120" height="18" opacity="0.55"/>

        <!-- Side panels -->
        <rect id="nearside" class="${cls('nearside')}" x="80" y="200" width="40" height="240" opacity="0.55"/>
        <rect id="offside"  class="${cls('offside')}"  x="240" y="200" width="40" height="240" opacity="0.55"/>

        <!-- Rear corners + centre -->
        <path id="rear-nearside" class="${cls('rear-nearside')}"
              d="M80 500 Q80 540, 140 555 L180 555 L180 490 L80 490 Z" opacity="0.55"/>
        <path id="rear-offside" class="${cls('rear-offside')}"
              d="M280 500 Q280 540, 220 555 L180 555 L180 490 L280 490 Z" opacity="0.55"/>
        <rect id="rear" class="${cls('rear')}" x="120" y="540" width="120" height="18" opacity="0.55"/>

        <!-- Roof -->
        <rect id="roof" class="${cls('roof')}" x="120" y="200" width="120" height="240" rx="20" opacity="0.4"/>
      </g>

      <!-- Centre divider lines (door positions) -->
      <line x1="120" y1="260" x2="240" y2="260" stroke="#D1D4DC" stroke-dasharray="3 3"/>
      <line x1="120" y1="360" x2="240" y2="360" stroke="#D1D4DC" stroke-dasharray="3 3"/>

      <!-- Compass labels -->
      <g font-family="Inter, Arial, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">
        <text x="180" y="34">FRONT</text>
        <text x="180" y="580">REAR</text>
        <text x="20"  y="305" transform="rotate(-90 20 305)">NEARSIDE</text>
        <text x="340" y="305" transform="rotate(90 340 305)">OFFSIDE</text>
      </g>
    </svg>

    <div class="text-muted small mt-2" style="text-align:center;">
      Red zones indicate damage areas reported across all write-off records.
    </div>
  `;
}
