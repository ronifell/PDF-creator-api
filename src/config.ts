import dotenv from 'dotenv';

dotenv.config();

function parseList(v: string | undefined): string[] {
  return (v || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKeys: parseList(process.env.API_KEYS),
  maxPayloadMb: Number(process.env.MAX_PAYLOAD_MB) || 5,
  corsOrigins: parseList(process.env.CORS_ORIGINS).length
    ? parseList(process.env.CORS_ORIGINS)
    : ['*'],
  // Optional bearer token forwarded when fetching UKVD image URLs. UKVD's
  // vehicleimages CDN rejects anonymous requests with 401, so without this
  // token no vehicle photos will resolve. Real backends should set this to
  // the same auth string used to obtain the report data itself.
  ukvdAuthToken: process.env.UKVD_AUTH_TOKEN || process.env.VEHICLE_IMAGE_AUTH || '',
};

export type AppConfig = typeof config;
