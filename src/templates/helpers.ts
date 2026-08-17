/**
 * Formatting + escaping helpers shared by the report template sections.
 */

export const DASH = '—';

export function esc(value: unknown): string {
  if (value === null || value === undefined || value === '') return DASH;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escAttr(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function fmtNumber(value: number | null | undefined, opts?: { decimals?: number }): string {
  if (value === null || value === undefined || Number.isNaN(value as number)) return DASH;
  const decimals = opts?.decimals ?? 0;
  return Number(value).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value as number)) return DASH;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function fmtMileage(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return DASH;
  return `${fmtNumber(value)} ${unit || 'mi'}`;
}

/**
 * Parse common date strings used in the Motovo payload:
 *  - "DD-MM-YYYY"
 *  - ISO-8601 (with or without zone)
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return DASH;
  // Always render in UTC so a date like "28-01-2023" stays "28 Jan 2023"
  // regardless of the host machine's timezone.
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtDateLong(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return DASH;
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtBool(value: boolean | null | undefined, yes = 'Yes', no = 'No'): string {
  if (value === null || value === undefined) return DASH;
  return value ? yes : no;
}

export function groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = String(keyFn(item));
    (out[k] ||= []).push(item);
  }
  return out;
}

/**
 * Lightweight, lowercase, normalised string for matching damage area names
 * against SVG region IDs.
 */
export function normaliseArea(value: string | null | undefined): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Current / latest registration for display (banner plate, etc.).
 *
 * Prefer the newest plate-change `current_vrm`, then `vehicle.vrm`, then the
 * report lookup registration. Cherished transfers often leave
 * `registration_number` as the plate used to request the report while
 * `vehicle.vrm` / the latest transfer holds the plate on the car now.
 */
export function latestRegistration(payload: {
  registration_number?: string | null;
  report_data?: {
    registration_number?: string | null;
    vehicle?: { vrm?: string | null } | null;
    history?: {
      plate_changes?: Array<{
        date?: string | null;
        current_vrm?: string | null;
        vrm?: string | null;
      }> | null;
    } | null;
  } | null;
}): string {
  const changes = payload.report_data?.history?.plate_changes || [];
  if (changes.length) {
    const sorted = changes.slice().sort((a, b) => {
      const da = parseDate(a.date || '')?.getTime() ?? 0;
      const db = parseDate(b.date || '')?.getTime() ?? 0;
      return db - da;
    });
    for (const c of sorted) {
      const curr = (c.current_vrm || '').trim();
      if (curr) return curr.toUpperCase();
    }
  }

  const vehicleVrm = (payload.report_data?.vehicle?.vrm || '').trim();
  if (vehicleVrm) return vehicleVrm.toUpperCase();

  return (
    payload.registration_number ||
    payload.report_data?.registration_number ||
    ''
  )
    .trim()
    .toUpperCase();
}
