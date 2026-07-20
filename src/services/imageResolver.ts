import { ReportPayload } from '../types/report';
import { config } from '../config';

function buildImageHeaders(explicitAuth?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    Referer: 'https://www.ukvehicledata.co.uk/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  const token = (explicitAuth || config.ukvdAuthToken || '').trim();
  if (token) {
    headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  }
  return headers;
}

/**
 * Known "no image available" placeholder URL fragments used by upstream
 * vehicle data providers. When the API doesn't have a real photo for a VRM
 * it sometimes returns a URL pointing at a placeholder graphic (silhouette,
 * "image unavailable" watermark, covered-car stock image etc.) rather than a
 * 404. We treat any of these as if the image were missing so the report
 * simply hides the photo card instead of embedding the placeholder.
 *
 * Extend this list whenever a new placeholder surfaces in QA — the check is
 * case-insensitive and substring-based.
 */
const PLACEHOLDER_URL_FRAGMENTS: readonly string[] = [
  'no-image',
  'noimage',
  'not-available',
  'notavailable',
  'placeholder',
  'unavailable',
  'default-vehicle',
  'default_vehicle',
  'default-image',
  'coming-soon',
  'comingsoon',
  'covered-car',
  'covered_car',
  'covered-vehicle',
  'silhouette',
  'stock-photo',
  'stock_photo',
  'generic-vehicle',
  'genericvehicle',
  '/missing',
];

/**
 * A resolved data URL is only considered a "real" vehicle photo if the
 * decoded image payload is at least this large. UKVD's placeholder gifs are
 * a few hundred bytes; genuine JPEGs from the CDN are 20-200 KB. This lets us
 * catch placeholders even when they slip through the URL heuristic above.
 */
const MIN_IMAGE_BYTES = 4 * 1024;

const IMAGE_FETCH_TIMEOUT_MS = 15_000;

function isLikelyPlaceholderUrl(url: string): boolean {
  const lc = url.toLowerCase();
  return PLACEHOLDER_URL_FRAGMENTS.some((f) => lc.includes(f));
}

export function pickVehicleImageUrl(payload: ReportPayload): string | null {
  const url = payload.image_url || payload.report_data?.images?.primary;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isLikelyPlaceholderUrl(trimmed)) return null;
  return trimmed;
}

/**
 * Fetch a remote vehicle image and inline it as a data URL.
 *
 * Uses Node's native `fetch` rather than Playwright's APIRequestContext.
 * Playwright's request client can throw `Cannot read properties of undefined
 * (reading 'CN')` inside captureSecurityDetails for some UKVD CDN TLS
 * responses — that crash escaped the old try/catch and killed PDF generation.
 */
export async function resolveVehicleImageDataUrl(
  url: string,
  authToken?: string,
): Promise<string | null> {
  if (url.startsWith('data:')) return url;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      headers: buildImageHeaders(authToken),
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        console.warn(
          `[imageResolver] Vehicle image fetch returned ${resp.status} for ${url}. ` +
            `Set UKVD_AUTH_TOKEN (env) or pass an auth token per-request to embed vehicle photos.`,
        );
      } else {
        console.warn(`[imageResolver] Vehicle image fetch failed: ${resp.status} for ${url}`);
      }
      return null;
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < MIN_IMAGE_BYTES) return null;

    const ct = resp.headers.get('content-type') || 'image/jpeg';
    const mime = ct.split(';')[0].trim();
    if (!mime.startsWith('image/')) return null;

    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn(`[imageResolver] Vehicle image fetch threw for ${url}:`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Return a NEW payload with the vehicle image URL either replaced with a
 * successfully-resolved data URL, or cleared entirely.
 *
 * This function never mutates the input and never carries state between
 * requests. Every generation starts with the URL that lives inside the
 * payload we were given — no bundled fallback, no cache. This is critical
 * because a leftover fallback caused the wrong vehicle photo to appear on
 * completely unrelated reports.
 */
function withResolvedImage(payload: ReportPayload, dataUrl: string | null): ReportPayload {
  return {
    ...payload,
    image_url: dataUrl || undefined,
    report_data: payload.report_data
      ? {
          ...payload.report_data,
          images: {
            ...payload.report_data.images,
            primary: dataUrl || undefined,
            // Also strip any leftover URLs in the `all` list so the template
            // can't accidentally reach past `primary` to pull a placeholder.
            all: dataUrl ? [dataUrl] : undefined,
          },
        }
      : payload.report_data,
  };
}

/**
 * Fetch the remote vehicle stock photo and inline it as a data URL so the
 * PDF never depends on CDN availability at print time.
 *
 * Strict rules (regressions from an earlier build meant these needed
 * codifying):
 *
 *   1. The only image URL considered is the one on THIS payload
 *      (`image_url` or `report_data.images.primary`). Nothing is cached
 *      across requests.
 *   2. If the URL matches a known placeholder pattern (silhouette,
 *      covered-car, coming-soon etc.) we treat it as absent.
 *   3. If the CDN fetch fails, times out, returns non-2xx, returns a
 *      non-image MIME, or returns fewer than ~4 KB of body (placeholder
 *      gifs), we treat the image as absent.
 *   4. There is NO bundled fallback image, in production OR development.
 *      The client asked to see a hidden section rather than a stand-in.
 */
export async function enrichPayloadWithVehicleImage(
  payload: ReportPayload,
  authToken?: string,
): Promise<ReportPayload> {
  const url = pickVehicleImageUrl(payload);
  if (!url) return withResolvedImage(payload, null);
  if (url.startsWith('data:')) return withResolvedImage(payload, url);

  const dataUrl = await resolveVehicleImageDataUrl(url, authToken);
  return withResolvedImage(payload, dataUrl);
}
