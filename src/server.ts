import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { apiKeyAuth } from './middleware/apiKey';
import { errorHandler } from './middleware/errorHandler';
import pdfRoutes from './routes/pdf';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
      exposedHeaders: ['Content-Disposition', 'X-Generation-Time-Ms'],
      maxAge: 86400,
    }),
  );
  app.use(express.json({ limit: `${config.maxPayloadMb}mb` }));
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Public
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), env: config.nodeEnv });
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Motovo PDF Service',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        generate: 'POST /generate-car-check-pdf (auth required)',
      },
    });
  });

  // Authenticated routes
  app.use(apiKeyAuth);
  app.use(pdfRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` });
  });

  app.use(errorHandler);

  return app;
}
