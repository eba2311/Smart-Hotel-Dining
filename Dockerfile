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
#  Stage 2 — API server (serves the built client)
# ──────────────────────────────────────────────
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist ./client/dist
EXPOSE 5000
CMD ["npm", "start"]
