/**
 * Generate a sample PDF from the repository's sample.json without going through
 * the HTTP server. Useful for design iteration and CI smoke tests.
 *
 *   npx ts-node-dev --transpile-only scripts/generate-sample.ts
 *
 * Output: ./out/sample.pdf
 */
import { promises as fs } from 'fs';
import path from 'path';
import { generateReportPdf, closeBrowser } from '../src/services/pdfService';

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const samplePath = path.join(repoRoot, 'sample.json');
  const outDir = path.join(__dirname, '..', 'out');
  const outPath = path.join(outDir, 'sample.pdf');

  await fs.mkdir(outDir, { recursive: true });
  const raw = await fs.readFile(samplePath, 'utf-8');
  const data = JSON.parse(raw);

  const started = Date.now();
  const pdf = await generateReportPdf(data);
  await fs.writeFile(outPath, pdf);
  console.log(`Wrote ${outPath} (${(pdf.length / 1024).toFixed(1)} KB) in ${Date.now() - started}ms`);

  await closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
