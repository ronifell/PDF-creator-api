import { createApp } from './server';
import { config } from './config';
import { closeBrowser, warmupBrowser } from './services/pdfService';

const app = createApp();

const server = app.listen(config.port, async () => {
  // eslint-disable-next-line no-console
  console.log(`[motovo-pdf] listening on http://localhost:${config.port} (${config.nodeEnv})`);
  if (config.apiKeys.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[motovo-pdf] WARNING: no API_KEYS configured; the service will reject every request.');
  }
  // Fire-and-forget warmup so the first user request isn't slowed by browser startup.
  warmupBrowser().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[motovo-pdf] Browser warmup failed:', err);
  });
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[motovo-pdf] received ${signal}, shutting down...`);
  server.close(async () => {
    await closeBrowser();
    process.exit(0);
  });
  // Force exit after 10s if not done.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
