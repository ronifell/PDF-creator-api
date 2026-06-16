# Use the official Playwright image (bundles Chromium + required system libs)
FROM mcr.microsoft.com/playwright:v1.45.0-jammy AS deps

WORKDIR /app

COPY package*.json ./
# Install all deps (incl. dev) for the build stage.
RUN npm ci

# ---- Builder ----
FROM deps AS build

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ---- Runtime ----
FROM mcr.microsoft.com/playwright:v1.45.0-jammy AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 4000

# Healthcheck against /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+ (process.env.PORT||4000) +'/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
