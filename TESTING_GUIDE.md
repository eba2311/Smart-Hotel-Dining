# Smart Hotel Dining - Testing & Quality Assurance Guide

## 📋 Pre-Deployment Checklist

### Database & Environment
- [ ] MongoDB is running (Docker or local)
- [ ] `.env` file configured in `server/`
- [ ] `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` set correctly
- [ ] Seed data has been generated (`npm run seed`)

### Installation & Startup
- [ ] `npm run install:all` completed successfully
- [ ] No peer dependency warnings
- [ ] `npm run dev` starts both servers without errors
- [ ] Client available at `http://localhost:5173`
- [ ] Server available at `http://localhost:5000`
- [ ] API health check: `GET http://localhost:5000/api/health` returns 200

---

## 🔐 Authentication & Authorization Tests

### Test Case 1: User Registration
```
1. Navigate to / or /login
2. Click "Sign Up" or equivalent
3. Enter valid email, password, confirm password
4. Password strength requirements:
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 number
   - At least 1 special character (@, #, $, etc.)
5. Submit form
6. Verify:
   - Account created successfully
   - Can log in with new credentials
   - Redirected to role-appropriate dashboard
```

✅ **Expected Result**: Registration successful, user can log in

### Test Case 2: User Login
```
For each role (admin, manager, waiter, kitchen):
1. Navigate to /login
2. Enter credentials (see DEPLOYMENT_GUIDE.md)
3. Click "Login"
4. Verify:
   - No errors displayed
   - Redirected to role dashboard
   - User info displays correctly
   - Session persists on page reload
```

✅ **Expected Result**: All roles log in successfully

### Test Case 3: JWT Token Expiration
```
1. Log in as any user
2. Open browser DevTools → Application → Cookies
3. Note the `token` cookie expiration
4. Wait for token to expire OR manually set to past time
5. Perform any API action
6. Verify:
   - Redirected to login page
   - Clear error message about session expiration
```

✅ **Expected Result**: Expired token handled gracefully

### Test Case 4: Role-Based Access Control
```
1. Log in as Kitchen staff
2. Try to access /manager, /admin routes directly via URL
3. Verify: Redirected to unauthorized page or login
4. Repeat for each role with non-permitted routes
```

✅ **Expected Result**: Cannot access unauthorized routes

### Test Case 5: Password Security
```
1. Try weak passwords: "123456", "password", "abc123"
2. Verify error message about complexity
3. Try password with spaces and special chars
4. Verify accepts strong password
```

✅ **Expected Result**: Weak passwords rejected, strong ones accepted

---

## 🛒 Guest Flow Tests

### Test Case 6: QR Code Generation & Scanning
```
Manager Dashboard:
1. Log in as manager@hotel.com
2. Navigate to "Tables"
3. Find a table (e.g., "Table 1")
4. Click "QR" button
5. Modal opens with QR code
6. QR image displays correctly
7. Download/print QR if available
```

✅ **Expected Result**: QR code displays and is scannable

### Test Case 7: QR Code Access - Guest Menu
```
1. Scan QR from Table 1
2. Page should identify table automatically
3. Verify:
   - Table name displayed (if applicable)
   - Menu loads with all categories
   - Search functionality works
   - Filters work (vegetarian, allergens)
   - Item images load
   - Prices display correctly
```

✅ **Expected Result**: Menu displays correctly with table identification

### Test Case 8: Item Customization
```
1. From menu, select any item
2. Item detail modal opens
3. Verify displayed:
   - Item name, price, description
   - Prep time, calories, allergens
   - Customer ratings/reviews
4. Customize:
   - Add extras (e.g., +cheese, +sauce)
   - Verify price updates with delta
   - Remove items (e.g., remove onion)
   - Verify price decreases if applicable
   - Select spice level (if available)
5. Add to cart with quantity > 1
```

✅ **Expected Result**: Customizations reflected in price and cart

### Test Case 9: Cart Management
```
1. Add 3 items to cart
2. Verify cart badge shows count
3. Open cart
4. Verify:
   - All items with correct quantities
   - Customizations preserved
   - Subtotal calculated correctly
5. Remove one item
6. Modify quantity of another
7. Verify subtotal updates in real-time
8. Clear cart
9. Verify empty cart message shown
```

