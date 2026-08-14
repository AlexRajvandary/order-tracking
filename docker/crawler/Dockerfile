FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app
COPY tools/maketto-crawler/package.json tools/maketto-crawler/package-lock.json ./
RUN npm ci --omit=dev
COPY tools/maketto-crawler/src ./src

ENV NODE_ENV=production
CMD ["node", "src/worker.mjs"]
