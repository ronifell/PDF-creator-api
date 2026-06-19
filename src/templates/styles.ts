/**
 * All print-targeted CSS for the Motovo car-check PDF.
 *
 * Colours are taken directly from the brand spec supplied by the client.
 */
export const reportStyles = /* css */ `
/* ---------- Tokens (Motovo brand) ---------- */
:root {
  --bg: #F8FAFC;
  --fg: #111827;
  --card: #FFFFFF;
  --card-fg: #111827;
  --primary: #163B5F;
  --primary-fg: #FFFFFF;
  --secondary: #F2F4F8;
  --secondary-fg: #163B5F;
  --muted: #EFF2F6;
  --muted-fg: #6B7280;
  --accent: #F5B400;
  --accent-fg: #111827;
  --destructive: #C72929;
  --destructive-fg: #FFFFFF;
  --border: #D1D4DC;
  --ring: #2C5C8C;
  --success: #2F7F33;

  --radius: 10px;
  --radius-lg: 14px;
}

/* ---------- Reset ---------- */
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #FFFFFF;
  color: var(--fg);
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Print page setup.
 * CSS @page margins MUST match Playwright's pdf({ margin }) values, otherwise
 * the header/footer templates render INSIDE the body content area. The header
 * template is rendered by Chromium within the @page top margin; body content
 * starts immediately after.
 *
 * Margins tuned to maximise content area while leaving enough room for the
 * running header (~9mm tall) and footer (~7mm tall). Reduced from 28/20 to
 * 20/14 to remove excessive whitespace at the bottom of pages. */
@page { size: A4; margin: 22mm 10mm 16mm 10mm; }

.page {
  /* No extra padding here — @page margin handles spacing from the page edge. */
}

/* ---------- Typography ---------- */
h1, h2, h3, h4 { margin: 0; color: var(--primary); font-weight: 700; letter-spacing: -0.01em; }
h1 { font-size: 22pt; }
h2 { font-size: 14pt; }
h3 { font-size: 11.5pt; }
h4 { font-size: 10pt; color: var(--fg); }
p { margin: 0 0 6px; }
small, .small { font-size: 8.5pt; color: var(--muted-fg); }
.mono { font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace; }

/* ---------- Section header ---------- */
/* All section spacing is driven by these two values, kept large enough that
   adjacent sections never visually collide but small enough that the report
   still flows tightly and fills each page. */
.section { margin-top: 14px; }
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5pt;
  color: var(--primary);
  font-weight: 700;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--accent);
  margin-bottom: 10px;
}
.section-title .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 23px; height: 23px;
  background: var(--secondary);
  color: var(--primary);
  border-radius: 6px;
  font-size: 11pt;
}

/* ---------- Cards / grid ----------
   All card-like surfaces share the same internal padding so the report has a
   single rhythm — no card ever looks more cramped than any other. */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 15px;
  break-inside: avoid;
}
.card + .card { margin-top: 9px; }
.grid { display: grid; gap: 8px; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

/* Definition-list style key/value rows for spec sheets */
.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 14px;
}
.kv .row {
  display: contents;
}
.kv .k {
  color: var(--muted-fg);
  font-size: 9.25pt;
  padding: 4px 0;
  border-bottom: 1px dashed var(--border);
}
.kv .v {
  color: var(--fg);
  font-size: 9.75pt;
  padding: 4px 0;
  border-bottom: 1px dashed var(--border);
  text-align: right;
  font-weight: 500;
}
.kv .row:last-child .k,
.kv .row:last-child .v { border-bottom: none; }

/* ---------- Badges ---------- */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 8.5pt;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-fg);
  border: 1px solid var(--border);
  white-space: nowrap;
}
.badge.success { background: #E8F4E9; color: var(--success); border-color: #BFDFC2; }
.badge.warning { background: #FFF6DA; color: #8A6500; border-color: #F2DA92; }
.badge.danger  { background: #FBE6E6; color: var(--destructive); border-color: #EFB6B6; }
.badge.info    { background: #E6EEF6; color: var(--primary); border-color: #B9CADC; }
.badge.solid-primary { background: var(--primary); color: var(--primary-fg); border-color: var(--primary); }
.badge.solid-accent  { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.badge.solid-danger  { background: var(--destructive); color: var(--destructive-fg); border-color: var(--destructive); }

/* ---------- Tables ---------- */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  background: var(--card);
}
thead th {
  background: var(--secondary);
  color: var(--primary);
  text-align: left;
  font-weight: 600;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
tbody td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}
tbody tr:nth-child(even) td { background: #FAFBFD; }
tbody tr:last-child td { border-bottom: none; }
.table-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

/* ---------- Cover ---------- */
.cover {
  position: relative;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #163B5F 0%, #1F4F7E 65%, #2C5C8C 100%);
  color: #FFFFFF;
  overflow: hidden;
}
.cover .cover-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
}
.cover .brand {
  display: inline-flex; align-items: center; gap: 10px;
}
.cover .brand .brand-logo {
  width: 28px; height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
}
.cover .brand .brand-text {
  display: flex; flex-direction: column; line-height: 1;
}
.cover .brand .brand-name {
  font-weight: 800; font-size: 14pt; letter-spacing: -0.02em;
}
.cover .brand .brand-sub {
  opacity: 0.85; font-size: 8.5pt; margin-top: 2px;
}
.cover .plate-wrap {
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
}
.cover .plate-label {
  font-size: 7pt; opacity: 0.75; letter-spacing: 0.12em; text-transform: uppercase;
}
.cover .vin-row {
  margin-top: 6px;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 6px;
  padding: 2px 8px;
}
.cover .vin-row .vin-label {
  font-size: 7pt; opacity: 0.7; letter-spacing: 0.12em; text-transform: uppercase;
}
.cover .vin-row .vin-value {
  font-size: 9pt; font-weight: 700; letter-spacing: 0.04em;
  color: #FFFFFF;
}

.cover .cover-title {
  margin-top: 12px;
  display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; align-items: end;
}
.cover h1 { color: #FFFFFF; font-size: 20pt; line-height: 1.12; }
.cover .sub { font-size: 10.5pt; opacity: 0.9; margin-top: 4px; }
.cover .meta { font-size: 8.5pt; opacity: 0.85; margin-top: 8px; }
.cover .hero-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.cover .hero-stat {
  background: #FFFFFF14; border: 1px solid #FFFFFF22; border-radius: var(--radius);
  padding: 6px 10px;
}
.cover .hero-stat .label { font-size: 7.5pt; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.06em; }
.cover .hero-stat .value { font-size: 11pt; font-weight: 700; margin-top: 1px; }

/* Page-break helper — forces the next section onto a new printed page.
   Used to keep the cover/findings/observations together on page 1 and let
   the vehicle hero photo open page 2. */
.section--page-break {
  break-before: page;
  page-break-before: always;
}

/* Hero vehicle image card (own row). Now that the photo lives on page 2 it
   has comfortable room to breathe, so we restore a larger silhouette. */
.vehicle-image-block {
  position: relative;
  width: 100%;
  height: 180px;
  background: var(--secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}
.vehicle-image-block img {
  max-width: 92%; max-height: 92%; object-fit: contain;
  display: block;
}
.vehicle-image-block .vehicle-image-fallback {
  display: none;
  flex-direction: column; align-items: center; gap: 6px;
  text-align: center;
}
/* When <img> errors and class image-missing is added, swap to the fallback */
.vehicle-image-block.image-missing .vehicle-image-fallback { display: flex; }

/* UK number plate */
.plate {
  display: inline-block;
  background: #F5B400;
  color: #111827;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 16pt;
  padding: 3px 10px;
  border-radius: 5px;
  border: 2px solid #111827;
  box-shadow: 0 1px 0 #00000022;
}
.plate.sm { font-size: 10pt; padding: 2px 6px; border-width: 1.5px; }

/* ---------- Findings cards ----------
   The Key Findings tiles get a touch more padding and bigger value type
   than ordinary cards because they are the visual anchor of page 1, where
   the vehicle photo no longer sits. The extra space helps the tile grid
   fill the gap below the cover without feeling sparse. */
.findings-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.finding {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 13px 15px;
  break-inside: avoid;
  border-left-width: 4px;
}
.finding.ok   { border-left-color: var(--success); }
.finding.warn { border-left-color: var(--accent); }
.finding.fail { border-left-color: var(--destructive); }
.finding .label {
  font-size: 8.25pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.06em;
}
.finding .value {
  font-size: 11.5pt; font-weight: 700; margin-top: 4px;
}
.finding.ok .value   { color: var(--success); }
.finding.warn .value { color: #8A6500; }
.finding.fail .value { color: var(--destructive); }

/* ---------- Observations ----------
   Same reasoning as .finding above — observation rows are the second half
   of page 1 and have to fill the page now that the photo has moved off.
   The extra row padding and slightly larger font give them the breathing
   room the user asked for. */
.observations { display: flex; flex-direction: column; gap: 9px; }
.observation {
  display: flex; gap: 11px; align-items: flex-start;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 11px 14px;
  font-size: 10pt;
  break-inside: avoid;
  page-break-inside: avoid;
}
.observation .dot {
  flex: 0 0 8px; height: 8px; border-radius: 999px; margin-top: 5px;
}
.observation.ok   { background: #F1F9F2; border-color: #BFDFC2; }
.observation.ok   .dot { background: var(--success); }
.observation.warn { background: #FFF9E5; border-color: #F2DA92; }
.observation.warn .dot { background: var(--accent); }
.observation.fail { background: #FCEFEF; border-color: #EFB6B6; }
.observation.fail .dot { background: var(--destructive); }

/* ---------- Status banner ---------- */
.status-banner {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px;
  border-radius: var(--radius);
  margin-top: 10px;
  font-size: 10pt;
}
.status-banner .dot { width: 10px; height: 10px; border-radius: 999px; }
.status-banner.ok   { background: #E8F4E9; color: #1E5A22; border: 1px solid #BFDFC2; }
.status-banner.ok .dot   { background: var(--success); }
.status-banner.warn { background: #FFF6DA; color: #6B4F00; border: 1px solid #F2DA92; }
.status-banner.warn .dot { background: var(--accent); }
.status-banner.fail { background: #FBE6E6; color: #7E1B1B; border: 1px solid #EFB6B6; }
.status-banner.fail .dot { background: var(--destructive); }

/* ---------- Risk check grid ---------- */
.risk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.risk {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  background: var(--card);
  display: flex; align-items: center; gap: 12px;
  break-inside: avoid;
}
.risk .pill {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 10pt;
  flex: 0 0 auto;
}
.risk.ok   .pill { background: #E8F4E9; color: var(--success); }
.risk.warn .pill { background: #FFF6DA; color: #8A6500; }
.risk.fail .pill { background: #FBE6E6; color: var(--destructive); }
.risk .label { font-size: 8.75pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.05em; }
.risk .value { font-size: 10.75pt; font-weight: 600; color: var(--fg); margin-top: 2px; }

/* ---------- Valuation tile grid ---------- */
.val-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.val {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 11px 13px;
  background: linear-gradient(180deg, #FFFFFF, #FAFBFD);
}
.val .label { font-size: 8.25pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.05em; }
.val .value { font-size: 13pt; font-weight: 800; color: var(--primary); margin-top: 3px; }
.val.feature { background: var(--primary); color: #fff; border-color: var(--primary); }
.val.feature .label { color: #ffffffcc; }
.val.feature .value { color: #fff; font-size: 15pt; }

/* ---------- MOT ---------- */
/* Compact 4-tile lead-in strip that sits directly under the MOT History
   heading. Same visual rhythm as .cost and .val tiles. Kept short so the
   whole heading + summary block (~95px) can squeeze in at the bottom of a
   page that still has room for it. */
.mot-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.mot-stat {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 9px 12px;
}
.mot-stat .label {
  font-size: 8pt; color: var(--muted-fg);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.mot-stat .value { font-size: 11pt; font-weight: 700; color: var(--primary); margin-top: 3px; }
.mot-stat .mot-pf { display: flex; gap: 6px; flex-wrap: wrap; }

/* ---------- MOT items ----------
   Each MOT test is a card. We intentionally allow them to break across pages
   (break-inside: auto) because a test with many advisories would otherwise
   push the whole card onto the next page and leave half a page blank above.
   The card head row stays glued to at least the first advisory via
   break-after: avoid on .mot-head. */
.mot-card { break-inside: auto; page-break-inside: auto; margin-top: 9px; }
.mot-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
  break-after: avoid; page-break-after: avoid;
}
.mot-head .left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.advisory-list { margin: 6px 0 0; padding: 0; list-style: none; }
.advisory-list li {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 5px 0;
  border-top: 1px dashed var(--border);
  font-size: 9pt;
  break-inside: avoid; page-break-inside: avoid;
}
.advisory-list li:first-child { border-top: none; }
.advisory-list .tag {
  flex: 0 0 auto;
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  min-width: 64px;
  text-align: center;
}
.tag.ADVISORY  { background: #E6EEF6; color: var(--primary); }
.tag.MINOR     { background: #FFF6DA; color: #8A6500; }
.tag.MAJOR     { background: #FBE6E6; color: var(--destructive); }
.tag.DANGEROUS { background: var(--destructive); color: #fff; }
.tag.PRS       { background: #F2F4F8; color: var(--primary); }
.tag.FAIL      { background: var(--destructive); color: #fff; }

/* ---------- Running Costs ---------- */
.cost-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.cost {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: linear-gradient(180deg, #FFFFFF, #FAFBFD);
  padding: 11px 13px;
  break-inside: avoid;
}
.cost .label { font-size: 8.5pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.05em; }
.cost .value { font-size: 13.5pt; font-weight: 800; color: var(--primary); margin-top: 4px; line-height: 1.1; }
.cost .foot  { font-size: 8.25pt; color: var(--muted-fg); margin-top: 4px; }
.cost.feature {
  background: var(--primary); color: #fff; border-color: var(--primary);
}
.cost.feature .label,
.cost.feature .foot { color: #ffffffcc; }
.cost.feature .value { color: #fff; font-size: 14.5pt; }

/* ---------- Write-off ----------
   Each record is a details card stacked directly above its own full-width
   damage diagram. The whole pair is wrapped in writeoff-record no-break so
   the diagram is never separated from the card it belongs to. */
.writeoff-cards { display: flex; flex-direction: column; gap: 10px; }
.writeoff-list  { display: block; }
.writeoff-list > .writeoff-record + .writeoff-record { margin-top: 14px; }
.writeoff-record {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.writeoff-record .card,
.writeoff-record .writeoff-diagram,
.writeoff-record .writeoff-diagram-empty { margin: 0; }
.writeoff-diagram-empty {
  background: var(--secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 12px;
  text-align: center;
}
/* Damage areas strip sits at the bottom of each writeoff card. Kept as a
   single flex row so multiple badges flow horizontally instead of stacking
   into another full kv row (saves vertical space). */
.writeoff-damage-strip {
  display: flex; align-items: center; gap: 10px;
  margin-top: 7px; padding-top: 7px;
  border-top: 1px dashed var(--border);
}
.writeoff-damage-strip-label {
  font-size: 9.25pt; color: var(--muted-fg);
}
.writeoff-damage-strip-value {
  display: inline-flex; flex-wrap: wrap; gap: 4px;
  font-size: 9.75pt; font-weight: 500;
}
/* Insurer / cause names can run long; in the 4-col writeoff kv we shave
   half a point off the value font and reduce the gap so the most common
   UK insurer/cause names fit on a single line instead of wrapping. */
.writeoff-card .kv .k { font-size: 8.75pt; }
.writeoff-card .kv .v { font-size: 9pt; }

/* Mileage chart — flat aspect ratio set in the SVG viewBox so the rendered
   height fits comfortably below the write-off records on the same page. The
   chart, its caption, and the wrapping card all stay together as one
   atomic unit (default .card rule) so we never split between the SVG and
   the caption below it. */
.mileage-chart {
  width: 100%; height: auto; display: block;
  break-inside: avoid; page-break-inside: avoid;
}

/* Damage diagram (landscape SVG from assets/damage-diagram.svg).
   The canvas wrapper hosts compass labels positioned around the silhouette. */
.damage-diagram-wrap {
  background: var(--secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px 10px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.damage-diagram-canvas {
  position: relative;
  width: 100%;
  /* The SVG silhouette still fills the full horizontal width of the card,
     but we crop a fixed amount of vertical whitespace from the top and
     bottom of the source artwork by forcing a flat ~17:6 (2.83:1) aspect on
     the canvas and asking the SVG to "slice" (xMidYMid slice) — i.e. scale
     to fill, crop excess. The car body occupies ~70% of the SVG viewBox
     vertically, so this crop falls cleanly inside the surrounding
     whitespace and never touches the wheels or roofline. The flatter aspect
     also lets the per-record card + diagram pair land twice on a single
     page rather than spilling onto a second page. */
  max-width: 100%;
  margin: 0 auto;
  padding: 4px 18px;
  aspect-ratio: 17 / 6;
  overflow: hidden;
}
.damage-diagram {
  position: absolute;
  inset: 4px 18px; /* match canvas padding so the SVG fills the inner area */
  width: calc(100% - 36px);
  height: calc(100% - 8px);
  display: block;
}
/* Base car silhouette uses the artwork's original black fill so the outline
   and interior detail look exactly as drawn. (To recolour to brand primary,
   uncomment the rule below.)                                                  */
/* .damage-diagram #car-body { fill: #163B5F !important; } */

/* Damage regions:
   - Non-hit  → fully transparent so silhouette shows through cleanly.
   - Hit      → soft red wash with a Gaussian-blur feather + multiply blend, so
                multiple overlapping hits darken naturally and the edges look
                airbrushed rather than cut out (matches the "feather + blend"
                look the client described).                                    */
.damage-diagram .damage-region { fill: transparent !important; }
.damage-diagram .damage-region.hit {
  fill: #E53935 !important;
  fill-opacity: 0.7 !important;
  mix-blend-mode: multiply;
  filter: url(#damage-feather);
}

/* Compass labels — letter-spaced to mirror the online Motovo view */
.damage-diagram-canvas .compass-label {
  position: absolute;
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--muted-fg);
  text-transform: uppercase;
}
.damage-diagram-canvas .compass-front {
  right: 0; top: 50%; transform: translateY(-50%) rotate(90deg);
  transform-origin: center;
}
.damage-diagram-canvas .compass-rear {
  left: 0; top: 50%; transform: translateY(-50%) rotate(-90deg);
  transform-origin: center;
}
.damage-diagram-canvas .compass-nearside {
  top: -2px; left: 50%; transform: translateX(-50%);
}
.damage-diagram-canvas .compass-offside {
  bottom: -2px; left: 50%; transform: translateX(-50%);
}
.damage-diagram-caption { text-align: center; margin-top: 4px; }

/* "Lead" group: section title + banner that must stay together.
   Combined with break-after:avoid on .section-title this guarantees the
   heading is never the last thing on a page. */
.section-lead {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Tables: keep the header row with at least the first body row. */
thead { break-inside: avoid; page-break-inside: avoid; }
thead tr { break-after: avoid; page-break-after: avoid; }
tbody tr { break-inside: avoid; page-break-inside: avoid; }

/* Section sub-title (used inside a section for the damage diagram heading) */
.section-title-sub {
  font-size: 10.5pt;
  border-bottom-width: 1px;
  padding-bottom: 4px;
  margin-bottom: 8px;
}
/* Keep section titles attached to whatever follows so we never orphan a heading
   like "Keeper History (10)" at the bottom of a page (issue noticed in the
   draft PDF). break-after: avoid asks the layout engine to never insert a
   break immediately after this element. */
.section-title, .section-title-sticky {
  break-after: avoid-page;
  page-break-after: avoid;
}

/* ---------- Equipment ---------- */
/* 2-column CSS Grid with stretch alignment so paired left/right category
   cards share the same row height. Wider columns mean fewer items wrap to
   a second line, keeping the section tall enough to read comfortably but
   short enough that the whole equipment list + disclaimer fit on one page. */
.equip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: stretch;
}
.equip-cat {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 12px 15px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.equip-cat h4 {
  font-size: 9.75pt;
  color: var(--primary);
  margin-bottom: 6px;
  display: flex; align-items: center; gap: 6px;
}
.equip-cat ul {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 2px;
}
.equip-cat li {
  font-size: 8.75pt;
  display: flex; gap: 6px; align-items: baseline;
  line-height: 1.4;
}
.equip-cat li::before {
  content: '';
  flex: 0 0 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--accent);
  transform: translateY(1px);
}
.equip-cat .desc { color: var(--muted-fg); }

/* ---------- Disclaimer footer-strip ----------
   A compact, low-emphasis legal notice that sits at the bottom of the
   equipment page. Rendered as a thin bordered block of muted text rather
   than a full card so it's small enough to share the page with the
   equipment grid. */
.disclaimer-strip {
  margin-top: 12px;
  padding: 9px 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--secondary);
  color: var(--muted-fg);
  font-size: 8pt;
  line-height: 1.4;
  break-inside: avoid;
  page-break-inside: avoid;
}
.disclaimer-strip strong { color: var(--primary); }

/* ---------- Utilities ---------- */
.row-between { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.row-gap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mt-0 { margin-top: 0; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mb-0 { margin-bottom: 0; }
.flex { display: flex; }
.flex-1 { flex: 1; }
.text-right { text-align: right; }
.text-muted { color: var(--muted-fg); }
.no-break { break-inside: avoid; page-break-inside: avoid; }
.page-break { break-before: page; page-break-before: always; }
hr.soft { border: none; border-top: 1px solid var(--border); margin: 8px 0; }

/* ---------- Header / Footer placeholders are injected by Playwright ---------- */
`;