✅ **Expected Result**: Cart reflects all changes correctly

### Test Case 10: Checkout & Payment Methods
```
1. Add items to cart
2. Navigate to checkout
3. Fill in guest details (name optional)
4. Select each payment method:
   - Cash: Should allow checkout
   - Card: Should simulate card flow
   - Mobile Money: Should work
   - Bank Transfer: Should work
5. Apply coupon `WELCOME10`
6. Verify:
   - Discount applied correctly (10%)
   - Tax calculated (15%)
   - Total updated
7. Add custom tip
8. Verify tip added to total
9. Submit order
```

✅ **Expected Result**: Order placed successfully, order ID returned

### Test Case 11: Order Tracking
```
After placing order:
1. Redirected to /track/:orderId
2. Verify displays:
   - Order ID
   - Items ordered
   - Order status (processing → preparing → ready → delivered)
   - Estimated time remaining
   - Real-time updates as status changes
3. Timeline shows progression
4. Customer can leave feedback (after ready/delivered)
```

✅ **Expected Result**: Order tracked in real-time

### Test Case 12: Feedback & Rating
```
1. After order delivered, click "Rate Order"
2. Leave rating (1-5 stars)
3. Leave written feedback
4. Optional: Select specific aspects (food, service, speed)
5. Submit feedback
6. Verify:
   - Feedback saved
   - AI sentiment analysis runs
   - Results displayed to guest
   - Visible to manager in Analytics
```

✅ **Expected Result**: Feedback submitted and AI analysis appears

### Test Case 13: Order History
```
1. After multiple orders, navigate to /history/:customerId
2. Verify displays:
   - All past orders
   - Order dates, totals, statuses
   - Ability to view receipt
   - Ability to reorder (if available)
```

✅ **Expected Result**: Complete order history displayed

---

## 👨‍🍳 Kitchen Dashboard Tests

### Test Case 14: Kitchen Ticket Board
```
Kitchen Staff (kitchen@hotel.com):
1. Log in as kitchen staff
2. Navigate to /kitchen
3. Verify displays:
   - All pending orders as tickets
   - Order number, items, customizations
   - Customer notes (if any)
   - Table/Room number
   - Time order was placed
   - Real-time updates as new orders arrive
```

✅ **Expected Result**: Ticket board displays all pending orders

### Test Case 15: Order Preparation Workflow
```
1. Select an order from ticket board
2. Click "Accept"
3. Verify status changes to "In Progress" (or similar)
4. Click "Start Prep" (if available)
5. Verify timer/duration displayed
6. Simulate preparation time
7. Click "Mark Ready"
8. Verify:
   - Status becomes "Ready"
   - Order disappears from board (or moves to ready section)
   - Waiter is notified (real-time Socket.IO)
   - Guest sees updated status in tracking
```

✅ **Expected Result**: Order moves through kitchen workflow smoothly

### Test Case 16: Socket.IO Real-time Updates
```
Setup: 2 browsers/tabs open
- Tab 1: Kitchen staff at /kitchen
- Tab 2: Guest at /track/:orderId
```
1. Place new order in guest tab
2. Verify order appears immediately in kitchen (no refresh)
3. Kitchen accepts order
4. Guest tracking updates in real-time
5. Kitchen starts prep
6. Guest sees "Preparing" status instantly
7. Kitchen marks ready
8. Guest sees "Ready for pickup" instantly

✅ **Expected Result**: All updates are instant via Socket.IO

---

## 🚶 Waiter Dashboard Tests

### Test Case 17: Waiter Service Requests
```
Waiter (waiter@hotel.com):
1. Log in as waiter
2. Navigate to /waiter
3. View pending service requests (towels, water, cleaning, etc.)
4. Select one request
5. Mark as "Accepted"
6. Complete the request
7. Verify:
   - Request removed from list
   - Guest is notified of completion
   - Manager can see completion in logs
```

✅ **Expected Result**: Service requests workflow completes

### Test Case 18: Order Delivery Tracking
```
1. From waiter dashboard, view pending deliveries
2. Accept delivery
3. Navigate to table/room
4. Deliver order
5. Mark as "Delivered" in system
6. Verify:
   - Guest sees order as delivered
   - Delivery time recorded
   - Order ready for payment
```

