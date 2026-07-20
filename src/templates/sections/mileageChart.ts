import { MileagePoint } from '../../types/report';
import { esc, fmtNumber, parseDate } from '../helpers';

interface ChartDatum { date: Date; mileage: number; }
interface ChartPoint extends ChartDatum { x: number; y: number; }

/**
 * Render an SVG line chart of mileage over time. Designed to fit alongside
 * the valuation/risk cards. Defensive against missing/null mileages.
 */
export function renderMileageChart(trend: MileagePoint[] | undefined): string {
  const points: ChartDatum[] = (trend || [])
    .map((p) => ({ date: parseDate(p.date)!, mileage: Number(p.mileage) }))
    .filter((p) => p.date && Number.isFinite(p.mileage));

  if (points.length < 2) {
    return `<div class="text-muted small">Not enough data for a mileage chart.</div>`;
  }

  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Tuned to a 720x160 viewBox — wide and modestly tall so the data points
  // remain readable but the rendered SVG stays compact enough not to
  // dominate a page. Aspect ratio is preserveAspectRatio="xMidYMid meet".
  const W = 720;     // viewBox width
  const H = 160;     // viewBox height
  const padL = 56, padR = 18, padT = 14, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xMin = points[0].date.getTime();
  const xMax = points[points.length - 1].date.getTime();
  const xSpan = Math.max(1, xMax - xMin);

  const mileages = points.map((p) => p.mileage);
  const yMinRaw = Math.min(...mileages);
  const yMaxRaw = Math.max(...mileages);
  const span = yMaxRaw - yMinRaw;

  // Choose a "nice" step relative to the *span* rather than the absolute
  // maximum. A car that increased by 2,000 mi over a year would otherwise
  // sit on a 0–75,000 scale and look completely flat — we now expand the
  // slice so the slope is legible.
  const niceStep = (v: number) => {
    if (v <= 200) return 50;
    if (v <= 500) return 100;
    if (v <= 1_000) return 250;
    if (v <= 2_500) return 500;
    if (v <= 5_000) return 1_000;
    if (v <= 10_000) return 2_500;
    if (v <= 25_000) return 5_000;
    if (v <= 100_000) return 25_000;
    if (v <= 200_000) return 50_000;
    return 100_000;
  };

  // If the span is small compared to the values (e.g. 2,000 mi delta on a
  // 60,000 mi odometer) start the axis just below the minimum so the trend
  // is visible. If the span is a meaningful fraction of the max, keep the
  // origin at zero — matches the "grow from 0" story most drivers expect.
  const scaleFromZero = span >= yMaxRaw * 0.6;
  let yMin: number;
  let yMax: number;
  let step: number;
  if (scaleFromZero) {
    step = niceStep(yMaxRaw);
    yMin = 0;
    yMax = Math.max(step, Math.ceil(yMaxRaw / step) * step);
  } else {
    const paddedSpan = Math.max(span, 1) * 1.5;
    step = niceStep(paddedSpan);
    yMin = Math.max(0, Math.floor((yMinRaw - paddedSpan * 0.15) / step) * step);
    yMax = Math.ceil((yMaxRaw + paddedSpan * 0.15) / step) * step;
    if (yMax === yMin) yMax = yMin + step;
  }

  const xMap = (t: number) => padL + ((t - xMin) / xSpan) * plotW;
  const yMap = (m: number) => padT + (1 - (m - yMin) / (yMax - yMin)) * plotH;

  const mapped: ChartPoint[] = points.map((p) => ({
    ...p,
    x: xMap(p.date.getTime()),
    y: yMap(p.mileage),
  }));

  // Smooth path with simple Bezier-ish curve (use straight lines for accuracy)
  const linePath = mapped
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Area path under the line
  const areaPath = `${linePath} L ${mapped[mapped.length - 1].x.toFixed(1)} ${yMap(yMin).toFixed(1)} L ${mapped[0].x.toFixed(1)} ${yMap(yMin).toFixed(1)} Z`;

  // Y gridlines at yMin, yMin+step, ... up to yMax
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 0.0001; v += step) yTicks.push(v);

  // X tick labels: pick first, last, and middle points for readability
  const xLabelIdx = (() => {
    const n = mapped.length;
    if (n <= 6) return mapped.map((_, i) => i);
    const out = new Set<number>();
    out.add(0);
    out.add(n - 1);
    for (let i = 1; i < n - 1; i += Math.ceil(n / 6)) out.add(i);
    return Array.from(out).sort((a, b) => a - b);
  })();

  return /* html */ `
    <svg class="mileage-chart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-label="Mileage progression chart">
      <title>Mileage progression</title>
      <defs>
        <linearGradient id="mileageFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#163B5F" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#163B5F" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- Y gridlines + labels -->
      ${yTicks
        .map(
          (v) => `
        <line x1="${padL}" x2="${W - padR}" y1="${yMap(v).toFixed(1)}" y2="${yMap(v).toFixed(1)}"
              stroke="#D1D4DC" stroke-dasharray="2 3" />
        <text x="${padL - 6}" y="${(yMap(v) + 4).toFixed(1)}" text-anchor="end"
              font-family="Inter, Arial, sans-serif" font-size="9" fill="#6B7280">
          ${esc(fmtNumber(v))}
        </text>`,
        )
        .join('')}

      <!-- X axis line -->
      <line x1="${padL}" x2="${W - padR}" y1="${yMap(yMin).toFixed(1)}" y2="${yMap(yMin).toFixed(1)}"
            stroke="#9CA3AF" />

      <!-- Filled area -->
      <path d="${areaPath}" fill="url(#mileageFill)" />

      <!-- Line -->
      <path d="${linePath}" fill="none" stroke="#163B5F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Data points -->
      ${mapped
        .map(
          (p) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2"
                fill="#FFFFFF" stroke="#163B5F" stroke-width="1.8" />`,
        )
        .join('')}

      <!-- X labels -->
      ${xLabelIdx
        .map((i) => {
          const p = mapped[i];
          const label = p.date.toLocaleDateString('en-GB', {
            month: 'short',
            year: '2-digit',
            timeZone: 'UTC',
          });
          return `<text x="${p.x.toFixed(1)}" y="${(H - padB + 18).toFixed(1)}"
                        text-anchor="middle" font-family="Inter, Arial, sans-serif"
                        font-size="9" fill="#6B7280">${esc(label)}</text>`;
        })
        .join('')}
    </svg>
  `;
}
