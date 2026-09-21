FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY tools/maketto-crawler/package.json tools/maketto-crawler/package-lock.json ./
RUN npm ci --omit=dev \
    && npx playwright install --with-deps chromium \
    && rm -rf /root/.npm /var/lib/apt/lists/*
COPY tools/maketto-crawler/src ./src

CMD ["node", "src/worker.mjs"]
