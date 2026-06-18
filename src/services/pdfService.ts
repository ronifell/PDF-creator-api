import { Browser, chromium } from 'playwright';
import { renderReportHtml, renderHeaderHtml, renderFooterHtml } from '../templates/report';
import { ReportPayload } from '../types/report';

let browserPromise: Promise<Browser> | null = null;

/**
 * Returns a singleton Chromium instance, launching it on first use. Re-launches
 * if the existing instance has disconnected.
 */
async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b.isConnected()) return b;
    } catch {
      // fall through and re-launch
    }
  }
  browserPromise = chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=medium',
    ],
  });
  return browserPromise;
}

export async function warmupBrowser(): Promise<void> {
  await getBrowser();
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch {
    // ignore
  } finally {
    browserPromise = null;
  }
}

/**
 * Render a Motovo car-check PDF from a report JSON payload.
 *
 * Uses Playwright's page.pdf() (Chromium) so the resulting PDF retains
 * selectable, searchable text — not a rasterised screenshot.
 */
export async function generateReportPdf(payload: ReportPayload): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1240, height: 1754 }, // ~A4 @ 150dpi
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    const html = renderReportHtml(payload);
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30_000 });

    // Wait for fonts & images to be ready (best-effort).
    // Use a generous per-image timeout because remote vehicle CDNs (e.g.
    // UKVehicleData) can be slow to respond on cold connections.
    await page.evaluate(async () => {
      const docAny = document as Document & { fonts?: { ready?: Promise<unknown> } };
      if (docAny.fonts?.ready) {
        await docAny.fonts.ready;
      }
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          const i = img as HTMLImageElement;
          if (i.complete && i.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const done = () => resolve();
            i.addEventListener('load', done, { once: true });
            i.addEventListener('error', done, { once: true });
            // 10s is well within the overall PDF generation budget but plenty
            // of time for slow CDNs.
            setTimeout(done, 10_000);
          });
        }),
      );
    });

    // We use CSS @page margins (preferCSSPageSize: true) so the body content
    // is positioned correctly. Playwright still needs explicit `margin` to
    // know where to render the header/footer templates — the values MUST
    // match the @page rule in styles.ts.
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: renderHeaderHtml(payload),
      footerTemplate: renderFooterHtml(payload),
      // Margins MUST stay in lockstep with the @page rule in styles.ts —
      // they reserve the strip where Chromium renders the header/footer
      // templates. See styles.ts for the geometry.
      margin: {
        top: '20mm',
        bottom: '14mm',
        left: '10mm',
        right: '10mm',
      },
      tagged: true,
    });

    return pdf;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}
