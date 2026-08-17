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
  --border-strong: #A8B2C0;
  --surface-muted: #DDE4EC;
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
.section { margin-top: 12px; }
.section.section--compact { margin-top: 9px; }
.section.section--compact .section-title { margin-bottom: 6px; padding-bottom: 4px; }
/* Keep the whole section on the next page when only a sliver of space
   remains — prevents blocks like Risk Checks from stranding at a page bottom. */
.section--fit-page {
  break-inside: avoid;
  page-break-inside: avoid;
}
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
  break-inside: auto;
  page-break-inside: auto;
}
.card.keep-together,
.card.card--keep {
  break-inside: avoid;
  page-break-inside: avoid;
}
.card.card--flow {
  break-inside: auto;
  page-break-inside: auto;
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

/* ---------- Cover (premium Motovo banner) ---------- */
.cover {
  position: relative;
  padding: 18px 20px 14px;
  border-radius: 16px;
  background:
    radial-gradient(ellipse 70% 90% at 50% 45%, rgba(55, 105, 155, 0.42) 0%, transparent 68%),
    linear-gradient(160deg, #0B2038 0%, #12324F 42%, #0E2740 100%);
  color: #FFFFFF;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}
.cover .cover-bar {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px;
  position: relative;
  z-index: 2;
}
.cover .brand {
  display: inline-flex; align-items: center; gap: 11px;
}
.cover .brand .brand-logo {
  width: 32px; height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
}
.cover .brand .brand-text {
  display: flex; flex-direction: column; line-height: 1.05;
}
.cover .brand .brand-name {
  font-weight: 800; font-size: 15pt; letter-spacing: 0.02em;
}
.cover .brand .brand-sub {
  opacity: 0.78; font-size: 8.5pt; margin-top: 4px; font-weight: 400;
}
.cover .plate-wrap {
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
}
.cover .plate-label {
  font-size: 7pt; opacity: 0.72; letter-spacing: 0.14em; text-transform: uppercase;
  font-weight: 600;
}

.cover .cover-body {
  display: grid;
  grid-template-columns: 1.05fr 1.25fr 1.05fr;
  gap: 12px 16px;
  align-items: center;
  margin-top: 14px;
  min-height: 168px;
  position: relative;
  z-index: 1;
}
.cover .cover-body--no-image {
  grid-template-columns: 1.4fr 1fr;
  min-height: 128px;
}

.cover .cover-identity {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  padding-bottom: 2px;
}
.cover h1 {
  color: #FFFFFF;
  font-size: 20pt;
  line-height: 1.05;
  letter-spacing: -0.015em;
  text-transform: uppercase;
  font-weight: 800;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.cover h1 .cover-make,
.cover h1 .cover-model {
  display: block;
}
.cover .cover-trim {
  font-size: 13.5pt;
  font-weight: 700;
  color: #6EB6E8;
  letter-spacing: 0.01em;
  margin-top: 2px;
}
.cover .cover-quick-stats {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 10.5pt;
  font-weight: 600;
  color: rgba(255,255,255,0.95);
}
.cover .cover-quick {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.cover .cover-quick.unavailable { opacity: 0.75; font-weight: 500; }
.cover .cover-quick-sep {
  width: 1px;
  height: 16px;
  background: rgba(255,255,255,0.32);
}
.cover .cover-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.95;
  color: #FFFFFF;
}
.cover .cover-identity .vin-row {
  margin-top: 10px;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 6px;
  padding: 2px 8px;
  align-self: flex-start;
}
.cover .vin-row .vin-label {
  font-size: 7pt; opacity: 0.7; letter-spacing: 0.12em; text-transform: uppercase;
}
.cover .vin-row .vin-value {
  font-size: 8.5pt; font-weight: 700; letter-spacing: 0.04em;
  color: #FFFFFF;
}

.cover .cover-vehicle {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 168px;
  min-width: 0;
}
.cover .cover-vehicle-img {
  display: block;
  max-width: 100%;
  max-height: 168px;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center bottom;
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.4));
}

.cover .cover-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.cover .cover-spec {
  display: flex;
  align-items: center;
  gap: 11px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 10px;
  padding: 12px 13px;
  min-height: 62px;
}
.cover .cover-spec .cover-icon {
  width: 26px;
  height: 26px;
  margin-top: 0;
  opacity: 0.96;
  color: #FFFFFF;
  flex-shrink: 0;
}
.cover .cover-spec-text { min-width: 0; flex: 1; }
.cover .cover-spec-label {
  font-size: 6.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(190, 210, 230, 0.85);
  line-height: 1.2;
  font-weight: 600;
}
.cover .cover-spec-value {
  font-size: 11pt;
  font-weight: 700;
  margin-top: 2px;
  line-height: 1.2;
  word-break: break-word;
  color: #FFFFFF;
}

.cover .cover-meta {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.12);
  font-size: 8pt;
  color: rgba(200, 215, 230, 0.85);
  position: relative;
  z-index: 2;
}

/* Page-break helper — forces the next section onto a new printed page. */
.section--page-break {
  break-before: page;
  page-break-before: always;
}

/* Legacy hero image block kept for any non-cover uses. */
.vehicle-image-block {
  position: relative;
  width: 100%;
  height: 210px;
  background: var(--secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 2px 18px 18px;
  box-sizing: border-box;
  break-inside: avoid;
  page-break-inside: avoid;
}
.vehicle-image-block img {
  display: block;
  width: auto;
  height: auto;
  max-width: 96%;
  max-height: 100%;
  object-fit: scale-down;
  object-position: center center;
}

/* UK number plate */
.plate {
  display: inline-block;
  background: #F5B400;
  color: #111827;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-weight: 800;
  letter-spacing: 0.1em;
  font-size: 15pt;
  padding: 5px 14px;
  border-radius: 6px;
  border: 2px solid #111827;
  box-shadow: 0 1px 0 #00000022;
}
.plate.sm { font-size: 10pt; padding: 2px 6px; border-width: 1.5px; }

/* ---------- Findings cards ----------
   The Key Findings tiles get a touch more padding and bigger value type
   than ordinary cards because they are the visual anchor of page 1. */
.findings-grid-block {
  /* Row-level break rules live on .findings-table-row — do not lock the
     whole findings grid onto one page (that left page 1 half empty). */
}
.findings-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.findings-table-row {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.findings-cell {
  vertical-align: top;
  width: 25%;
  padding: 6px;
}
.findings-cell--empty { padding: 0; }
.finding {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 13px 15px;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
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
  display: flex; align-items: flex-start; gap: 12px;
  padding: 11px 14px;
  border-radius: var(--radius);
  margin-top: 10px;
  font-size: 10pt;
  line-height: 1.45;
  break-inside: avoid;
  page-break-inside: avoid;
}
.status-banner .dot { width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0; margin-top: 3px; }
.status-banner.ok   { background: #E8F4E9; color: #1E5A22; border: 1px solid #BFDFC2; }
.status-banner.ok .dot   { background: var(--success); }
.status-banner.warn { background: #FFF6DA; color: #6B4F00; border: 1px solid #F2DA92; }
.status-banner.warn .dot { background: var(--accent); }
.status-banner.fail { background: #FBE6E6; color: #7E1B1B; border: 1px solid #EFB6B6; }
.status-banner.fail .dot { background: var(--destructive); }
/* Strongest tone reserved for stolen / scrapped / Certificate of
   Destruction. Deep solid red on the border and pill dot so the buyer
   can't miss it, even skimming past a page of amber warnings. */
.status-banner.critical {
  background: var(--destructive);
  color: #FFFFFF;
  border: 2px solid #7E1B1B;
  padding: 14px 18px 16px;
  font-size: 11pt;
  box-shadow: 0 2px 4px rgba(199, 41, 41, 0.25);
}
.status-banner.critical .dot {
  background: #FFFFFF;
  width: 12px; height: 12px;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}
.status-banner.critical strong { color: #FFFFFF; letter-spacing: 0.02em; text-transform: uppercase; }
.status-banner.critical .status-banner-sub {
  margin-top: 3px;
  font-size: 9.5pt;
  font-weight: 500;
  color: #FFE9E9;
}

/* ---------- Risk check grid ---------- */
.risk-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.risk-table-row {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.risk-cell {
  vertical-align: top;
  width: 33.33%;
  padding: 3px;
}
.risk-cell--empty { padding: 0; }
.risk {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 9px;
  background: var(--card);
  display: flex; align-items: center; gap: 8px;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.risk.ok {
  background: #F4FAF5;
  border-color: #C9E0CC;
}
.risk.warn {
  background: #FFFBF0;
  border-color: #F0DFA0;
}
.risk.fail {
  background: #FDF5F5;
  border-color: #EBC0C0;
}
.risk .pill {
  width: 22px; height: 22px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
  background: transparent;
}
.risk .pill .pill-svg {
  display: block;
  width: 16px;
  height: 16px;
}
.risk.ok   .pill { color: var(--success); }
.risk.warn .pill { color: #8A6500; }
.risk.fail .pill { color: var(--destructive); }
.risk .label { font-size: 7pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.2; }
.risk .value { font-size: 9pt; font-weight: 600; color: var(--fg); margin-top: 1px; line-height: 1.2; }
.section--tight { margin-top: 8px; }
.section--tight .section-title { margin-bottom: 6px; padding-bottom: 4px; }

/* ---------- Valuation tile grid ----------
   Print-safe table layout — CSS grid fragments across pages in Chromium
   PDF (row labels on page N, values on page N+1). Each <tr> and the
   outer wrapper use break-inside:avoid so rows stay atomic. */
.val-grid-block,
.tile-grid-block,
.cost-grid-block,
.risk-grid-block,
.mot-summary-block {
  /* Outer wrapper is allowed to split across pages; atomicity is enforced
     per table row via .val-table-row / .mot-table-row etc. */
}
.val-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  border-spacing: 0;
}
.val-table-row {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.val-cell {
  vertical-align: top;
  width: 25%;
  padding: 5px;
}
.val-cell--empty {
  padding: 0;
  border: none;
}
.val {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 11px 13px;
  background: #FAFBFD;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.val .label { font-size: 8.25pt; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.05em; }
.val .value { font-size: 13pt; font-weight: 800; color: var(--primary); margin-top: 3px; }
.val.feature { background: var(--primary); color: #fff; border-color: var(--primary); }
.val.feature .label { color: #ffffffcc; }
.val.feature .value { color: #fff; font-size: 15pt; }

/* ---------- MOT ---------- */
.mot-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.mot-table-row {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.mot-cell {
  vertical-align: top;
  width: 25%;
  padding: 5px;
}
.mot-cell--empty { padding: 0; }
.mot-stat {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 11px 13px;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
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
.mot-card {
  break-inside: auto;
  page-break-inside: auto;
  margin-top: 13px;
  padding: 14px 16px;
}
.mot-card--compact {
  padding: 10px 14px;
  margin-top: 8px;
}
.mot-card--compact .mot-head {
  margin-bottom: 0;
}
.mot-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
  break-after: avoid; page-break-after: avoid;
}
.mot-head .left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.advisory-list { margin: 8px 0 0; padding: 0; list-style: none; }
.advisory-list li {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 7px 0;
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
.cost-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.cost-table-row {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.cost-cell {
  vertical-align: top;
  width: 33.33%;
  padding: 5px;
}
.cost-cell--empty { padding: 0; }
/* Stretch each .cost box to the full cell height so all tiles in a row
   share the same height regardless of content length. */
.cost-table-row .cost-cell { height: 1px; }
.cost-table-row .cost-cell .cost { height: 100%; box-sizing: border-box; }
.cost {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #FAFBFD;
  padding: 11px 13px;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
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

/* "Lead" group: keep the section title with at least one content row.
   Do NOT treat the entire lead block (title + banners + summary grids) as
   atomic — that was leaving large blank gaps at page bottoms. */
.section-lead {
  break-inside: auto;
  page-break-inside: auto;
}
.section-lead .section-title {
  break-after: avoid;
  page-break-after: avoid;
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
/* Equipment section title must be allowed to sit above a partial page of
   cards — avoid-page here was pushing the whole Manufacturer Options block
   onto the next page and leaving valuation pages half empty. */
.section-title.section-title--flow {
  break-after: auto;
  page-break-after: auto;
}

/* ---------- Plate history ----------
   Compact cherished-transfer status row, then one card per previous plate
   (mirrors the Motovo online "Previous Plate Changes" layout). */
.plate-history {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 13px;
  background: var(--card);
  break-inside: auto;
  page-break-inside: auto;
}
.plate-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
}
.plate-row-label {
  font-size: 9pt; color: var(--muted-fg);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.plate-row-value { display: inline-flex; align-items: center; gap: 8px; }

.plate-change-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.plate-change-heading {
  font-size: 10pt;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.01em;
}
.plate-change-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--secondary);
  padding: 10px 13px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.plate-change-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.plate-change-label {
  font-size: 8pt;
  font-weight: 600;
  color: var(--muted-fg);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.plate-change-date {
  margin-top: 6px;
  font-size: 9pt;
  color: var(--fg);
}
.plate-change-became {
  margin-top: 6px;
  font-size: 8.5pt;
  color: var(--muted-fg);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* ---------- Equipment ---------- */
/* Manufacturer Options Reference:
   - equip-note: quiet disclaimer strip explaining the data provenance (the
     list is possible options for the trim, not confirmed-fitted).
   - equip-group: heading strip for Standard vs. Optional so the two lists
     read as sibling sub-sections rather than one blended grid. */
.equip-note {
  margin-bottom: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius);
  background: #FFFDF3;
  color: #6B4F00;
  font-size: 8.5pt;
  line-height: 1.4;
  break-inside: avoid;
  page-break-inside: avoid;
}
.equip-group + .equip-group {
  margin-top: 12px;
}
.equip-group-title {
  font-size: 10pt;
  color: var(--primary);
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 6px;
  padding-bottom: 3px;
  border-bottom: 1px dashed var(--border);
  /* Avoid break-after:avoid here — pairing it with tall first rows makes
     Chromium push the whole Optional block to the next page and leave an
     empty band under Standard equipment. */
}
.equip-group-count { color: var(--muted-fg); font-weight: 500; font-size: 9pt; }
/* 2-column rows — each .equip-grid-row is an explicit left/right pair so
   Chromium keeps both cards at equal height even when the grid breaks across
   printed pages (auto-placed CSS grid loses row pairing in PDF output). */
.equip-grid {
  display: block;
}
.equip-row-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  border-spacing: 0;
  margin-bottom: 0;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.equip-row-table:last-child {
  margin-bottom: 0;
}
.equip-row-table tr.equip-grid-row {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.equip-cell {
  width: 50%;
  vertical-align: top;
  padding: 5px;
  border: none;
  background: transparent;
  box-sizing: border-box;
}
.equip-cell-card {
  height: 100%;
  padding: 12px 15px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--card);
  box-sizing: border-box;
}
.equip-row-table--solo .equip-cell {
  width: 100%;
}
.equip-cell .equip-cat {
  border: none;
  padding: 0;
  background: transparent;
  border-radius: 0;
  height: auto;
  min-height: 0;
}
/* Legacy div-based rows (if any remain) */
.equip-grid-row {
  display: table;
  table-layout: fixed;
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  margin-bottom: 0;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.equip-grid-row:last-child {
  margin-bottom: 0;
}
.equip-grid-row > .equip-cat {
  display: table-cell;
  width: 50%;
  vertical-align: top;
}
.equip-grid-row--solo {
  display: block;
}
.equip-grid-row--solo > .equip-cat {
  display: block;
  width: 100%;
}
.equip-cat {
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--card);
  padding: 12px 15px;
  break-inside: avoid;
  page-break-inside: avoid;
  box-sizing: border-box;
  /* Do NOT set display:flex here — it overrides table-cell on paired rows
     and reintroduces the sawtooth height mismatch. */
.equip-cat h4 {
  font-size: 9.75pt;
  color: var(--primary);
  margin-bottom: 0;
  display: flex; align-items: center; gap: 6px;
}
.equip-cat-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--border);
  break-inside: avoid;
  page-break-inside: avoid;
}
.equip-ref-chip {
  font-size: 7pt;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8A6500;
  background: #FFF6DA;
  border: 1px solid #F2DA92;
  border-radius: 999px;
  padding: 1px 8px;
  white-space: nowrap;
}
.equip-cat ul,
.equip-list {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 2px;
}
.equip-list--cols {
  display: block;
  column-count: 2;
  column-gap: 14px;
}
.equip-list--cols li {
  break-inside: avoid;
  page-break-inside: avoid;
  -webkit-column-break-inside: avoid;
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
   Legal notice rendered as a bordered, muted box after the equipment grid.
   printPagination.ts moves the whole block to the next page when it would
   otherwise straddle a page break. */
.disclaimer-strip {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface-muted);
  color: var(--muted-fg);
  font-size: 8pt;
  line-height: 1.45;
  /* Prevent Chromium from rendering this as a multi-page "fragment"
     without the full box chrome (border/background). */
  display: inline-block;
  width: 100%;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
  -webkit-column-break-inside: avoid;
  box-sizing: border-box;
}
.disclaimer-strip__title {
  font-size: 9pt;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 6px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.disclaimer-strip__body {
  margin: 0;
  break-inside: avoid;
  page-break-inside: avoid;
}

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
.keep-together { break-inside: avoid; page-break-inside: avoid; }
.page-break { break-before: page; page-break-before: always; }
hr.soft { border: none; border-top: 1px solid var(--border); margin: 8px 0; }

/* ---------- Header / Footer placeholders are injected by Playwright ---------- */
`;