✅ **Expected Result**: Delivery tracked and guest notified

---

## 👔 Manager Dashboard Tests

### Test Case 19: Dashboard Overview
```
Manager (manager@hotel.com):
1. Log in as manager
2. Navigate to /manager (dashboard)
3. Verify displays:
   - Today's revenue
   - Total orders count
   - Average prep time
   - Peak order hours (if available)
   - Active tables/rooms
   - Staff online status
```

✅ **Expected Result**: Dashboard KPIs displayed

### Test Case 20: Menu Management
```
1. From manager dashboard, navigate to "Menu"
2. Verify displays all menu items in categories
3. Add New Item:
   - Fill form (name, price, category, description)
   - Upload image (if needed)
   - Add ingredients (if inventory tracking enabled)
   - Set allergens, calories, prep time
   - Save
   - Verify item appears in guest menu (with refresh)
4. Edit Item:
   - Change price, description
   - Save
   - Verify changes in guest menu
5. Delete Item:
   - Remove one item
   - Verify "Out of Stock" or removed from menu
```

✅ **Expected Result**: Menu CRUD operations work

### Test Case 21: Inventory Management
```
1. Navigate to "Inventory"
2. Verify displays all ingredients with:
   - Current stock
   - Reorder level
   - Unit cost
3. Add Stock:
   - Select ingredient
   - Increase quantity
   - Save
   - Verify stock updated
4. View Low Stock Alerts:
   - Should show items below reorder level
   - Should suggest reordering
5. Disable Item (if stock is 0):
   - Item should become unavailable in guest menu
```

✅ **Expected Result**: Inventory management works correctly

### Test Case 22: Coupon Management
```
1. Navigate to "Coupons"
2. Create New Coupon:
   - Code: TEST20
   - Discount: 20% or fixed amount
   - Valid until: Future date
   - Applicable to: All items or specific category
   - Save
3. Test in checkout:
   - Use new coupon code
   - Verify discount applies
4. Disable Coupon:
   - Mark as inactive
   - Try to use in checkout
   - Verify rejected with message
```

✅ **Expected Result**: Coupons created, applied, and managed correctly

### Test Case 23: Staff Management
```
1. Navigate to "Staff"
2. Verify all staff members listed with:
   - Name, email, role
   - Status (active/inactive)
3. Add New Staff:
   - Fill form with email, name, role
   - Password auto-generated or set manually
   - Save
   - Verify new account can log in
4. Edit Staff:
   - Change role
   - Disable account
   - Save
5. Verify permissions update immediately
```

✅ **Expected Result**: Staff management works

### Test Case 24: Orders Management
```
1. Navigate to "Orders"
2. Verify displays all orders with:
   - Order ID, table/room, customer, status
   - Items, total, payment method
   - Filters: status, branch, date range
3. Filter by status (pending, preparing, ready, delivered, cancelled)
4. View order details
5. Change status if needed (manager override)
6. Cancel order if needed
7. Verify changes reflected in kitchen/waiter/guest views
```

✅ **Expected Result**: Order management works

### Test Case 25: Feedback & Analytics
```
1. Navigate to "Feedback" tab
2. Verify displays:
   - Recent customer reviews
   - AI sentiment analysis (positive/negative/neutral)
   - Aspect breakdown (food, service, speed, value)
   - Top-rated items
   - Most-criticized items
3. Export feedback if available
```

✅ **Expected Result**: Feedback visible with AI analysis

### Test Case 26: AI Demand Forecast
```
1. Navigate to "Analytics"
2. View Demand Forecast section
3. Verify displays:
   - Dishes categorized as HIGH/MEDIUM/LOW demand
   - Forecast based on current day of week
   - Historical data points
   - Recommendation to prepare more of HIGH demand items
```

✅ **Expected Result**: Forecast displayed and actionable

### Test Case 27: AI Recommendations
```
During guest ordering:
1. From guest menu, add item to cart
2. Check if "Recommended for you" section appears
3. Verify recommendation reasons:
   - "Similar to items you ordered"
   - "Customers who ordered X also ordered Y"
   - "Popular this week"
4. Click recommended item
5. Verify correct item loads
```

✅ **Expected Result**: Recommendations shown with reasoning

---

## 👨‍💼 Admin Dashboard Tests

