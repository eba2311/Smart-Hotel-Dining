# Software Requirements Specification — Smart Hotel Dining Platform

**Version:** 1.0
**Project:** AI-Enhanced QR-Based Smart Hotel Dining, Ordering and Service Management System

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for a smart hotel dining platform. Guests scan a unique QR code at a restaurant table or hotel room to browse a real-time digital menu, customize and order meals, pay online, track preparation, and request hotel services. Staff manage orders, services, menu, inventory, payments and analytics through role-based dashboards. AI assists with food recommendations, demand prediction and customer feedback analysis.

### 1.2 Scope
- Digital QR menu & ordering (restaurant + room service)
- Kitchen Display System (KDS)
- Waiter delivery & service-request workflow
- Online payment abstraction with server-side verification
- Inventory integration with automatic stock deduction
- Customer feedback with AI sentiment analysis
- Analytics & AI demand prediction
- Multi-branch (hotel → branch) organization model
- Role-based access control and audit logging

### 1.3 Definitions
- **Guest** — scans a QR code; orders without a registered account.
- **KDS** — Kitchen Display System: real-time order tickets for kitchen staff.
- **QR token** — secure random value embedded in the QR code that identifies a table or room.
- **Branch** — a restaurant, bar or room-service outlet under a hotel.

---

## 2. Overall Description

### 2.1 System actors

| Actor | Description | Key capabilities |
|---|---|---|
| Guest | Scans QR at table/room | browse menu, customise, order, pay, track, request services, review |
| Waiter | Restaurant floor staff | receive ready orders, deliver, confirm, handle service requests, view tables |
| Kitchen | Kitchen staff | accept tickets, prepare, mark ready, view workload |
| Manager | Branch manager | manage menu/tables/rooms/inventory/staff, monitor orders & revenue, view analytics |
| Admin | Platform administrator | manage hotels, branches, users, roles, audit logs |

### 2.2 User roles & permissions (RBAC)

| Capability | Admin | Manager | Waiter | Kitchen |
|---|---|---|---|---|
| Manage hotels/branches | ✔ | ✘ | ✘ | ✘ |
| Manage users & audit logs | ✔ | staff only | ✘ | ✘ |
| Manage menu, tables, rooms, inventory | ✘ | ✔ | ✘ | ✘ |
| View orders & analytics | ✔ | ✔ | limited | limited |
| Handle order status (deliver/complete) | ✔ | ✔ | ✔ | kitchen states |
| Kitchen actions (accept/start/ready) | ✔ | ✔ | ✘ | ✔ |
| Service requests | ✔ | ✔ | ✔ | ✘ |

---

## 3. Functional Requirements

### FR-1 Authentication & RBAC
- FR-1.1 Staff authenticate with email + password.
- FR-1.2 Passwords hashed with bcrypt; JWT issued on login.
- FR-1.3 Every protected API checks the user's role.
- FR-1.4 Admin can create/deactivate users and assign roles.

### FR-2 Organization model
- FR-2.1 Admin creates hotels and branches (restaurant/bar/room_service).
- FR-2.2 Tables and rooms belong to a branch; menu, inventory, orders and analytics are branch-scoped.

### FR-3 QR system
- FR-3.1 Manager creates tables/rooms; each receives a unique QR token.
- FR-3.2 Scanning resolves the token to a table/room — the guest never types a table number.
- FR-3.3 QR tokens are random 20-byte values (unguessable).

### FR-4 Digital menu
- FR-4.1 Menu items have name, description, image (emoji), price, category, ingredients, allergens, calories, prep time, availability, special flag, promo price.
- FR-4.2 Items support customization options (single/multi choice) with price deltas.
- FR-4.3 Guests can search and filter by category.

