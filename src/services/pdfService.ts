import { randomUUID } from 'crypto';
import { Browser, chromium } from 'playwright';
import { enrichPayloadWithVehicleImage } from './imageResolver';
import { renderReportHtml, renderHeaderHtml, renderFooterHtml } from '../templates/report';
import { printPaginationScript } from '../templates/printPagination';
import { ReportPayload } from '../types/report';

let browserPromise: Promise<Browser> | null = null;

/**
 * Returns a singleton Chromium instance, launching it on first use. Re-launches
 * if the existing instance has disconnected.
 *
 * IMPORTANT: only the Browser is reused. Each call to `generateReportPdf`
 * spins up a completely fresh BrowserContext (its own cookie jar, cache,
 * storage, request context and pages). No state can carry between requests
 * — see the "request isolation" comment in `generateReportPdf` below.
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
      // Explicitly disable the HTTP cache so an image resolved during one
      // request cannot be served from disk for a completely unrelated
      // request. Prevents the "wrong vehicle photo" class of bug.
      '--disk-cache-size=0',
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
 * VRM extracted from the payload. Used both for logging and as a defensive
 * assertion — if for any reason the payload argument were somehow shadowed
 * by state from another request, the mismatched VRM would surface loudly.
 */
export function payloadVrm(payload: ReportPayload): string {
  return (
    payload.registration_number ||
    payload.report_data?.registration_number ||
    payload.report_data?.vehicle?.vrm ||
    ''
  );
}

/**
 * Render a Motovo car-check PDF from a report JSON payload.
 *
 * Request isolation guarantees (each generation is completely independent):
 *
 *   1. A NEW BrowserContext is created for every call. Cookies, cache,
 *      IndexedDB, localStorage and the APIRequestContext are all fresh.
 *   2. A NEW Page is created inside that context. It's closed before we
 *      return, and the whole context is disposed of in `finally`.
 *   3. The Chromium disk cache is disabled at browser-launch time
 *      (`--disk-cache-size=0`) so a CDN image resolved for VRM A cannot
 *      be replayed from disk for VRM B.
 *   4. `enrichPayloadWithVehicleImage` returns a NEW payload object — it
 *      never mutates the argument and never reads from any module-level
 *      state.
 *   5. The rendered HTML is derived exclusively from that per-request
 *      payload; the template functions themselves are pure.
 */
export async function generateReportPdf(payload: ReportPayload): Promise<Buffer> {
  const browser = await getBrowser();
  const requestId = randomUUID();
  const vrm = payloadVrm(payload);

  const context = await browser.newContext({
    viewport: { width: 1240, height: 1754 }, // ~A4 @ 150dpi
    deviceScaleFactor: 2,
    // Advertise a per-request identifier so any CDN-side caching / logging
    // can distinguish parallel calls, and so that if a request ID ever
    // appears in a log the operator can trace it to a specific generation.
    extraHTTPHeaders: {
      Referer: 'https://www.ukvehicledata.co.uk/',
      'X-Motovo-Request-Id': requestId,
    },
    // Do not persist storage across contexts.
    storageState: undefined,
  });
  const page = await context.newPage();

  try {
    const enriched = await enrichPayloadWithVehicleImage(payload);

    // Defensive check — if the enriched payload ever came back for a
    // different VRM than the caller supplied, refuse to render. This
    // guards against future refactors accidentally introducing shared
    // state between requests.
    const enrichedVrm = payloadVrm(enriched);
    if (vrm && enrichedVrm && vrm !== enrichedVrm) {
      throw new Error(
        `Payload isolation violated: request VRM "${vrm}" but enriched payload has "${enrichedVrm}".`,
      );
    }

    const html = renderReportHtml(enriched);
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

    await page.emulateMedia({ media: 'print' });
    await page.evaluate(printPaginationScript());

    // We use CSS @page margins (preferCSSPageSize: true) so the body content
    // is positioned correctly. Playwright still needs explicit `margin` to
    // know where to render the header/footer templates — the values MUST
    // match the @page rule in styles.ts.
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: renderHeaderHtml(enriched),
      footerTemplate: renderFooterHtml(enriched),
      // Margins MUST stay in lockstep with the @page rule in styles.ts —
      // they reserve the strip where Chromium renders the header/footer
      // templates. See styles.ts for the geometry.
      margin: {
        top: '22mm',
        bottom: '16mm',
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
