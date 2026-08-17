# ──────────────────────────────────────────────
#  Stage 1 — Build the React client
# ──────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ──────────────────────────────────────────────
#  Stage 2 — API server + embedded MongoDB
# ──────────────────────────────────────────────
FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      gnupg && \
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
      gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg && \
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
      tee /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends mongodb-org && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV JWT_SECRET=Kf7xQ2mP9vLs4YhW1aBzDcNeRgT5uJ0i
ENV CLIENT_ORIGIN=https://smart-hotel-dining-1.onrender.com

WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p /data/db /var/log/mongodb

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 5000
CMD ["/app/start.sh"]
