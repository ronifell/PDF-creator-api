/**
 * Damage diagram for the write-off section.
 *
 * The base car silhouette is the artwork provided by the client
 * (`assets/damage-diagram.svg`). Each MIAFTR damage region is a separate
 * <path id="..."> inside `<g id="damage-zones">`:
 *
 *     front, front-offside, front-nearside,
 *     rear,  rear-offside,  rear-nearside,
 *     nearside, offside, roof, engine-bay
 *
 * The diagram is fully data-driven:
 *   1.  Collect `damage_areas` from every write-off record.
 *   2.  Normalise each label and fuzzy-match it against the region IDs.
 *   3.  At render time, inject `class="damage-region hit"` on the matched
 *       <path> elements so the CSS rule below paints them red.
 *
 * The user mentioned that a "soft red with feather + blend" gives the best
 * appearance, so the CSS uses `mix-blend-mode: multiply` together with a
 * gentle Gaussian-blur SVG filter to soften the edges.
 */

import { normaliseArea } from '../helpers';
import { readAssetText } from '../assets';

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
  { id: 'engine-bay',      tests: [/engine/, /bonnet/, /hood/] },
];

const ALL_REGION_IDS = REGION_MATCHERS.map((r) => r.id);

function regionsToHighlight(damageAreas: string[]): Set<string> {
  const ids = new Set<string>();
  for (const raw of damageAreas) {
    const v = normaliseArea(raw);
    if (!v) continue;
    for (const r of REGION_MATCHERS) {
      if (r.tests.some((rx) => rx.test(v))) {
        ids.add(r.id);
        break; // first match wins so "front offside" doesn't also mark plain "front"
      }
    }
  }
  return ids;
}

/**
 * For each region path:
 *   1. Strip the inline `fill:none` (otherwise it would always beat our CSS).
 *   2. Inject `class="damage-region"` or `class="damage-region hit"`.
 *
 * Non-hit regions keep the class so they remain styleable / inspectable but
 * have transparent fill (default in CSS). Matched paths get the `hit` modifier
 * which paints them red with feather + blend.
 */
function tagRegions(svg: string, hits: Set<string>): string {
  let out = svg;
  for (const id of ALL_REGION_IDS) {
    const cls = hits.has(id) ? 'damage-region hit' : 'damage-region';

    // Match the whole opening tag of <path ... id="<id>" ... />
    // Cleanest: capture the path tag, drop inline fill:none, prepend our class.
    out = out.replace(
      new RegExp(`<path([^>]*?)\\sid="${id}"([^>]*)/>`, 'g'),
      (_match, before: string, after: string) => {
        const cleaned = (before + after)
          // strip "fill:none;" or "fill: none" possibly with surrounding spaces
          .replace(/fill\s*:\s*none\s*;?/gi, '')
          // clean up any double semicolons left behind in style="..."
          .replace(/;\s*"/g, '"');
        return `<path${cleaned} id="${id}" class="${cls}" />`;
      },
    );
  }
  return out;
}

let baseSvgCache: string | null = null;
function loadBaseSvg(): string {
  if (baseSvgCache) return baseSvgCache;

  let svg = readAssetText('damage-diagram.svg');

  // Strip XML prolog / DOCTYPE so the SVG can be inlined inside HTML safely.
  svg = svg
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  // Inject the feather filter and the car-outline class hook ONCE.
  // The filter is defined inside <defs> so we can reference it from CSS via
  // `filter: url(#damage-feather)`.
  svg = svg.replace(
    /<svg([^>]*)>/,
    `<svg$1 class="damage-diagram" preserveAspectRatio="xMidYMid meet">
       <defs>
         <filter id="damage-feather" x="-10%" y="-10%" width="120%" height="120%">
           <feGaussianBlur stdDeviation="0.8" />
         </filter>
       </defs>`,
  );

  baseSvgCache = svg;
  return svg;
}

export function renderDamageDiagram(damageAreas: string[]): string {
  const hits = regionsToHighlight(damageAreas);
  const tagged = tagRegions(loadBaseSvg(), hits);

  return /* html */ `
    <div class="damage-diagram-wrap">
      <div class="damage-diagram-canvas">
        ${tagged}
        <span class="compass-label compass-front">F R O N T</span>
        <span class="compass-label compass-rear">R E A R</span>
        <span class="compass-label compass-nearside">N E A R S I D E</span>
        <span class="compass-label compass-offside">O F F S I D E</span>
      </div>
      <div class="damage-diagram-caption text-muted small">
        Red zones highlight damage areas reported across all write-off records.
      </div>
    </div>
  `;
}
