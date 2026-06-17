/**
 * One-off verification: prove the hero "VIN row" renders when the payload
 * carries a real-looking VIN. Reads sample.json, swaps the VIN field, and
 * writes the PDF to out/sample-with-vin.pdf.
 */
import * as fs from 'fs';
import * as path from 'path';
import { closeBrowser, generateReportPdf } from '../src/services/pdfService';

async function main() {
  const samplePath = path.resolve(__dirname, '..', '..', 'sample.json');
  const outPath = path.resolve(__dirname, '..', 'out', 'sample-with-vin.pdf');

  const payload = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
  payload.report_data.vehicle.vin = 'WBANV9C58DC123456'; // synthetic 17-char VIN

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const pdf = await generateReportPdf(payload);
  fs.writeFileSync(outPath, pdf);
  console.log(`Wrote ${outPath} (${(pdf.length / 1024).toFixed(1)} KB)`);
  await closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
