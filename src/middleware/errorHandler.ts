import { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: 'request_error',
      message: err.message,
      details: err.details,
    });
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  // eslint-disable-next-line no-console
  console.error('[pdf-service] Unhandled error:', err);
  return res.status(500).json({ error: 'internal_error', message });
}
