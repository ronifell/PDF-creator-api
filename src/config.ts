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
};

export type AppConfig = typeof config;
