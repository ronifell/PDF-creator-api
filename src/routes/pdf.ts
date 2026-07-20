import { Router } from 'express';
import { generateReportPdf, payloadVrm } from '../services/pdfService';
import { ReportPayload } from '../types/report';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

function safeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64) || 'vehicle-report';
}

/**
 * POST /generate-car-check-pdf
 * Body: full Motovo vehicle-report JSON.
 * Returns: application/pdf binary.
 *
 * Query params (optional):
 *   - filename: override the suggested download filename (without extension).
 *   - inline=1: return as inline disposition (for in-browser preview).
 *
 * Request isolation:
 *   - Every generation uses a fresh Playwright BrowserContext.
 *   - The filename is derived from the CURRENT payload's VRM only.
 *   - We echo the VRM back in the `X-Motovo-Vrm` response header so callers
 *     can sanity-check that the returned PDF matches the request they made
 *     (in the wild we saw one PDF get delivered under a different VRM's
 *     filename — this makes that class of bug detectable by any client).
 */
router.post('/generate-car-check-pdf', async (req, res, next) => {
  try {
    const payload = req.body as ReportPayload;
    if (!payload || typeof payload !== 'object') {
      throw new HttpError(400, 'Request body must be a JSON object.');
    }

    const vrm = payloadVrm(payload) || 'vehicle';

    const requestedName = typeof req.query.filename === 'string' ? req.query.filename : '';
    const inline = req.query.inline === '1' || req.query.inline === 'true';

    // If a caller supplies a `filename` override we still enforce that it
    // contains the actual VRM from the payload. This makes it impossible for
    // a stale/mistyped query parameter to produce a PDF filename that
    // disagrees with the vehicle inside the PDF.
    const baseName = requestedName
      ? (requestedName.toUpperCase().includes(vrm.toUpperCase())
          ? requestedName
          : `${requestedName}-${vrm}`)
      : `motovo-car-check-${vrm}`;
    const filename = safeFilename(baseName);

    const start = Date.now();
    const pdf = await generateReportPdf(payload);
    const elapsed = Date.now() - start;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${filename}.pdf"`,
    );
    res.setHeader('X-Generation-Time-Ms', String(elapsed));
    res.setHeader('X-Motovo-Vrm', vrm);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).end(pdf);
  } catch (err) {
    next(err);
  }
});

export default router;
