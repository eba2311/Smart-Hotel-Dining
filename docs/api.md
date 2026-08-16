# API Reference

Base URL: `/api` (dev proxy `http://localhost:5000`). All responses use `{ success, data | message }`. Authenticated endpoints require `Authorization: Bearer <jwt>`.

Roles: **A**=admin, **M**=manager, **W**=waiter, **K**=kitchen, **P**=public (guests).

## Auth
| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/auth/register` | P | name, email, password, role?, hotel?, branch? |
| POST | `/auth/login` | P | email, password → `{ token, data }` |
| GET | `/auth/me` | all | — |

## Catalog & QR
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/catalog/qr/:token` | P | resolves QR token → table/room + branch |
| GET | `/catalog/menu?branch=` | P | categories + available items (promo pricing applied) |
| GET | `/catalog/categories?branch=` | P | |
| GET | `/catalog/all?branch=` | M,A | all items incl. unavailable |
| POST | `/catalog/categories` | M,A | branch, name, description?, icon?, sortOrder? |
| PATCH | `/catalog/categories/:id` | M,A | |
| DELETE | `/catalog/categories/:id` | M,A | 400 if category has items |
| POST | `/catalog/items` | M,A | full item incl. options[] and ingredientLinks[] |
| PATCH | `/catalog/items/:id` | M,A | |
| DELETE | `/catalog/items/:id` | M,A | |

## Tables & Rooms
| Method | Path | Roles |
|---|---|---|
| GET | `/tables?branch=` | M,A,W |
| POST | `/tables` | M,A |
| PATCH | `/tables/:id` | M,A |
| DELETE | `/tables/:id` | M,A |
| POST | `/tables/:id/qr/regenerate` | M,A |
| GET | `/rooms?branch=` | M,A,W |
| POST | `/rooms` | M,A |
| PATCH | `/rooms/:id` | M,A |
| DELETE | `/rooms/:id` | M,A |
| POST | `/rooms/:id/qr/regenerate` | M,A |
| GET | `/qr/table/:id` / `/qr/room/:id` | M,A |

## Orders
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/orders` | P | items[] (menuItem, quantity, options, note), paymentMethod, couponCode?, table/room, customerId/Name. Server recomputes prices & totals, verifies payment. |
| GET | `/orders?branch=&status=&limit=` | M,A,W,K | |
| GET | `/orders/:id` | all | |
| GET | `/orders/history/:customerId` | P | |
| PATCH | `/orders/:id/status` | M,A,W | body: `{ to, note? }` — validated against state machine |
| PATCH | `/orders/:id/kitchen` | K,M,A | body: `{ action: accept\|start\|ready }` |
| PATCH | `/orders/:id/deliver` | W,M,A | READY → OUT_FOR_DELIVERY |
| DELETE | `/orders/:id` | all | body: `{ reason? }` — only in cancellable states |

**POST /orders example**
```json
{
  "branch": "<branchId>",
  "table": "<tableId>",
  "customerName": "Sara",
  "paymentMethod": "card",
  "couponCode": "WELCOME10",
  "items": [
    { "menuItem": "<itemId>", "quantity": 2,
      "options": [{ "optionId": "chicken-extra", "choiceIds": ["cheese"] }] }
  ]
}
```

## Services (room service requests)
| Method | Path | Roles |
|---|---|---|
| POST | `/services` | P (guest) |
| GET | `/services?branch=&status=` | M,A,W |
| PATCH | `/services/:id` | M,A,W — `{ status, priority }` |

## Reviews
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/reviews` | P | orderId, rating, comment → AI sentiment analysed & stored |
| POST | `/reviews/analyze` | P | `{ comment }` → live sentiment result |
| GET | `/reviews?branch=` | M,A | |

## Inventory
| Method | Path | Roles |
|---|---|---|
| GET | `/inventory?branch=` | M,A |
| POST | `/inventory` | M,A |
| PATCH | `/inventory/:id` | M,A |
| DELETE | `/inventory/:id` | M,A |
| POST | `/inventory/:id/restock` | M,A — `{ quantity, branch }` |
| POST | `/inventory/:id/adjust` | M,A — `{ stock, branch }` |
| GET | `/inventory/transactions/all?branch=` | M,A |

## Analytics & AI
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/analytics/summary?branch=` | M,A | today sales, orders by status, popular items, peak hours, satisfaction, low stock |
| GET | `/analytics/revenue?branch=&days=` | M,A | daily revenue trend |
| GET | `/analytics/satisfaction?branch=` | M,A | distribution + aspect scores |
| GET | `/analytics/demand?branch=&date=` | M,A | AI demand prediction (HIGH/MEDIUM/LOW) |
| GET | `/analytics/recommendations?branch=&customerId=&cart=` | P | AI personalized recommendations |
| POST | `/analytics/feedback/analyze` | M,A | `{ comment }` |

## Staff (manager-scoped users)
| Method | Path | Roles |
|---|---|---|
| GET | `/staff?branch=` | M,A |
| POST | `/staff` | M,A — name, email, password, role (waiter/kitchen/manager), hotel, branch, phone |
| PATCH | `/staff/:id` | M,A |
| DELETE | `/staff/:id` | M,A |

## Admin
| Method | Path | Roles |
|---|---|---|
| GET/POST | `/admin/hotels` | A |
| PATCH | `/admin/hotels/:id` | A |
| GET/POST | `/admin/branches` | A (GET also M) |
| PATCH | `/admin/branches/:id` | A |
| GET | `/admin/users` | A |
| GET | `/admin/audit-logs` | A |

## Coupons
| Method | Path | Roles |
|---|---|---|
| GET | `/coupons?branch=` | M,A |
| POST | `/coupons` | M,A |
| PATCH | `/coupons/:id` | M,A |
| DELETE | `/coupons/:id` | M,A |

## Socket.IO events

Client connects to `/` with optional `auth.token`. Rooms: `branch:{id}`, `order:{id}`, `guest:{customerId}`.

| Event | Direction | Payload |
|---|---|---|
| `join-branch` / `leave-branch` | client → server | branchId |
| `join-order` / `leave-order` | client → server | orderId |
| `join-guest` | client → server | customerId |
| `order:new` | server → branch | order |
| `order:status` | server → branch + order | updated order |
| `kitchen:new` | server → branch | { order, ticket } |
| `waiter:order-ready` | server → branch | order |
| `service:new` / `service:update` | server → branch | service request |
| `inventory:alert` | server → branch | { message, items } |

## Error format
```json
{ "success": false, "message": "...", "details": [ { "field": "email", "message": "Invalid email" } ] }
```
