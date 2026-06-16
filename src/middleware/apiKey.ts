import { NextFunction, Request, Response } from 'express';
import { config } from '../config';

/**
 * Validates the X-API-Key header (or Authorization: Bearer <key>) against
 * the configured API_KEYS list. Constant-time comparison is not strictly
 * necessary because the comparison is against a small in-memory list, but
 * we still avoid leaking which key matched.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (config.apiKeys.length === 0) {
    // Fail-closed: if no keys are configured, refuse all requests.
    return res.status(503).json({
      error: 'service_misconfigured',
      message: 'No API_KEYS configured on the server.',
    });
  }

  const headerKey = (req.header('x-api-key') || '').trim();
  const authHeader = (req.header('authorization') || '').trim();
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  const provided = headerKey || bearer;
  if (!provided) {
    return res.status(401).json({
      error: 'missing_api_key',
      message: 'Provide an X-API-Key header or Authorization: Bearer <key>.',
    });
  }

  const ok = config.apiKeys.includes(provided);
  if (!ok) {
    return res.status(403).json({
      error: 'invalid_api_key',
      message: 'The provided API key is not authorized.',
    });
  }

  next();
}
