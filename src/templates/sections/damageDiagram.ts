/**
 * Inline SVG damage diagram for the write-off section.
 *
 * Drawn as a top-down car silhouette in CSS-friendly SVG (no external assets).
 * Damage regions match the standard UK MIAFTR vocabulary:
 *   - Front, Front offside, Front nearside
 *   - Rear, Rear offside, Rear nearside
 *   - Offside, Nearside
 *   - Roof, Underbody
 */

import { normaliseArea } from '../helpers';

const REGION_MATCHERS: { id: string; tests: RegExp[] }[] = [
  { id: 'front-offside',   tests: [/front.*offside/, /offside.*front/, /front.*o-s/, /o-s.*front/] },
  { id: 'front-nearside',  tests: [/front.*nearside/, /nearside.*front/, /front.*n-s/, /n-s.*front/] },
  { id: 'front',           tests: [/^front$/, /^front-centre$/, /\bfront\b/] },
  { id: 'rear-offside',    tests: [/rear.*offside/, /offside.*rear/, /rear.*o-s/, /o-s.*rear/] },
  { id: 'rear-nearside',   tests: [/rear.*nearside/, /nearside.*rear/, /rear.*n-s/, /n-s.*rear/] },
  { id: 'rear',            tests: [/^rear$/, /^rear-centre$/, /\brear\b/] },
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
      if (r.tests.some((rx) => rx.test(v))) {
        ids.add(r.id);
        // First match wins so "front offside" doesn't also mark plain "front"
        break;
      }
    }
  }
  return ids;
}

export function renderDamageDiagram(damageAreas: string[]): string {
  const hits = regionsToHighlight(damageAreas);
  const hit = (id: string) => (hits.has(id) ? 'hit' : '');

  // Geometry: a stylised but car-shaped top-down silhouette.
  // viewBox is tall — fits comfortably alongside the write-off cards.
  return /* html */ `
    <svg class="damage-diagram" viewBox="0 0 320 560" xmlns="http://www.w3.org/2000/svg"
         preserveAspectRatio="xMidYMid meet" aria-label="Damage diagram">
      <title>Vehicle damage diagram</title>

      <!-- Base car silhouette: outer body + smaller cabin -->
      <g>
        <!-- Body outline -->
        <path d="
          M 90 40
          Q 160 14, 230 40
          L 250 80
          C 260 130, 264 230, 264 280
          C 264 330, 260 430, 250 480
          L 230 520
          Q 160 546, 90 520
          L 70 480
          C 60 430, 56 330, 56 280
          C 56 230, 60 130, 70 80
          Z"
          fill="#FFFFFF" stroke="#163B5F" stroke-width="2" stroke-linejoin="round" />

        <!-- Windshield (front) -->
        <path d="M 110 130 Q 160 110, 210 130 L 198 180 L 122 180 Z"
              fill="#DDE6F0" stroke="#A8BAD0" stroke-width="1" />
        <!-- Rear window -->
        <path d="M 122 430 L 198 430 L 210 480 Q 160 500, 110 480 Z"
              fill="#DDE6F0" stroke="#A8BAD0" stroke-width="1" />
        <!-- Roof panel (between windows) -->
        <rect x="116" y="190" width="88" height="230" rx="14" fill="#F5F7FA" stroke="#D1D4DC"/>

        <!-- Side mirrors -->
        <rect x="76"  y="195" width="14" height="8" rx="2" fill="#163B5F"/>
        <rect x="230" y="195" width="14" height="8" rx="2" fill="#163B5F"/>

        <!-- Wheels -->
        <rect x="48"  y="155" width="14" height="42" rx="4" fill="#1F2937"/>
        <rect x="258" y="155" width="14" height="42" rx="4" fill="#1F2937"/>
        <rect x="48"  y="415" width="14" height="42" rx="4" fill="#1F2937"/>
        <rect x="258" y="415" width="14" height="42" rx="4" fill="#1F2937"/>

        <!-- Headlights -->
        <rect x="105" y="56" width="32" height="10" rx="3" fill="#F5B400" opacity="0.65"/>
        <rect x="183" y="56" width="32" height="10" rx="3" fill="#F5B400" opacity="0.65"/>
        <!-- Bonnet line -->
        <path d="M 100 95 L 220 95" stroke="#D1D4DC" stroke-dasharray="3 3"/>
        <!-- Boot line -->
        <path d="M 100 460 L 220 460" stroke="#D1D4DC" stroke-dasharray="3 3"/>

        <!-- Tail lights -->
        <rect x="105" y="494" width="32" height="10" rx="3" fill="#C72929" opacity="0.65"/>
        <rect x="183" y="494" width="32" height="10" rx="3" fill="#C72929" opacity="0.65"/>

        <!-- Door split lines -->
        <line x1="116" y1="278" x2="204" y2="278" stroke="#D1D4DC" stroke-dasharray="2 3"/>
      </g>

      <!-- Damage regions (overlaid, semi-transparent so silhouette is still visible) -->
      <g opacity="0.78">
        <!-- Front corners -->
        <path id="front-nearside" class="region ${hit('front-nearside')}"
              d="M 70 80 Q 70 38, 130 30 L 160 30 L 160 96 L 80 96 Z" />
        <path id="front-offside" class="region ${hit('front-offside')}"
              d="M 250 80 Q 250 38, 190 30 L 160 30 L 160 96 L 240 96 Z" />
        <path id="front" class="region ${hit('front')}"
              d="M 110 40 Q 160 22, 210 40 L 220 90 L 100 90 Z" />

        <!-- Rear corners -->
        <path id="rear-nearside" class="region ${hit('rear-nearside')}"
              d="M 70 480 Q 70 522, 130 530 L 160 530 L 160 464 L 80 464 Z" />
        <path id="rear-offside" class="region ${hit('rear-offside')}"
              d="M 250 480 Q 250 522, 190 530 L 160 530 L 160 464 L 240 464 Z" />
        <path id="rear" class="region ${hit('rear')}"
              d="M 110 520 Q 160 538, 210 520 L 220 470 L 100 470 Z" />

        <!-- Side panels (long mid-section) -->
        <path id="nearside" class="region ${hit('nearside')}"
              d="M 56 120 L 90 120 L 90 440 L 60 440 C 56 380, 56 200, 56 120 Z" />
        <path id="offside" class="region ${hit('offside')}"
              d="M 264 120 L 230 120 L 230 440 L 260 440 C 264 380, 264 200, 264 120 Z" />

        <!-- Roof (visible only when hit; otherwise transparent) -->
        <rect id="roof" class="region ${hit('roof')}" x="116" y="190" width="88" height="230" rx="14" opacity="0.55" />
      </g>

      <!-- Compass labels -->
      <g font-family="Inter, Arial, sans-serif" font-size="9" fill="#6B7280" text-anchor="middle">
        <text x="160" y="20">FRONT</text>
        <text x="160" y="548">REAR</text>
        <text x="20"  y="282" transform="rotate(-90 20 282)">NEARSIDE</text>
        <text x="300" y="282" transform="rotate(90 300 282)">OFFSIDE</text>
      </g>
    </svg>

    <div class="text-muted small mt-2" style="text-align:center;">
      Red zones highlight damage areas reported across all write-off records.
    </div>
  `;
}
