import { generateReportPdf, closeBrowser } from '../src/services/pdfService';
import * as fs from 'fs';
import { execSync } from 'child_process';

async function main() {
  const vrms = process.argv.slice(2);
  if (!vrms.length) throw new Error('usage: regen-ones <VRM>...');
  for (const vrm of vrms) {
    const p = JSON.parse(fs.readFileSync(`../test/motovo-sample-report-${vrm}.json`, 'utf8'));
    const pdf = await generateReportPdf(p);
    const out = `out/test-batch/motovo-car-check-${vrm}.pdf`;
    fs.writeFileSync(out, pdf);
    console.log('wrote', out, pdf.length, 'bytes');
    execSync(`node scripts/pdf-to-png.mjs "${out}" "out/test-batch/png/${vrm}" page`, {
      stdio: 'inherit',
    });
    fs.copyFileSync(out, `../test/motovo-car-check-${vrm}.pdf`);
  }
  await closeBrowser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
