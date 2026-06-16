import { Router } from 'express';
import { generateReportPdf } from '../services/pdfService';
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
 */
router.post('/generate-car-check-pdf', async (req, res, next) => {
  try {
    const payload = req.body as ReportPayload;
    if (!payload || typeof payload !== 'object') {
      throw new HttpError(400, 'Request body must be a JSON object.');
    }

    const vrm =
      payload.registration_number ||
      payload.report_data?.registration_number ||
      payload.report_data?.vehicle?.vrm ||
      'vehicle';

    const requestedName = typeof req.query.filename === 'string' ? req.query.filename : '';
    const inline = req.query.inline === '1' || req.query.inline === 'true';

    const filename = safeFilename(requestedName || `motovo-car-check-${vrm}`);

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
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).end(pdf);
  } catch (err) {
    next(err);
  }
});

export default router;
