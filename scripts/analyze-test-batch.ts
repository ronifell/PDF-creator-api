/**
 * Regenerate all JSON payloads in ../test and render each page to PNG for QA.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { generateReportPdf, closeBrowser } from '../src/services/pdfService';
import type { ReportPayload } from '../types/report';
import { execSync } from 'child_process';

const TEST_DIR = path.join(__dirname, '..', '..', 'test');
const OUT_DIR = path.join(__dirname, '..', 'out', 'test-batch');

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = (await fs.readdir(TEST_DIR)).filter((f) => f.endsWith('.json')).sort();

  for (const file of files) {
    const vrm = file.match(/-([A-Z0-9]+)\.json$/i)?.[1] || file.replace('.json', '');
    const payload = JSON.parse(await fs.readFile(path.join(TEST_DIR, file), 'utf8')) as ReportPayload;
    const pdfPath = path.join(OUT_DIR, `motovo-car-check-${vrm}.pdf`);
    const pngDir = path.join(OUT_DIR, 'png', vrm);

    const pdf = await generateReportPdf(payload);
    await fs.writeFile(pdfPath, pdf);
    console.log(`PDF ${vrm}: ${(pdf.length / 1024).toFixed(0)} KB`);

    execSync(
      `node scripts/pdf-to-png.mjs "${pdfPath}" "${pngDir}" page`,
      { cwd: path.join(__dirname, '..'), stdio: 'inherit' },
    );
  }

  await closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
