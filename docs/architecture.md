# System Architecture

## 1. High-level view

```
                 ┌──────────────────────────────────────────────┐
   Guest phone   │                React SPA (Vite)              │
  (QR → /#/menu) │  Guest · Kitchen · Waiter · Manager · Admin  │
                 └───────────────┬───────────────┬──────────────┘
                                 │ REST /api     │ Socket.IO (live)
                                 ▼               ▼
                 ┌──────────────────────────────────────────────┐
                 │              Express API (Node)              │
                 │  middleware → routes → controllers → services│
                 │  ┌────────────────────────────────────────┐  │
                 │  │ services: qr · orders (state machine)  │  │
                 │  │ payments · inventory · notifications   │  │
                 │  │ AI: recommendation · demand · sentiment│  │
                 │  └────────────────────────────────────────┘  │
                 └───────────────┬───────────────┬──────────────┘
                                 │ Mongoose      │ Socket.IO emit
                                 ▼               ▼
                         ┌─────────────┐   ┌─────────────┐
                         │   MongoDB   │   │  Clients    │
                         └─────────────┘   │  (KDS, etc) │
                                           └─────────────┘
```

## 2. Layered backend

- **Routes** — declare endpoint + HTTP method + middleware chain (protect, restrictTo, validate, audit).
- **Controllers** — HTTP concerns only (read request, call service, respond).
- **Services** — business logic: order state machine, payment verification, inventory consumption, AI engines, notification fan-out.
- **Models** — Mongoose schemas with validation and indexes.
- **Middleware** — auth (JWT), RBAC, zod validation, error handling, rate limiting, audit logging, security headers.
- **Validators** — zod schemas, kept separate from models.

## 3. Real-time design (Socket.IO)

Server rooms:
- `branch:{branchId}` — kitchen/waiter/manager join; receives `order:new`, `order:status`, `kitchen:new`, `waiter:order-ready`, `service:new`, `service:update`, `inventory:alert`.
- `order:{orderId}` — the guest joins after placing an order; receives `order:status`.
- `guest:{customerId}` — guest device; receives `order:created`, `service:created`.

Client events: `join-branch`, `leave-branch`, `join-order`, `join-guest`.

## 4. Order state machine

```
CREATED ──► PAYMENT_PENDING ──► CONFIRMED ──► KITCHEN_ACCEPTED ──► PREPARING
   │              │                │              │
   └──────────────┴────────────────┘              │
              CANCELLED (allowed only from CREATED / PAYMENT_PENDING / CONFIRMED)
                                                  ▼
   COMPLETED ◄── DELIVERED ◄── OUT_FOR_DELIVERY ◄── READY
```

Transitions are validated centrally (`services/orders/orderStateMachine.js`); the history is recorded on the order (`statusHistory`).

## 5. Payment flow (server-verified)

1. Guest checks out → order created with total computed **server-side**.
2. Status → `PAYMENT_PENDING`; payment row created (amount = order.total).
3. Provider `charge()` called with DB amount (client-sent amount must match).
4. On success: payment `paid`, order `CONFIRMED`, inventory deducted, kitchen ticket created.
5. On failure: order `CANCELLED` with reason; payment `failed`.

## 6. Inventory flow

- Menu item links ingredients + quantities.
- On order confirmation each ingredient is decremented and a transaction logged.
- Low-stock → real-time alert; item with insufficient ingredients → automatically `available: false`.

## 7. Security architecture

- JWT (Authorization Bearer) + bcrypt hashing.
- RBAC via `restrictTo(...roles)`.
- Never-trust: price, total, paymentStatus, role, tableId — all derived/verified on the server.
- Helmet, CORS whitelist, express-rate-limit on API and login.
- zod validation on every body.
- Audit middleware records admin/manager actions.

## 8. Deployment topology

- **Dev:** Vite (5173) proxies `/api` and `/socket.io` → Express (5000) → MongoDB (27017).
- **Prod:** build the client, serve statically from Express or CDN; MongoDB Atlas; PM2/Docker for the API; single Node process hosts both HTTP and WebSocket.
