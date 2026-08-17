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
ENV MONGO_URI=mongodb+srv://ebabayana8_db_user:GxrNAmMu6LzRTPtn@cluster0.pqcfhxi.mongodb.net/smart-hotel?retryWrites=true&w=majority
ENV JWT_SECRET=Kf7xQ2mP9vLs4YhW1aBzDcNeRgT5uJ0i
ENV CLIENT_ORIGIN=https://smart-hotel-dining.onrender.com
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist ./client/dist
EXPOSE 5000
CMD ["npm", "start"]