### FR-5 Ordering
- FR-5.1 Guest builds a cart, then checks out with name + payment method.
- FR-5.2 Server recomputes prices, coupon discount, tax and total from the database (never trusts the browser).
- FR-5.3 Order lifecycle follows a strict state machine (FR-5.4).
- FR-5.4 States: CREATED → PAYMENT_PENDING → CONFIRMED → KITCHEN_ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED. CANCELLED only from CREATED/PAYMENT_PENDING/CONFIRMED.
- FR-5.5 Confirmed orders deduct inventory and create a kitchen ticket automatically.

### FR-6 Kitchen Display System
- FR-6.1 Kitchen sees new orders in real time (no refresh).
- FR-6.2 Actions: accept, start preparation, mark ready.
- FR-6.3 Tickets show order number, table/room, items, options, notes, priority.

### FR-7 Waiter workflow
- FR-7.1 Waiter sees ready orders, marks delivery in progress and delivered, completes orders.
- FR-7.2 Waiter receives and processes service requests (housekeeping, towels, cleaning, maintenance, water, room service, reception).

### FR-8 Payments
- FR-8.1 Methods: card, mobile money, bank transfer, cash.
- FR-8.2 Payment abstraction layer with pluggable providers; mock gateway in demo.
- FR-8.3 Amount verified against the stored order; only verified payments mark an order paid.
- FR-8.4 Failed online payment cancels the order with reason.

### FR-9 Inventory
- FR-9.1 Ingredients have stock + low-stock threshold.
- FR-9.2 Each menu item links ingredients with quantities; sales decrement stock and log transactions.
- FR-9.3 Low-stock alerts broadcast in real time.
- FR-9.4 Items become automatically unavailable when required ingredients are insufficient.

### FR-10 AI recommendations
- FR-10.1 Personalized suggestions from order history + category affinity + ingredient overlap + popularity.
- FR-10.2 Each suggestion includes a human-readable reason.

### FR-11 AI demand prediction
- FR-11.1 Forecasts expected demand per dish for a target day using 28 days of history for the same day-of-week.
- FR-11.2 Levels: HIGH / MEDIUM / LOW.

### FR-12 Feedback & sentiment
- FR-12.1 Guest rates 1–5 and writes a comment after an order.
- FR-12.2 Comment is analysed into aspects (food quality, service, speed, price, menu) with positive/negative/neutral labels and an overall sentiment.

### FR-13 Analytics
- FR-13.1 Summary: today's sales, orders by status, active orders, popular items, peak hours, satisfaction, low stock.
- FR-13.2 Revenue trend and satisfaction distribution charts.
- FR-13.3 All scoped by branch and date window.

### FR-14 Audit
- FR-14.1 Admin can review audit log of authenticated actions (who/what/when/ip).

---

## 4. Non-Functional Requirements

- **Security:** JWT, bcrypt, RBAC, helmet headers, CORS whitelist, rate limiting, zod validation, server-side price computation, unguessable QR tokens, audit logs.
- **Performance:** sub-300 ms typical API responses; real-time events via WebSockets; indexes on hot queries.
- **Reliability:** central error handler; graceful DB failure handling; 404 for unknown routes.
- **Usability:** mobile-first guest UI; role-specific dashboards; live updates.
- **Maintainability:** layered architecture (routes → controllers → services → models); reusable middleware; centralized constants/validators.
- **Scalability:** branch-scoped data enables horizontal multi-branch deployment.

---

## 5. Acceptance Criteria (highlights)
1. Scanning a table QR opens the menu with the table pre-identified.
2. An order placed by a guest appears in the Kitchen dashboard in real time.
3. Completing kitchen "ready" triggers the waiter delivery view instantly.
4. A paid order's total always equals the server-computed total (tampered browser totals rejected).
5. Selling the last stock of an ingredient marks linked items unavailable automatically.
6. Feedback comment "food was great but service was slow" yields foodQuality positive + service/speed negative, overall mixed.

---

## 6. Future work
- Real payment provider integration (e.g. Stripe, CBE Birr).
- Advanced ML models (collaborative filtering via matrix factorization) replacing heuristic scores.
- Push notifications (SMS/email) and multi-language menus.
- Kitchen prep-time forecasting and staff shift scheduling.
