# Smart Hotel Dining Platform

**Design and Development of an AI-Enhanced QR-Based Smart Hotel Dining, Ordering and Service Management System**

A full-stack MERN application where hotel guests scan a unique QR code at their table or room, browse a real-time digital menu, customize meals, place orders, pay online, track preparation live, request hotel services, and leave AI-analysed feedback. Staff manage everything through kitchen, waiter, manager and admin dashboards.

![Stack](https://img.shields.io/badge/Stack-MERN-blue) ![Realtime](https://img.shields.io/badge/Realtime-Socket.IO-green) ![AI](https://img.shields.io/badge/AI-Recom%2FDemand%2FSentiment-purple)

---

## ✨ Features

| Area | What it does |
|---|---|
| 🍽️ Smart QR | Unique secure QR per table & room — no manual table entry |
| 📱 Digital Menu | Categories, search, allergens, calories, prep time, promo pricing |
| 🛠️ Customization | Extras / remove-onion / spice level with price deltas |
| ⚡ Real-time ordering | Socket.IO pushes orders to the Kitchen Display System instantly |
| 🍳 KDS | Accept → Start prep → Mark ready, with live ticket board |
| 🛎️ Waiter app | Deliveries, service requests (housekeeping, towels, maintenance...), table status |
| 💳 Payments | Abstraction layer (card / mobile money / bank / cash) with server-side amount verification (mock gateway in demo) |
| 📦 Inventory | Ingredient stock auto-deducted per sale, low-stock alerts, auto "unavailable" |
| 🧠 AI Recommendations | Content + collaborative scoring with human-readable reasons |
| 📈 AI Demand Prediction | Day-of-week forecast → HIGH / MEDIUM / LOW per dish |
| 💬 AI Sentiment | Aspect-based feedback analysis (food, service, speed, value) |
| 🏨 Room Service | Food, cleaning, towels, water, maintenance, reception requests |
| 🎛️ Dashboards | Guest / Kitchen / Waiter / Manager / Admin |
| 🏢 Multi-branch | Hotels → branches → tables/rooms, isolated per branch |

---

## 🚀 Quick Start

### Prerequisites
- Node.js **18+**
- MongoDB (see options below)

### 1. Start MongoDB

**Option A — Docker (recommended, one command):**
```bash
docker compose up -d
```
Mongo runs at `mongodb://localhost:27017` (no auth). Simple.

**Option B — Local MongoDB Community:** install and start the `MongoDB` service. The default connection string works as-is.

> If you use the docker-compose file with the root/pass credentials enabled, set `MONGO_URI=mongodb://root:rootpass@localhost:27017/smart-hotel?authSource=admin` in `server/.env`.

### 2. Install dependencies
```bash
npm run install:all
```

### 3. Configure the server
```bash
cd server
copy .env.example .env
# optionally edit JWT_SECRET / MONGO_URI / CURRENCY / TAX_RATE
```

### 4. Seed demo data
```bash
npm run seed
```
Creates a hotel, restaurant + room-service branches, 8 tables, 5 rooms, 18 menu items, ingredients, a `WELCOME10` coupon, and four staff accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hotel.com` | `Admin@123` |
| Manager | `manager@hotel.com` | `Manager@123` |
| Waiter | `waiter@hotel.com` | `Waiter@123` |
| Kitchen | `kitchen@hotel.com` | `Kitchen@123` |

### 5. Run the servers
```bash
# Terminal 1 — API (port 5000)
npm run server

# Terminal 2 — Web client (port 5173)
npm run client
```

Open **http://localhost:5173** and sign in as **Manager** to see everything.

---

## 🔍 Try the full flow

1. **Log in as Manager** → *Tables & Rooms* → click **QR** on any table.
2. Open the QR URL (or scan it with your phone — your phone and PC must be on the same network, then use the machine's LAN IP in `client/vite.config.js` and `PUBLIC_URL`).
3. The **guest menu** opens with the table pre-identified — browse, customise a dish, check out with *Card* (simulated), and watch the order appear **instantly** in the Kitchen dashboard.
4. Open the **Kitchen** dashboard in another tab → accept → start → mark ready.
5. Open the **Waiter** dashboard → deliver → mark delivered → complete.
6. Back on the guest screen, track the live status timeline, then rate the order and read the **AI sentiment** result.
7. Try the **Room** QR for service requests, and the manager *AI Analytics* page for the demand forecast.

---

## 🧠 How the AI works (no external API keys needed)

- **Recommendations** — scores every menu item from your order history (category affinity), ingredient overlap with past favourites, personal reorder tendency and community popularity, then explains the match in plain English.
- **Demand prediction** — averages the last 28 days of orders for the same day of the week with recency weighting, then buckets each dish into HIGH / MEDIUM / LOW demand.
- **Sentiment analysis** — aspect-based keyword scoring with negation handling across food quality, service, speed, price and menu.

---

## 🛠️ Tech Stack

**Frontend:** React 18 · Vite · Tailwind CSS · React Router · Axios · Socket.IO Client · Recharts · Framer Motion · React Hook Form · Zod

**Backend:** Node.js · Express · MongoDB (Mongoose) · Socket.IO · JWT · bcrypt · Zod · Helmet · rate-limiter

**Payments:** provider abstraction (`server/src/services/payments/`) — the bundled `mock` provider simulates a gateway; swap in real providers behind the same interface.

---

## 📚 Documentation

- [`docs/SRS.md`](docs/SRS.md) — Software Requirements Specification
- [`docs/architecture.md`](docs/architecture.md) — System architecture & diagrams
- [`docs/database.md`](docs/database.md) — Data model & collections
- [`docs/api.md`](docs/api.md) — REST + Socket.IO API reference

---

## 🔐 Security notes

- Prices, totals and payment status are **recomputed server-side** — the browser is never trusted.
- JWT auth + RBAC (`admin`, `manager`, `waiter`, `kitchen`), bcrypt password hashing.
- QR tokens are random 20-byte values; the table is identified by the token, never user input.
- Helmet security headers, CORS whitelist, per-route rate limiting, zod validation and audit logging.
- Guests browse and order without an account (guest id stored locally); staff must authenticate.

---

## 🗺️ Project structure

```
smart-hotel/
├── client/src/            React app (guest, kitchen, waiter, manager, admin)
├── server/src/
│   ├── controllers/       request handlers
│   ├── models/            Mongoose schemas
│   ├── routes/            REST routes
│   ├── services/
│   │   ├── ai/            recommendation · demand · sentiment
│   │   ├── orders/        order service + state machine
│   │   ├── payments/      payment abstraction
│   │   ├── qr/            QR generation
│   │   ├── inventory/     stock consumption & availability
│   │   └── notifications/ Socket.IO events
│   ├── middleware/        auth, RBAC, validation, errors, rate limit, audit
│   ├── validators/        zod schemas
│   └── utils/
└── docs/                  SRS, architecture, database, API
```
