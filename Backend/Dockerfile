FROM node:20-bookworm-slim

WORKDIR /app

# Install system dependencies for OpenSSL (Prisma) and Playwright Chromium
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

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

# Set a fallback DATABASE_URL for build-time generation
ENV DATABASE_URL="file:/app/prisma/dev.db"

RUN npm run build

# Install Playwright chromium browser binaries
RUN npx playwright install chromium || true

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "run", "start"]
