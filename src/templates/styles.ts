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
 */
@page { size: A4; margin: 28mm 10mm 20mm 10mm; }

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
.section { margin-top: 14px; }
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12pt;
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
  width: 22px; height: 22px;
  background: var(--secondary);
  color: var(--primary);
  border-radius: 6px;
  font-size: 11pt;
}

/* ---------- Cards / grid ---------- */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  break-inside: avoid;
}
.card + .card { margin-top: 8px; }
.grid { display: grid; gap: 8px; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

/* Definition-list style key/value rows for spec sheets */
.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 12px;
}
.kv .row {
  display: contents;
}
.kv .k {
  color: var(--muted-fg);
  font-size: 9pt;
  padding: 3px 0;
  border-bottom: 1px dashed var(--border);
}
.kv .v {
  color: var(--fg);
  font-size: 9.5pt;
  padding: 3px 0;
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
  padding: 14px 16px 14px;
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
  display: inline-flex; align-items: center; gap: 8px;
}
.cover .brand .logo-dot {
  width: 18px; height: 18px; border-radius: 5px; background: var(--accent);
}
.cover .brand .brand-name {
  font-weight: 800; font-size: 14pt; letter-spacing: -0.02em;
}
.cover .brand .brand-sub {
  opacity: 0.85; font-size: 9pt; padding-left: 4px;
}
.cover .plate-wrap {
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
}
.cover .plate-label {
  font-size: 7pt; opacity: 0.75; letter-spacing: 0.12em; text-transform: uppercase;
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

/* Hero vehicle image card (own row) */
.vehicle-image-block {
  position: relative;
  width: 100%;
  height: 170px;
  background: var(--secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
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

/* ---------- Findings cards ---------- */
.findings-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
}
.finding {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 8px 10px;
  break-inside: avoid;
  border-left-width: 4px;
}
.finding.ok   { border-left-color: var(--success); }
.finding.warn { border-left-color: var(--accent); }
.finding.fail { border-left-color: var(--destructive); }
.finding .label {
  font-size: 7.5pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.06em;
}
.finding .value {
  font-size: 10.5pt; font-weight: 700; margin-top: 2px;
}
.finding.ok .value   { color: var(--success); }
.finding.warn .value { color: #8A6500; }
.finding.fail .value { color: var(--destructive); }

/* ---------- Observations ---------- */
.observations { display: flex; flex-direction: column; gap: 6px; }
.observation {
  display: flex; gap: 8px; align-items: flex-start;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 10px;
  font-size: 9.5pt;
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
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius);
  margin-top: 12px;
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
.risk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.risk {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  background: var(--card);
  display: flex; align-items: center; gap: 10px;
  break-inside: avoid;
}
.risk .pill {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 10pt;
}
.risk.ok   .pill { background: #E8F4E9; color: var(--success); }
.risk.warn .pill { background: #FFF6DA; color: #8A6500; }
.risk.fail .pill { background: #FBE6E6; color: var(--destructive); }
.risk .label { font-size: 9pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.05em; }
.risk .value { font-size: 10.5pt; font-weight: 600; color: var(--fg); }

/* ---------- Valuation tile grid ---------- */
.val-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.val {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  background: linear-gradient(180deg, #FFFFFF, #FAFBFD);
}
.val .label { font-size: 8.5pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.05em; }
.val .value { font-size: 14pt; font-weight: 800; color: var(--primary); margin-top: 2px; }
.val.feature { background: var(--primary); color: #fff; border-color: var(--primary); }
.val.feature .label { color: #ffffffcc; }
.val.feature .value { color: #fff; font-size: 16pt; }

/* ---------- MOT items ---------- */
.mot-card { break-inside: avoid; }
.mot-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.mot-head .left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.advisory-list { margin: 6px 0 0; padding: 0; list-style: none; }
.advisory-list li {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 4px 0;
  border-top: 1px dashed var(--border);
  font-size: 9pt;
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

/* ---------- Write-off ---------- */
.writeoff-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
/* Mileage chart */
.mileage-chart { width: 100%; height: auto; max-height: 220px; display: block; }

.damage-diagram-wrap {
  display: flex; align-items: center; justify-content: center;
  background: var(--secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  min-height: 180px;
}
.damage-diagram { width: 100%; height: auto; max-height: 260px; }
/* Damage region states inside the SVG.
   Non-hit regions are transparent so the car silhouette shows through.
   Hit regions get a flat red wash with a darker outline. */
.damage-diagram .region { fill: transparent; stroke: transparent; }
.damage-diagram .region.hit { fill: #C72929; stroke: #7F1717; stroke-width: 1; }
.damage-diagram .region.hit-secondary { fill: #F5B400; stroke: #9C7300; stroke-width: 1; }

/* ---------- Equipment ---------- */
.equip-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.equip-cat {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 10px 12px;
  break-inside: avoid;
}
.equip-cat h4 {
  font-size: 9.5pt;
  color: var(--primary);
  margin-bottom: 6px;
  display: flex; align-items: center; gap: 6px;
}
.equip-cat ul {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 3px;
}
.equip-cat li {
  font-size: 9pt;
  display: flex; gap: 6px; align-items: baseline;
}
.equip-cat li::before {
  content: '';
  flex: 0 0 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
  transform: translateY(1px);
}
.equip-cat .desc { color: var(--muted-fg); }

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
