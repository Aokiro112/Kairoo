FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install system dependencies for OpenSSL (Prisma) and Playwright Chromium
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --only=production && \
    npx prisma generate

COPY . .

# Set a fallback DATABASE_URL for build-time generation
ENV DATABASE_URL="file:/app/prisma/dev.db"

RUN npm run build

# ─── Production Stage (smaller image) ───
FROM node:20-bookworm-slim

WORKDIR /app

# Install runtime dependencies for Playwright Chromium
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy built app from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install Playwright chromium browser binaries
RUN npx playwright install chromium || true

ENV NODE_ENV=production
ENV PORT=5000

# ECS health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

EXPOSE 5000

CMD ["npm", "run", "start"]