### Test Case 28: Admin Overview
```
Admin (admin@hotel.com):
1. Log in as admin
2. Navigate to /admin (dashboard)
3. Verify displays:
   - System-wide statistics
   - Total revenue, users, orders
   - User breakdown by role
   - System health indicators
```

✅ **Expected Result**: Admin dashboard displays

### Test Case 29: User Management
```
1. Navigate to "Users"
2. View all users (staff only, not guests)
3. Create new user:
   - Select role (admin, manager, waiter, kitchen)
   - Enter email, name
   - Set password or auto-generate
   - Save
   - Verify new user can log in
4. Disable/Enable user
5. Delete user (if applicable)
```

✅ **Expected Result**: User management works

### Test Case 30: Audit Logs
```
1. Navigate to "Audit Logs"
2. Verify displays:
   - All staff actions with timestamps
   - Action type (create, update, delete)
   - User who performed action
   - Record affected (order, menu item, staff, etc.)
   - Result (success/failure)
3. Filter by:
   - User
   - Action type
   - Date range
4. Export logs (if available)
```

✅ **Expected Result**: Audit logs tracked and viewable

---

## 🔒 Security Tests

### Test Case 31: Input Validation
```
Try invalid inputs on all forms:
1. Email field: "notanemail", "test@", special chars
2. Phone field: "abc", "-1", too many digits
3. Price field: "-50", "abc", huge numbers
4. Name field: empty, very long strings (>200 chars)

Verify:
- Form shows validation errors
- Cannot submit with invalid data
- Error messages are clear
```

✅ **Expected Result**: All invalid inputs rejected

### Test Case 32: XSS Protection
```
1. Try entering HTML/JS in text fields:
   - <script>alert('xss')</script>
   - <img src=x onerror="alert('xss')">
2. Submit form
3. View submitted data
4. Verify HTML is NOT executed, displayed as text instead
```

✅ **Expected Result**: HTML/JS not executed

### Test Case 33: Rate Limiting
```
1. Make rapid API requests (>100 in 1 minute to same endpoint)
2. Verify:
   - Requests are throttled
   - 429 "Too Many Requests" error returned
   - Message suggests retry after delay
3. Wait for window to reset
4. Requests succeed again
```

✅ **Expected Result**: Rate limiting prevents abuse

### Test Case 34: CORS Security
```
1. From browser console, try fetch from different origin:
   ```javascript
   fetch('http://localhost:5000/api/orders', {
     headers: { 'Authorization': 'Bearer token' }
   })
   ```
2. Verify CORS error if not from allowed origin
3. Verify works from localhost:5173
```

✅ **Expected Result**: CORS restrictions enforced

---

## 🚀 Performance Tests

### Test Case 35: Page Load Time
```
1. Open DevTools → Performance tab
2. Load each page:
   - / (landing)
   - /menu/qrtoken (guest menu)
   - /checkout
   - /track/:orderId
   - /kitchen (staff)
   - /manager (manager)
   - /admin (admin)
3. Target: Initial load <3 seconds, FCP <1.5 seconds
```

✅ **Expected Result**: Pages load quickly

### Test Case 36: Bundle Size
```
1. Run build: npm run client:build
2. Check output size in dist/
3. Target: <500KB gzipped
4. Check no vendor duplication
```

✅ **Expected Result**: Bundle size optimized

### Test Case 37: Database Query Performance
```
1. Monitor API response times:
   - GET /api/orders: <100ms
   - GET /api/catalog: <50ms
   - POST /api/orders: <200ms
2. Check MongoDB query logs
3. Verify indexes are used (no full scans)
```

✅ **Expected Result**: Queries are fast

### Test Case 38: Real-time Performance
```
1. Place order while watching kitchen dashboard
2. Measure time from order submit to kitchen receipt
3. Target: <500ms
4. Send multiple orders rapidly
5. Verify all appear on kitchen without lag
```

✅ **Expected Result**: Real-time updates are instant

---

## 📱 Mobile & Responsive Tests

### Test Case 39: Mobile Menu (Guest)
```
1. Open guest menu on mobile (375px width)
2. Verify:
   - Layout adapts to mobile
   - Touch targets are large (>44px)
   - Images scale correctly
   - Buttons are easily tappable
   - Search bar accessible
   - Cart icon visible
3. Test on different screen sizes (375px, 425px, 768px)
```

