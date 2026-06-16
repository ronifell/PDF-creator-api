# Motovo PDF Service

A standalone Node.js + TypeScript service that turns a Motovo vehicle-report
JSON payload into a polished, branded A4 PDF.

Built with **Express + Playwright (Chromium)** so the output is a proper PDF
with **selectable, searchable text** — not a screenshot-based export.

---

## Features

- `POST /generate-car-check-pdf` accepts JSON, returns `application/pdf`
- `X-API-Key` / `Bearer` token protection
- Branded Motovo cover with UK number plate, vehicle image and status banner
- Risk-check summary grid (write-off, stolen, finance, scrapped, imports…)
- Full MOT history with advisory/major/dangerous/PRS tagging
- Mileage trend table
- Keeper history with high-turnover warning
- Write-off records with **inline SVG damage diagram** that highlights damage areas
- Trade / private / dealer / auction valuation tiles
- Standard equipment grouped by category
- Tax, MOT status and finance record blocks
- Repeating header & footer with page numbers, branding and VRM
- Smart `break-inside` hints to avoid cut-off cards
- Dockerised (uses the official `mcr.microsoft.com/playwright` image)
- Singleton browser instance — typical generation in **2 – 4 s** after warm-up

---

## Quick start (local)

```bash
cd backend
cp .env.example .env          # then edit API_KEYS
npm install                   # installs Playwright + Chromium automatically
npm run dev                   # http://localhost:4000
```

Generate a sample PDF straight from `../sample.json` (no HTTP):

```bash
npm run sample
# -> backend/out/sample.pdf
```

### Test the HTTP endpoint with curl

```bash
curl -X POST http://localhost:4000/generate-car-check-pdf \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-secret-key-change-me" \
  --data-binary @../sample.json \
  --output sample.pdf
```

---

## Environment

| Variable         | Default                  | Description                                          |
| ---------------- | ------------------------ | ---------------------------------------------------- |
| `PORT`           | `4000`                   | HTTP port                                            |
| `NODE_ENV`       | `development`            | Set to `production` in deploy                        |
| `API_KEYS`       | _(empty — service blocks)_ | Comma-separated list of valid keys                 |
| `MAX_PAYLOAD_MB` | `5`                      | Maximum JSON request size                            |
| `CORS_ORIGINS`   | `http://localhost:5173`  | Comma-separated origins. Use `*` for any (dev only). |

If `API_KEYS` is empty, the service **fail-closes** and rejects all requests.

---

## API

### `GET /health`

Public liveness probe.

```json
{ "status": "ok", "uptime": 12.34, "env": "production" }
```

### `POST /generate-car-check-pdf`

Authenticated. Body: full vehicle-report JSON (see `../sample.json`).

| Query param | Effect                                                                |
| ----------- | --------------------------------------------------------------------- |
| `filename`  | Override the suggested download filename (without `.pdf` extension).  |
| `inline=1`  | Use `Content-Disposition: inline` (for in-browser preview).           |

Response headers:

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="motovo-car-check-YG13AYN.pdf"`
- `X-Generation-Time-Ms: 2841`

---

## Docker

```bash
cd backend
docker build -t motovo-pdf .
docker run --rm -p 4000:4000 \
  -e API_KEYS=prod-key-1,prod-key-2 \
  -e NODE_ENV=production \
  motovo-pdf
```

The image is based on `mcr.microsoft.com/playwright:v1.45.0-jammy`, which
ships Chromium + every system library it needs. Recommended memory: **1 GB**.

---

## Deployment notes

### Render / Railway / Fly.io

1. Push this `backend/` folder as its own repo (or as the build context).
2. Pick the `Dockerfile` build type — they will pick it up automatically.
3. Set `API_KEYS` and (optionally) `CORS_ORIGINS` as environment variables.
4. Expose port `4000` and point the platform health check to `/health`.

### Self-hosted VPS (Ubuntu 22.04)

```bash
sudo apt update && sudo apt install -y nodejs npm git
git clone <repo>.git && cd <repo>/backend
cp .env.example .env  # set API_KEYS
npm ci
npx playwright install --with-deps chromium
npm run build
PORT=4000 NODE_ENV=production node dist/index.js
```

Put it behind nginx + LetsEncrypt for HTTPS, or use systemd to keep it
running.

---

## Integrating from Base44 / a React frontend

Recommended pattern: **proxy the call through your backend** so the
API key never reaches the browser.

```ts
// Server-side (Node/Edge function in your Base44 app)
export async function generateCarCheckPdf(report: unknown) {
  const res = await fetch(`${process.env.PDF_SERVICE_URL}/generate-car-check-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.PDF_SERVICE_KEY!,
    },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`PDF service failed (${res.status}): ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
```

Browser-side download trigger (assuming the proxy above is exposed at
`/api/download-report`):

```ts
async function downloadReport(report: unknown, vrm: string) {
  const res = await fetch("/api/download-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error("Failed to generate PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `motovo-car-check-${vrm}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

> If you **must** call the PDF service directly from the browser (not
> recommended), restrict `CORS_ORIGINS` to the Base44 host and rotate the
> API key frequently.

---

## Project layout

```
backend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── scripts/
│   ├── copy-assets.js          # post-build asset copy
│   └── generate-sample.ts      # local PDF generation smoke test
└── src/
    ├── index.ts                # entry point
    ├── server.ts               # Express app setup
    ├── config.ts               # env parsing
    ├── middleware/
    │   ├── apiKey.ts
    │   └── errorHandler.ts
    ├── routes/
    │   └── pdf.ts              # POST /generate-car-check-pdf
    ├── services/
    │   └── pdfService.ts       # Playwright singleton + page.pdf()
    ├── templates/
    │   ├── report.ts           # top-level HTML, header & footer
    │   ├── styles.ts           # all print CSS
    │   ├── helpers.ts          # formatting + escaping
    │   └── sections/
    │       ├── cover.ts
    │       ├── vehicle.ts
    │       ├── risks.ts
    │       ├── mot.ts
    │       ├── keepers.ts
    │       ├── writeoff.ts
    │       ├── damageDiagram.ts
    │       ├── valuation.ts
    │       ├── equipment.ts
    │       └── taxAndFinance.ts
    └── types/
        └── report.ts
```

---

## License

Proprietary — © Motovo.
