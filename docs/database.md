# Database Design

MongoDB via Mongoose. All monetary values stored in numeric units of the configured currency (ETB by default); timestamps auto-managed (`createdAt`, `updatedAt`).

## Collections & key fields

### users
`name`, `email` (unique), `password` (hashed, `select:false`), `role` (`admin|manager|waiter|kitchen|guest`), `phone`, `hotel`, `branch`, `active`, `lastLogin`

### hotels
`name`, `address`, `phone`, `email`, `logo`, `currency`, `active`

### branches
`hotel` → hotels, `name`, `type` (`restaurant|bar|room_service`), `address`, `phone`, `active`

### tables
`branch` → branches, `number` (unique per branch), `label`, `seats`, `qrToken` (unique), `status` (`available|occupied|reserved`), `active`

### rooms
`branch`, `number` (unique per branch), `floor`, `roomType`, `qrToken` (unique), `status` (`vacant|occupied`), `active`

### menuCategories
`branch`, `name` (unique per branch), `description`, `icon`, `sortOrder`, `active`

### menuItems
`branch`, `category` → menuCategories, `name`, `description`, `image`, `price`, `promotionPrice`, `ingredients[]`, `allergens[]`, `calories`, `prepTimeMinutes`, `available`, `special`, `sortOrder`,
`options[]` = { id, name, type (`single|multi`), required, choices[] = { id, label, priceDelta } },
`ingredientLinks[]` = { ingredient → ingredients, quantity }

### ingredients
`branch`, `name` (unique per branch), `unit` (`g|ml|unit|kg|L`), `stock`, `lowStockThreshold`, `costPerUnit`, `active`

### inventoryTransactions
`branch`, `ingredient`, `type` (`in|out|adjustment`), `quantity`, `reason`, `refModel`, `refId`, `user`

### orders
`orderNumber` (unique), `branch`, `table`, `room`, `customerId`, `customerName`,
`items[]` = { menuItem, name, image, quantity, unitPrice, options[], note, subtotal },
`subtotal`, `discount`, `couponCode`, `tax`, `total`,
`status` (state machine), `paymentStatus`, `payment`, `paymentMethod`,
`statusHistory[]` = { status, at, by, note },
`priority`, `estimatedMinutes`, `rating`, `note`, `cancelledReason`, `source`
Indexes: `{branch, createdAt:-1}`, `{customerId, createdAt:-1}`, `{status}`

### payments
`order`, `branch`, `method` (`card|mobile_money|bank|cash`), `amount`, `currency`, `status` (`pending|processing|paid|failed|refunded`), `provider`, `providerRef`, `verifiedAt`, `meta`

### kitchenTickets
`order`, `orderNumber`, `branch`, `tableLabel`, `roomLabel`, `status` (`pending|accepted|preparing|ready`), `priority`, `assignedTo`, `startedAt`, `completedAt`, `items[]`

### serviceRequests
`branch`, `room`, `table`, `guestName`, `type` (`housekeeping|towels|cleaning|maintenance|water|room_service|reception`), `note`, `status` (`pending|accepted|processing|completed|cancelled`), `priority`, `assignedTo`, `resolvedAt`

### reviews
`order` (unique per order), `branch`, `customerId`, `customerName`, `rating` (1–5), `comment`,
`sentiment` = { overall (`positive|negative|mixed|neutral`), aspects[] = { aspect, sentiment, score, keywords }, summary }, `analyzed`

### coupons
`branch`, `code` (unique, uppercase), `type` (`percent|fixed`), `value`, `minOrder`, `maxUses`, `usedCount`, `expiresAt`, `active`

### demandForecasts
`branch`, `forecastFor` (YYYY-MM-DD, unique per branch), `items[]` = { itemId, name, expected, level (`LOW|MEDIUM|HIGH`) }, `note`

### auditLogs
`user`, `role`, `action`, `target`, `method`, `path`, `ip`, `meta`

## Relationships summary

```
Hotel 1─* Branch 1─* Table / Room / MenuCategory / Ingredient / Order / ServiceRequest
MenuCategory 1─* MenuItem 1─* Ingredient (through ingredientLinks)
Order 1─1 Payment · 1─1 KitchenTicket · 1─1 Review (optional)
```