✅ **Expected Result**: Mobile experience is smooth

### Test Case 40: Mobile Checkout
```
1. On mobile, proceed to checkout
2. Verify:
   - Payment method buttons fit
   - Coupon input is usable
   - Keyboard doesn't overlap inputs
   - Summary sidebar is scrollable
3. Complete checkout on mobile
```

✅ **Expected Result**: Checkout works on mobile

### Test Case 41: Mobile Staff Dashboards
```
1. Open /kitchen on mobile
2. Verify ticket board is readable at small size
3. Open /manager on mobile
4. Verify dashboard is accessible
5. Test on tablet size (768px)
```

✅ **Expected Result**: Staff dashboards work on tablets

---

## 🌐 Browser Compatibility

### Test Case 42: Browser Testing
```
Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Chrome
- Mobile Safari

Verify:
- No console errors
- All features work
- UI renders correctly
- No layout shifts
```

✅ **Expected Result**: Works on all major browsers

---

## 🔄 Integration Tests

### Test Case 43: Complete Guest-to-Delivery Flow
```
1. Manager generates QR for Table 1
2. Guest scans QR → browses menu → customizes 2 items → checkout
3. Guest applies coupon, adds tip, pays
4. Kitchen receives order in real-time
5. Kitchen accepts and starts prep
6. Guest sees "Preparing" status instantly
7. Kitchen marks ready
8. Guest sees "Ready" status
9. Waiter accepts delivery
10. Waiter marks delivered
11. Guest sees "Delivered"
12. Guest rates order and leaves feedback
13. Manager sees feedback in analytics
14. AI sentiment analysis runs and is viewable

Verify: All steps complete without errors, all communications work
```

✅ **Expected Result**: Complete flow works end-to-end

### Test Case 44: Multi-Table Simultaneous Orders
```
1. Open 3 guest sessions (different QR codes/tables)
2. All three place orders simultaneously
3. Kitchen sees all 3 orders appear instantly
4. All 3 guests see real-time status updates
5. Kitchen prepares in order
6. All deliveries complete

Verify: No conflicts, correct isolation per table
```

✅ **Expected Result**: Handles concurrent orders correctly

### Test Case 45: Branch Isolation
```
1. Create second branch in manager
2. Log in as manager, switch branches
3. Menu should change
4. Orders should only show for current branch
5. Inventory should be per-branch
6. Kitchen should only see their branch orders
7. Switch back to first branch
8. Verify everything switches correctly

Verify: No data leakage between branches
```

✅ **Expected Result**: Branches are properly isolated

---

## 🐛 Bug Regression Tests

### Test Case 46: Known Issues (if any)
```
Document any known issues and verify they don't reoccur:
(Add specific regression tests based on bugs found during dev)
```

✅ **Expected Result**: No regressions

---

## 📊 Testing Report Template

Use this to document your testing results:

```
Testing Session: [Date/Time]
Tester: [Name]
Environment: [Dev/Staging/Prod]

Test Results:
- Total Test Cases: 46
- Passed: [ ]
- Failed: [ ]
- Skipped: [ ]
- Blockers: [ ]

Critical Issues:
[ ] None
[ ] (describe any critical issues)

Nice-to-Have Issues:
[ ] None
[ ] (describe any non-critical issues)

Performance Metrics:
- Bundle Size: [ ] MB
- Initial Load: [ ] ms
- API Response Time: [ ] ms
- Real-time Latency: [ ] ms

Browser Compatibility:
- Chrome: [ ] Pass/Fail
- Firefox: [ ] Pass/Fail
- Safari: [ ] Pass/Fail
- Edge: [ ] Pass/Fail

Mobile Testing:
- iOS: [ ] Pass/Fail
- Android: [ ] Pass/Fail

Recommendation:
[ ] Ready for Production
[ ] Ready for UAT
[ ] Needs More Testing
```

---

## ✅ Sign-Off

Once all 46 test cases pass, the application is ready for:
- ✅ User Acceptance Testing (UAT)
- ✅ Production Deployment
- ✅ Real Customer Use

---

**Version**: 1.0.0  
**Last Updated**: August 2026
