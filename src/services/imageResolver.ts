import fs from 'fs';
import path from 'path';
import type { APIRequestContext } from 'playwright';
import { ReportPayload } from '../types/report';

const IMAGE_REQUEST_HEADERS: Record<string, string> = {
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  Referer: 'https://www.ukvehicledata.co.uk/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

const SAMPLE_VEHICLE_ASSET = path.resolve(__dirname, '..', 'assets', 'sample-vehicle.jpg');

export function pickVehicleImageUrl(payload: ReportPayload): string | null {
  const url = payload.image_url || payload.report_data?.images?.primary;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed || null;
}

export async function resolveVehicleImageDataUrl(
  url: string,
  request: APIRequestContext,
): Promise<string | null> {
  if (url.startsWith('data:')) return url;

  try {
    const resp = await request.get(url, { headers: IMAGE_REQUEST_HEADERS, timeout: 15_000 });
    if (!resp.ok()) return null;

    const buf = await resp.body();
    if (!buf.length) return null;

    const ct = resp.headers()['content-type'] || 'image/jpeg';
    const mime = ct.split(';')[0].trim();
    if (!mime.startsWith('image/')) return null;

    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function readSampleVehicleAssetDataUrl(): string | null {
  try {
    if (!fs.existsSync(SAMPLE_VEHICLE_ASSET)) return null;
    const buf = fs.readFileSync(SAMPLE_VEHICLE_ASSET);
    if (buf.length < 10_000) return null;
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function withResolvedImage(payload: ReportPayload, dataUrl: string): ReportPayload {
  return {
    ...payload,
    image_url: dataUrl,
    report_data: payload.report_data
      ? {
          ...payload.report_data,
          images: {
            ...payload.report_data.images,
            primary: dataUrl,
          },
        }
      : payload.report_data,
  };
}

/**
 * Fetch the remote vehicle stock photo and inline it as a data URL so the
 * PDF never depends on CDN availability at print time.
 *
 * Falls back to a bundled sample asset in development when the remote URL
 * has expired (common with the static sample.json fixture).
 */
export async function enrichPayloadWithVehicleImage(
  payload: ReportPayload,
  request: APIRequestContext,
): Promise<ReportPayload> {
  const url = pickVehicleImageUrl(payload);
  if (!url) return payload;
  if (url.startsWith('data:')) return payload;

  const dataUrl = await resolveVehicleImageDataUrl(url, request);
  if (dataUrl) return withResolvedImage(payload, dataUrl);

  const sampleAsset = process.env.NODE_ENV !== 'production' ? readSampleVehicleAssetDataUrl() : null;
  if (sampleAsset) return withResolvedImage(payload, sampleAsset);

  return payload;
}
