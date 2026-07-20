/** Reproduce valuation tiles landing at a page break (A1EKY-style layout). */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { generateReportPdf, closeBrowser } from '../src/services/pdfService';
import type { ReportPayload } from '../types/report';

async function main() {
  const payload = JSON.parse(
    readFileSync(path.join(__dirname, '..', '..', 'sample.json'), 'utf8'),
  ) as ReportPayload;
  const mot = payload.report_data?.mot;
  if (!mot?.tests?.length) throw new Error('sample.json needs MOT tests');

  payload.registration_number = 'A1EKY';
  payload.report_data = {
    ...payload.report_data!,
    registration_number: 'A1EKY',
    mot: { ...mot, tests: Array.from({ length: 3 }, () => mot.tests).flat() },
  };

  const outDir = path.join(__dirname, '..', 'out');
  mkdirSync(outDir, { recursive: true });
  const pdf = await generateReportPdf(payload);
  writeFileSync(path.join(outDir, 'pagebreak-valuation.pdf'), pdf);
  console.log('Wrote pagebreak-valuation.pdf');
  await closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
