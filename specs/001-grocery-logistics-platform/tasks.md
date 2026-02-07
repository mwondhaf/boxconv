---
description: 'Task list for Grocery & Logistics Platform (BoxKuBox)'
---

# Tasks: Grocery & Logistics Platform

**Input**: Design documents from `/specs/001-grocery-logistics-platform/`
**Prerequisites**: plan.md, spec.md, contracts/schema.ts
**Migration Source**: Hono + Drizzle + PostgreSQL → TanStack Start + Convex + Clerk

**Tests**: Excluded per Constitution ("Velocity Focus"). Verification is manual.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel with other [P] tasks in same phase
- **[Phase]**: PH0-PH10 matching plan phases
- Include exact file paths

## Path Conventions

- **Frontend Routes**: `src/app/routes/`
- **Frontend Components**: `src/components/`
- **Backend Functions**: `convex/`
- **Schema**: `convex/schema.ts`
- **Utilities**: `src/lib/` and `convex/lib/`

---

## Phase 0: Project Setup

**Purpose**: Initialize project with core dependencies

- [X] T001 [PH0] Initialize TanStack Start project in root directory
- [X] T002 [PH0] [P] Configure Convex - run `npx convex dev` and set up `convex/` directory
- [X] T003 [PH0] [P] Install dependencies: `@clerk/tanstack-start`, `convex`, `@tanstack/react-query`
- [X] T004 [PH0] [P] Install UI dependencies: `tailwindcss`, `@radix-ui/*` (via shadcn), `lucide-react`, `date-fns`
- [X] T005 [PH0] Initialize shadcn/ui: `npx shadcn@latest init` and add core components (button, input, card, dialog, sheet, table, badge, toast)
- [X] T006 [PH0] Configure Tailwind CSS 4.x in `tailwind.config.ts`
- [X] T007 [PH0] Create `src/lib/utils.ts` with `cn()` helper
- [X] T008 [PH0] Create `src/lib/constants.ts` with app constants (currency: 'UGX', timezone: 'Africa/Kampala')
- [ ] T008a [PH0] 🔴 **CRITICAL** Create organization category "Riders" in `convex/organizationCategories.ts` for rider organizations

**Checkpoint**: Project builds, shadcn components available.

---

## Phase 1: Authentication & Authorization

**Purpose**: Set up Clerk auth (no users table - user data from Clerk directly)

- [X] T009 [PH1] Configure Clerk in `convex/auth.config.ts` and environment variables
- [X] T010 [PH1] Create Clerk provider wrapper in `src/routes/__root.tsx` (TanStack Start uses __root__.tsx)
- [X] T011 [PH1] Implement Convex schema in `convex/schema.ts` - uses clerkId (string) for user references, no users table
- [X] T012 [PH1] ~~Create `convex/users.ts`~~ NOT NEEDED - user data comes from Clerk token/API
- [X] T013 [PH1] Create `convex/http.ts` with health endpoint (no user sync webhook needed)
- [X] T014 [PH1] [P] Auth pages handled by Clerk modal/hash routing (SignInButton mode="modal" in __root__.tsx)
- [X] T015 [PH1] [P] Protected layout `src/routes/_authed.tsx` with Clerk guard (already exists)
- [X] T016 [PH1] [P] Auth hooks via CASL: `src/shared/hooks/use-sync-ability.ts` with `useAuthContext`
- [X] T017 [PH1] Role-based redirect via Clerk publicMetadata.platformRole and layout guards (_admin, _vendor, _rider)

**Checkpoint**: Users can sign up, log in, and are redirected based on role.

---

## Phase 2: Organization Foundation

**Purpose**: Vendor/store management infrastructure

> **NOTE**: Members, teams, and invitations are managed via Clerk Organizations API.
> Convex `organizations` table stores business-specific data (location, hours, category).
> See `src/features/admin/api/organizations.ts` for Clerk API functions.
> 
> **Organization Categories**: Some organizations are "rider organizations" (for rider management only).
> These should NOT appear in customer-facing store listings in the mobile app.

### Organization CRUD

- [X] T018 [PH2] Implement `convex/organizations.ts` - queries/mutations for business data (location, hours, category)
  - Created: `getByClerkOrgId`, `getBySlug`, `get`, `list`, `listActive`, `listByCategory`
  - Created: `updateBusinessData`, `toggleBusy`
  - Internal: `createFromClerk`, `updateFromClerk`, `deleteFromClerk` (webhook handlers)
- [X] T019 [PH2] Implement `convex/organizationCategories.ts` - CRUD for vendor categories
  - Created: `list`, `listFlat`, `get`, `getBySlug`, `create`, `update`, `remove`
- [X] T018a [PH2] Implement `convex/http.ts` Clerk webhook for organization sync
  - Handles: `organization.created`, `organization.updated`, `organization.deleted`
- [X] T018b [PH2] Create `src/features/admin/hooks/use-organizations.ts` - Convex React hooks
- [X] T020 [PH2] [P] Create admin vendor list page `src/routes/_authed/_admin/a/vendors.tsx`
  - Created: `src/features/admin/pages/vendors.tsx` with stats cards, table, and edit functionality
- [X] T021 [PH2] [P] Create vendor create/edit sheet `src/features/admin/components/vendor-form-sheet.tsx`
  - Created: Sheet component for editing vendor business data (location, hours, category, status)
- [ ] T021a [PH2] 🔴 **CRITICAL** Update mobile app store queries to filter out organizations with categoryId = "Riders" category
- [ ] T021b [PH2] 🔴 **CRITICAL** Add category filter to `convex/storeLocations.ts` - exclude rider organizations from customer store listings

### Member & Team Management (Clerk-Managed)

> **NOTE**: These are handled by Clerk Organizations API, not Convex tables.
> See `src/features/admin/api/organizations.ts` for existing implementations.

- [X] T022 [PH2] Member management via Clerk API - `addOrganizationMember`, `removeOrganizationMember`, `updateMemberRole`
- [X] T023 [PH2] ~~Implement `convex/teams.ts`~~ SKIPPED - Use Clerk org roles instead
- [X] T024 [PH2] ~~Implement `convex/teamMembers.ts`~~ SKIPPED - Use Clerk org roles instead
- [X] T025 [PH2] ~~Implement `convex/invitations.ts`~~ SKIPPED - Use Clerk organization invitations
- [X] T025a [PH2] ~~Integrate email service~~ SKIPPED - Clerk handles invitation emails
- [X] T025b [PH2] ~~Create invitation email template~~ SKIPPED - Clerk handles invitation emails
- [X] T026 [PH2] [P] Create vendor team page using Clerk `<OrganizationProfile />` - `src/routes/_authed/_vendor/v/team.tsx`
- [X] T027 [PH2] [P] ~~Create invitation accept page~~ SKIPPED - Clerk handles invitation flow

### Organization Settings

- [X] T028 [PH2] [P] Create vendor settings page `src/routes/_authed/_vendor/v/settings.tsx`
- [X] T029 [PH2] [P] Create operating hours editor `src/features/vendor/components/operating-hours-form.tsx`
- [X] T030 [PH2] Create organization hooks in `src/features/admin/hooks/use-organizations.ts`

**Checkpoint**: Admins can create vendors, vendors can manage team (via Clerk) and settings.

---

## Phase 3: Product Catalog (Admin)

**Purpose**: Master product catalog management

### Category & Brand CRUD

- [X] T031 [PH3] Implement `convex/categories.ts` - CRUD with hierarchy support
- [X] T032 [PH3] Implement `convex/brands.ts` - CRUD
- [X] T033 [PH3] [P] Create admin categories page `src/routes/_authed/_admin/a/categories.tsx`
- [X] T034 [PH3] [P] Create admin brands page `src/routes/_authed/_admin/a/brands.tsx`

### Master Product CRUD

- [X] T035 [PH3] Implement `convex/products.ts` - create, update, archive, list, get, search
- [X] T036 [PH3] Implement `convex/productImages.ts` - upload to R2 storage, set primary
- [X] T037 [PH3] Implement `convex/productTags.ts` - add/remove tags (inline in products.ts)
- [X] T038 [PH3] [P] Create admin products page `src/routes/_authed/_admin/a/products.tsx`
- [X] T039 [PH3] [P] Create product form sheet `src/features/admin/components/product-form-sheet.tsx` with image upload
- [X] T040 [PH3] [P] Create product detail sheet `src/features/admin/components/product-detail-sheet.tsx`
- [X] T041 [PH3] Enforce admin-only (isStaff) authorization on all product mutations (via _admin layout guard)

**Checkpoint**: Admins can fully manage master catalog with images and categories. ✅ COMPLETE

---

## Phase 4: Vendor Variants & Pricing

**Purpose**: Vendor-specific product listings with pricing

### Variant CRUD

- [X] T042 [PH4] Implement `convex/productVariants.ts` - create, update, list by org, list by product, toggle availability
- [X] T043 [PH4] Implement `convex/priceSets.ts` - create price set for variant (inline in productVariants.ts)
- [X] T044 [PH4] Implement `convex/moneyAmounts.ts` - set regular and sale prices, tiered pricing (inline in productVariants.ts)
- [X] T045 [PH4] [P] Create vendor catalog browse page `src/routes/_authed/_vendor/v/products.tsx`
- [X] T046 [PH4] [P] Create variant form sheet `src/features/vendor/components/variant-edit-sheet.tsx` (select product, set SKU/unit/price/stock)
- [X] T047 [PH4] [P] Create vendor variants list page `src/routes/_authed/_vendor/v/variants.tsx`
- [X] T048 [PH4] Implement stock quantity update mutation in `convex/productVariants.ts` (updateStock, adjustStock)
- [X] T049 [PH4] Implement approval workflow - isApproved toggle (admin can approve via setApproval mutation)
- [X] T049a [PH4] Create `convex/productVariants.ts` - listAll query supports isApproved=false filter
- [X] T049b [PH4] [P] Admin pending approvals via variants-browser.tsx with approval filter (no dedicated page needed)
- [X] T049c [PH4] [P] Create variant approval card `src/features/admin/components/variant-card.tsx` with approval badge
- [X] T049d [PH4] Variants nav item in admin sidebar (pending counter can be added as enhancement)

**Checkpoint**: Vendors can create variants with prices, manage stock. Admin must approve variants before they appear in store. ✅ COMPLETE

---

## Phase 5: Customer Experience

**Purpose**: Customer-facing store and cart functionality

### Customer Addresses

- [x] T050 [PH5] Implement `convex/customerAddresses.ts` - CRUD, set default
- [ ] T051 [PH5] [P] Create customer addresses page `src/app/routes/_authed/_customer/addresses/index.tsx` (SKIPPED - mobile app only)
- [ ] T052 [PH5] [P] Create address form sheet `src/components/customer/address-form-sheet.tsx` (SKIPPED - mobile app only)

### Store Browsing/

- [x] T053 [PH5] Implement store queries in `convex/organizations.ts` - listActive with open/closed status
- [x] T054 [PH5] Implement `convex/productVariants.ts` - listByOrgWithPrices (join variant + priceSet + moneyAmount)
- [ ] T055 [PH5] [P] Create store list page `src/app/routes/_authed/_customer/store/index.tsx` (SKIPPED - mobile app only)
- [ ] T056 [PH5] [P] Create store products page `src/app/routes/_authed/_customer/store/$orgId.tsx` (SKIPPED - mobile app only)
- [ ] T057 [PH5] [P] Create product card component `src/components/customer/product-card.tsx` (SKIPPED - mobile app only)

### Shopping Cart

- [x] T058 [PH5] Implement `convex/carts.ts` - create, get, addItem, updateQuantity, removeItem, clear
- [x] T059 [PH5] Implement `convex/cartItems.ts` - CRUD for cart items (merged into carts.ts)
- [x] T060 [PH5] Create cart expiration scheduled function in `convex/carts.ts`
- [ ] T061 [PH5] [P] Create cart page `src/app/routes/_authed/_customer/cart/index.tsx` (SKIPPED - mobile app only)
- [ ] T062 [PH5] [P] Create cart item component `src/components/customer/cart-item.tsx` (SKIPPED - mobile app only)

### Checkout

- [x] T063 [PH5] Implement delivery quote action in `convex/carts.ts` - uses external distance API (DONE: getDeliveryQuote in orders.ts)
- [x] T064 [PH5] Create `convex/lib/geohash.ts` for geohash encoding
- [x] T065 [PH5] Create `convex/lib/fare.ts` for delivery fare calculation
- [ ] T066 [PH5] [P] Create checkout page `src/app/routes/_authed/_customer/checkout/index.tsx` (SKIPPED - mobile app only)
- [ ] T067 [PH5] [P] Create address selector component `src/components/customer/address-selector.tsx` (SKIPPED - mobile app only)
- [x] T068 [PH5] Implement price validation at checkout - compare cart prices to current prices
- [ ] T068a [PH5] 🔴 **CRITICAL** Update mobile app checkout screen to fetch and display delivery quote using `api.orders.getDeliveryQuote`
- [ ] T068b [PH5] 🔴 **CRITICAL** Add delivery fee to order summary in mobile checkout UI (show subtotal + delivery = total)
- [ ] T068c [PH5] 🔴 **CRITICAL** Update checkout flow to include delivery quote in order totals before submission

**Checkpoint**: Customers can browse, add to cart, see delivery prices, and proceed to checkout.

---

## Phase 6: Order Management

**Purpose**: Complete order lifecycle

> **Note**: Orders are created by customers using mobile apps. Customer UI tasks (T074, T075) are skipped as they're handled in the mobile app. Delivery is handled by internal riders (not external providers like SafeBoda/Bolt).

### Order Creation & Status

- [x] T069 [PH6] Implement `convex/counters.ts` - atomic increment for displayId generation (implemented in `convex/orders.ts` inline)
- [x] T070 [PH6] Implement `convex/orders.ts` - createFromCart, updateStatus, accept, reject, list, get
- [x] T070a [PH6] Implement order expiration scheduled function in `convex/scheduledJobs.ts` - autoCancelStaleOrders (6 hours for pending)
- [ ] T070b [PH6] Create `convex/lib/scheduler.ts` helper for scheduling with delay constants
- [x] T071 [PH6] Implement order items in `convex/orders.ts` - created from cart items during checkout
- [x] T072 [PH6] Implement order events logging in `convex/orders.ts` - all status changes logged to orderEvents
- [x] T073 [PH6] Implement `convex/orderItemEvents.ts` - schema exists, logging available

### Customer Order UI (Mobile App)

- [x] T074 [PH6] Customer orders queries in `convex/orders.ts` - listByCustomer, getActiveOrders, getTrackingInfo (MOBILE APP)
- [x] T075 [PH6] Order detail query in `convex/orders.ts` - get with full details (MOBILE APP)
- [x] T076 [PH6] [P] Create order status badge `src/components/orders/order-status-badge.tsx`
- [ ] T077 [PH6] [P] Create order items table `src/components/orders/order-items-table.tsx`

### Vendor Order Management

- [x] T078 [PH6] [P] Create vendor orders page `src/features/vendor/pages/orders.tsx` with filters (uses OrdersTable)
- [x] T079 [PH6] [P] Create vendor order detail sheet `src/features/vendor/components/order-detail-sheet.tsx`
- [x] T080 [PH6] Implement accept order flow - confirm mutation in `convex/orders.ts`
- [x] T081 [PH6] Implement reject/cancel order flow - cancel mutation with reason and notification

### Internal Rider Management

> **Changed**: Using internal riders instead of external delivery providers. Replaced deliveryHandoffs with riders module.

- [x] T082 [PH6] Implement `convex/riders.ts` - rider management, delivery acceptance, status updates
- [x] T082a [PH6] Implement rider location tracking with `riderLocations` table
- [x] T082b [PH6] Add rider status (online/offline/busy) and earnings tracking
- [x] T083 [PH6] Implement rider actions - acceptDelivery, markPickedUp, markDelivered, cancelDelivery
- [x] T083a [PH6] Implement push notifications for riders via `convex/notifications.ts`
- [x] T084 [PH6] ~~Implement webhook handler for external delivery~~ N/A - using internal riders

### Checkout Module

- [x] T084a [PH6] Implement `convex/checkout.ts` - validate, complete checkout flow
- [x] T084b [PH6] Implement delivery quote in `convex/orders.ts` - getDeliveryQuote
- [x] T084c [PH6] Implement mobile money payment placeholder in `convex/checkout.ts`

### Admin Orders View

- [x] T085 [PH6] [P] Create admin orders page `src/routes/_authed/_admin/a/orders.tsx` with all-platform view
- [x] T086 [PH6] [P] Create admin order detail sheet - reusing `src/features/vendor/components/order-detail-sheet.tsx`

### Vendor Components

- [x] T087a [PH6] Create `src/features/vendor/components/orders-table.tsx` - reusable DataTable for orders
- [x] T087b [PH6] Create `src/features/vendor/hooks/use-orders.ts` - order query/mutation hooks

**Checkpoint**: Full order lifecycle from cart to delivery handoff.

---

## Phase 7: P2P Parcel Delivery

**Purpose**: Point-to-point package delivery requests

### Parcel CRUD

- [ ] T087 [PH7] Implement `convex/parcels.ts` - create, updateStatus, cancel, list, get
- [ ] T088 [PH7] Implement `convex/parcelEvents.ts` - log status changes
- [ ] T089 [PH7] Implement verification code generation in `convex/parcels.ts`
- [ ] T090 [PH7] Implement fare calculation for parcels using size category and distance

### Parcel UI

- [ ] T091 [PH7] [P] Create parcel request page `src/app/routes/_authed/_customer/parcels/new.tsx`
- [ ] T092 [PH7] [P] Create parcel form component `src/components/customer/parcel-form.tsx`
- [ ] T093 [PH7] [P] Create customer parcels list `src/app/routes/_authed/_customer/parcels/index.tsx`
- [ ] T094 [PH7] [P] Create parcel detail page `src/app/routes/_authed/_customer/parcels/$parcelId.tsx`
- [ ] T095 [PH7] [P] Create parcel status badge `src/components/parcels/parcel-status-badge.tsx`

### Admin Parcels View

- [ ] T096 [PH7] [P] Create admin parcels page `src/app/routes/_authed/_admin/parcels/index.tsx`
- [ ] T097 [PH7] [P] Create admin parcel detail sheet `src/components/admin/parcel-detail-sheet.tsx`

**Checkpoint**: Customers can request P2P delivery with fare estimate.

---

## Phase 8: Promotions System

**Purpose**: Marketing campaigns and discount codes

### Campaign CRUD

- [ ] T098 [PH8] Implement `convex/campaigns.ts` - create, update, soft delete, list
- [ ] T099 [PH8] Implement `convex/campaignBudgets.ts` - create, update usage

### Promotion CRUD

- [ ] T100 [PH8] Implement `convex/promotions.ts` - create, update, soft delete, list, validate code
- [ ] T101 [PH8] Implement `convex/applicationMethods.ts` - create, update
- [ ] T102 [PH8] Implement `convex/promotionRules.ts` - create rules with values
- [ ] T103 [PH8] Implement `convex/promotionUsages.ts` - track usage

### Promotion Application

- [ ] T104 [PH8] Implement promotion validation logic in `convex/promotions.ts` - check rules, budget, usage limits
- [ ] T105 [PH8] Integrate promotion application into checkout flow in `convex/orders.ts`

### Promotion UI

- [ ] T106 [PH8] [P] Create admin campaigns page `src/app/routes/_authed/_admin/promotions/index.tsx`
- [ ] T107 [PH8] [P] Create campaign form sheet `src/components/admin/campaign-form-sheet.tsx`
- [ ] T108 [PH8] [P] Create promotion form sheet `src/components/admin/promotion-form-sheet.tsx`
- [ ] T109 [PH8] [P] Create vendor promotions page `src/app/routes/_authed/_vendor/promotions/index.tsx`
- [ ] T110 [PH8] [P] Create promo code input at checkout `src/components/customer/promo-code-input.tsx`

**Checkpoint**: Promotions can be created and applied at checkout.

---

## Phase 9: Dashboards & Analytics

**Purpose**: Business intelligence for admins and vendors

### Admin Dashboard

- [ ] T111 [PH9] Implement `convex/dashboard/admin.ts` - platform metrics (orders, revenue, vendors, customers)
- [ ] T112 [PH9] [P] Create admin dashboard page `src/app/routes/_authed/_admin/dashboard/index.tsx`
- [ ] T113 [PH9] [P] Create metrics cards component `src/components/dashboard/metrics-cards.tsx`
- [ ] T114 [PH9] [P] Create revenue chart component `src/components/dashboard/revenue-chart.tsx` (using recharts)
- [ ] T115 [PH9] [P] Create order status chart component `src/components/dashboard/order-status-chart.tsx`

### Vendor Dashboard

- [ ] T116 [PH9] Implement `convex/dashboard/vendor.ts` - store metrics (orders, revenue, low stock, pending)
- [ ] T117 [PH9] [P] Create vendor dashboard page `src/app/routes/_authed/_vendor/dashboard/index.tsx`
- [ ] T118 [PH9] [P] Create low stock alerts component `src/components/vendor/low-stock-alerts.tsx`
- [ ] T119 [PH9] [P] Create top products component `src/components/vendor/top-products.tsx`

**Checkpoint**: Admins and vendors can view key metrics.

---

## Phase 10: Polish & Integration

**Purpose**: Final improvements and verification

### Layout & Navigation

- [ ] T120 [PH10] Create app sidebar `src/components/layout/app-sidebar.tsx` with role-based navigation
- [ ] T121 [PH10] Create nav components `src/components/layout/nav-main.tsx`, `nav-user.tsx`
- [ ] T122 [PH10] [P] Create admin layout `src/app/routes/_authed/_admin.tsx` with sidebar
- [ ] T123 [PH10] [P] Create vendor layout `src/app/routes/_authed/_vendor.tsx` with sidebar
- [ ] T124 [PH10] [P] Create customer layout `src/app/routes/_authed/_customer.tsx` with header

### Error Handling & UX

- [ ] T125 [PH10] [P] Add toast notifications throughout app (sonner)
- [ ] T126 [PH10] [P] Add loading states and skeletons
- [ ] T127 [PH10] [P] Add error boundaries
- [ ] T128 [PH10] [P] Add responsive design for mobile

### Landing Page

- [ ] T129 [PH10] [P] Create landing page `src/app/routes/index.tsx` with hero, benefits, CTA
- [ ] T130 [PH10] [P] Create vendor registration form component

### Webhooks & External Integration

- [ ] T131 [PH10] Complete webhook handler in `convex/http.ts` for delivery status updates
- [ ] T132 [PH10] Add webhook signature verification

### Final Verification

- [ ] T133 [PH10] Full end-to-end manual verification: Admin creates product → Vendor lists variant → Customer orders → Delivery handoff
- [ ] T134 [PH10] Update `quickstart.md` with final setup and testing instructions

---

## Dependencies & Execution Order

### Phase Dependencies

```
PH0 (Setup) → PH1 (Auth) → PH2 (Org Foundation) ─┬→ PH3 (Products)
                                                  │
                                                  └→ PH5 (Customer) depends on PH4
                                                      │
                                                  PH4 (Variants) ← depends on PH3
                                                      │
                                                  PH6 (Orders) ← depends on PH5
                                                      │
                                                  ├→ PH7 (Parcels) - can parallel with PH6
                                                  │
                                                  ├→ PH8 (Promotions) - can parallel
                                                  │
                                                  └→ PH9 (Dashboards) - depends on PH6

PH10 (Polish) ← depends on all phases
```

### Parallel Opportunities

| Parallel Group   | Tasks                                                |
| ---------------- | ---------------------------------------------------- |
| PH0 Dependencies | T002, T003, T004                                     |
| PH1 UI           | T014, T015, T016                                     |
| PH2 Admin UI     | T020, T021                                           |
| PH2 Vendor UI    | T026, T027, T028, T029                               |
| PH3 Admin UI     | T033, T034, T038, T039, T040                         |
| PH4 Vendor UI    | T045, T046, T047                                     |
| PH5 Customer UI  | T051, T052, T055, T056, T057, T061, T062, T066, T067 |
| PH6 Orders UI    | T074-T086 (all [P] marked)                           |
| PH7 Parcels UI   | T091-T097 (all [P] marked)                           |
| PH8 Promo UI     | T106-T110 (all [P] marked)                           |
| PH9 Dashboard UI | T112-T119 (all [P] marked)                           |
| PH10 Layout      | T120-T130 (all [P] marked)                           |

### Critical Path

1. T001-T008 (Setup)
2. T009-T017 (Auth)
3. T011 (Schema - blocking all data work)
4. T018-T030 (Org Foundation)
5. T031-T041 (Products)
6. T042-T049d (Variants + Approval Workflow)
7. T050-T068 (Customer + Cart)
8. T069-T086 (Orders + Expiration + Delivery Handoff)
9. T133 (Verification)

---

## Implementation Strategy

### MVP Milestone 1: Grocery Ordering

Complete: PH0 → PH1 → PH2 → PH3 → PH4 → PH5 → PH6 (T001-T086)

**Manual Test**: Admin creates "Fresh Milk", Vendor lists it at 5000 UGX, Customer orders it, Vendor accepts.

### MVP Milestone 2: P2P Delivery

Complete: PH7 (T087-T097)

**Manual Test**: Customer requests A→B delivery, sees fare, submits.

### MVP Milestone 3: Promotions

Complete: PH8 (T098-T110)

**Manual Test**: Admin creates "SAVE10" promotion, Customer applies at checkout, discount shown.

### MVP Milestone 4: Complete Platform

Complete: PH9 → PH10 (T111-T134)

**Manual Test**: Full platform flow with dashboards and polished UI.
**Checkpoint**: Advanced features complete, platform fully polished

---

## 🔴 CRITICAL TASKS - IMPLEMENT FIRST

**Priority**: Must complete before mobile app can function properly for order placement

### For Delivery Pricing in Mobile App:
1. **T068a** [PH5] Update mobile app checkout screen to fetch delivery quote
   - File: `boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx`
   - Action: Add `useQuery` to call `api.orders.getDeliveryQuote` for each store
   - Pass: organizationId, deliveryAddressId, orderSubtotal
   - Display: Delivery fee in order summary

2. **T068b** [PH5] Add delivery fee UI in checkout
   - File: `boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx`
   - Show: Subtotal, Delivery Fee, Total (per store)
   - Update: Grand total calculation to include delivery fees

3. **T068c** [PH5] Include delivery totals in order submission
   - Ensure checkout.complete receives accurate delivery totals
   - Backend already calculates in completeCheckout mutation

### For Organization Filtering (Rider Organizations):
4. **T008a** [PH0] Create "Riders" organization category
   - File: `convex/organizationCategories.ts`
   - Action: Create category with name="Riders", slug="riders"
   - Or: Add via Convex dashboard / seed data

5. **T021a** [PH2] Filter rider organizations in mobile app
   - File: `boxkuboxapp/lib/convex-queries.ts` or store location hooks
   - Action: Exclude organizations where categoryId = riders category
   - Apply to: Store listings, browse, search

6. **T021b** [PH2] Backend filtering for rider organizations
   - File: `convex/storeLocations.ts` or organization queries
   - Action: Add categoryId filter parameter
   - Ensure: Rider organizations only visible to admin/rider views

**Estimated Time**: 1-2 days for all 6 critical tasks
**Impact**: Enables complete order placement with accurate delivery pricing and clean store listings

---

## Phase 11: BoxRiders - Advanced Rider Management

**Purpose**: Comprehensive rider management system with Uganda-specific compliance
**Reference**: `BOXRIDERS_FEATURES_IMPLEMENTATION.md`, `BOXRIDERS_FEATURES_SUMMARY.md`, `riders.md`
**Duration**: 8-10 weeks
**Priority**: 🔴 Critical for platform completion

> **NOTE**: Phase 6 already has basic rider functionality (T082-T084). Phase 11 extends this with:
> - Complete rider profiles and registration
> - Uganda compliance tracking (NIN, permits, TIN)
> - Stage/hub management
> - Performance ratings and analytics
> - Payout system (mobile money, bank, cash)
> - Auto-assignment algorithms
> - Mobile rider app experience

### Subphase 11.1: Schema & Foundation (3-5 days)

- [ ] T135 [PH11] [P] Extend `convex/schema.ts` - Add `riders` table with full profile fields
  - Identity: clerkId, riderCode, status, available, lastOnlineAt
  - Contact: phoneNumber, nextOfKinName, nextOfKinPhone
  - Compliance: nationalId, drivingPermitNumber, tin, helmetVerified, licenseExpiry, insuranceExpiry
  - Vehicle: vehicleType, vehiclePlate, vehicleMake, vehicleColor
  - Geography: district, subCounty, parish, village
  - Payout: preferredPayoutMethod, mobileMoneyNumber, bankAccountNumber
  - Performance: ratingSum, ratingCount, completedDeliveries, canceledDeliveries
- [ ] T136 [PH11] [P] Extend `convex/schema.ts` - Add `stages`, `riderStageMemberships`, `riderRatings`, `riderPayouts`, `riderDocuments` tables
- [ ] T137 [PH11] [P] Create `convex/lib/riderUtils.ts` - Rider code generation (RDR-XXXXXX), phone normalization (+256)
- [ ] T138 [PH11] [P] Create `convex/lib/performanceUtils.ts` - Rating calculations, acceptance rate, on-time rate

### Subphase 11.2: Registration & Profiles (5-7 days)

- [ ] T139 [PH11] Create `convex/riders/registration.ts` - Registration mutation with auto rider code generation
- [ ] T140 [PH11] Create `convex/riders/queries.ts` - Profile queries (getProfile, getByCode, search)
- [ ] T141 [PH11] Create `convex/riders/mutations.ts` - Profile updates (basic, compliance, vehicle, payout)
- [ ] T142 [PH11] Create `convex/riders/approval.ts` - Approval workflow (approve, suspend, reactivate)
- [ ] T143 [PH11] [P] Create `src/components/rider/RiderRegistrationForm.tsx` - Multi-step registration form
- [ ] T144 [PH11] [P] Create `src/components/rider/RiderProfileView.tsx` - Display full rider profile
- [ ] T145 [PH11] [P] Create `src/components/rider/RidersList.tsx` - Searchable rider list with filters
- [ ] T146 [PH11] [P] Create `src/components/rider/RiderApprovalQueue.tsx` - Pending approvals view
- [ ] T147 [PH11] [P] Create `src/routes/_authed/_admin/a/riders/index.tsx` - Admin riders list page
- [ ] T148 [PH11] [P] Create `src/routes/_authed/_admin/a/riders/new.tsx` - New rider registration page
- [ ] T149 [PH11] [P] Create `src/routes/_authed/_admin/a/riders/$riderId.tsx` - Rider detail page with tabs

### Subphase 11.3: Compliance & Documents (5-7 days)

- [ ] T150 [PH11] Create `convex/riders/compliance.ts` - Compliance management (verify, check expiry)
- [ ] T151 [PH11] Create `convex/riders/documents.ts` - Document upload and verification
- [ ] T152 [PH11] Create `convex/scheduledJobs/riderCompliance.ts` - Auto-check expiring documents
- [ ] T153 [PH11] [P] Create `src/components/rider/ComplianceDocumentsUpload.tsx` - Document upload with R2
- [ ] T154 [PH11] [P] Create `src/components/rider/ComplianceDashboard.tsx` - Compliance overview
- [ ] T155 [PH11] [P] Create `src/routes/_authed/_admin/a/riders/compliance.tsx` - Compliance page

### Subphase 11.4: Stage/Hub Management (5-7 days)

- [ ] T156 [PH11] Create `convex/stages/mutations.ts` - Stage CRUD (create, update, assign riders)
- [ ] T157 [PH11] Create `convex/stages/queries.ts` - Stage queries (list, riders by stage, history)
- [ ] T158 [PH11] [P] Create `src/components/stages/StageForm.tsx` - Create/edit stage with map picker
- [ ] T159 [PH11] [P] Create `src/components/stages/StagesList.tsx` - List all stages
- [ ] T160 [PH11] [P] Create `src/routes/_authed/_admin/a/stages/index.tsx` - Stages management page

### Subphase 11.5: Performance & Ratings (4-6 days)

- [ ] T161 [PH11] Create `convex/riders/ratings.ts` - Rating system (rate rider, update counters)
- [ ] T162 [PH11] Create `convex/riders/performance.ts` - Performance metrics (acceptance rate, on-time, leaderboard)
- [ ] T163 [PH11] Update `convex/riders.ts` - Add rating trigger after delivery completion
- [ ] T164 [PH11] [P] Create `src/components/rider/RiderRatingDisplay.tsx` - Star rating component
- [ ] T165 [PH11] [P] Create `src/components/rider/RiderPerformanceDashboard.tsx` - Performance stats and charts
- [ ] T166 [PH11] [P] Create `src/components/rider/RiderLeaderboard.tsx` - Top riders display

### Subphase 11.6: Payouts & Earnings (10-14 days)

- [ ] T167 [PH11] Create `convex/riders/earnings.ts` - Earnings tracking (daily, weekly, monthly summaries)
- [ ] T168 [PH11] Create `convex/payouts/batch.ts` - Batch payout generation
- [ ] T169 [PH11] Create `convex/payouts/process.ts` - Payout processing (mark paid, cancel)
- [ ] T170 [PH11] Create `convex/integrations/mobileMoney.ts` - Mobile money integration (MTN, Airtel)
- [ ] T171 [PH11] [P] Create `src/components/payouts/PayoutMethodSelector.tsx` - Payment method form
- [ ] T172 [PH11] [P] Create `src/components/payouts/EarningsDashboard.tsx` - Earnings overview with charts
- [ ] T173 [PH11] [P] Create `src/components/payouts/PayoutBatchManager.tsx` - Batch processing UI
- [ ] T174 [PH11] [P] Create `src/routes/_authed/_admin/a/payouts/index.tsx` - Payouts management page

### Subphase 11.7: Auto-Assignment Algorithm (7-10 days)

- [ ] T175 [PH11] Create `convex/assignment/scoring.ts` - Rider scoring (distance 40%, availability 30%, performance 20%, compliance 10%)
- [ ] T176 [PH11] Create `convex/assignment/autoAssign.ts` - Auto-assignment logic with scoring
- [ ] T177 [PH11] Update `convex/riders.ts` - Enhanced geospatial queries with geohash
- [ ] T178 [PH11] [P] Create `src/components/assignment/AutoAssignToggle.tsx` - Enable auto-assign UI
- [ ] T179 [PH11] [P] Create `src/components/assignment/AssignmentAnalytics.tsx` - Assignment metrics

### Subphase 11.8: Mobile Rider App (10-14 days)

> **Platform**: BoxKuBoxApp (React Native)

- [ ] T180 [PH11] [P] Create `app/(all)/(rider)/index.tsx` - Rider dashboard with stats and status toggle
- [ ] T181 [PH11] [P] Create `app/(all)/(rider)/profile/index.tsx` - Rider profile screen
- [ ] T182 [PH11] [P] Create `app/(all)/(rider)/profile/edit.tsx` - Edit profile screen
- [ ] T183 [PH11] [P] Create `app/(all)/(rider)/documents/index.tsx` - Documents screen with camera upload
- [ ] T184 [PH11] [P] Create `app/(all)/(rider)/assignments/index.tsx` - Available assignments screen
- [ ] T185 [PH11] [P] Create `app/(all)/(rider)/assignments/[orderId].tsx` - Assignment detail with accept/reject
- [ ] T186 [PH11] [P] Create `app/(all)/(rider)/active/index.tsx` - Current delivery screen with navigation
- [ ] T187 [PH11] [P] Create `app/(all)/(rider)/delivery/proof.tsx` - Proof of delivery with camera
- [ ] T188 [PH11] [P] Create `app/(all)/(rider)/earnings/index.tsx` - Earnings screen with tabs
- [ ] T189 [PH11] [P] Create `app/(all)/(rider)/history/index.tsx` - Delivery history screen
- [ ] T190 [PH11] [P] Create `components/rider/RiderStatusToggle.tsx` - Online/offline toggle component
- [ ] T191 [PH11] [P] Create `components/rider/DeliveryCard.tsx` - Order card component
- [ ] T192 [PH11] [P] Create `components/rider/EarningsSummaryCard.tsx` - Earnings display component

### Subphase 11.9: Real-Time & Notifications (4-6 days)

- [ ] T193 [PH11] Update `convex/notifications.ts` - Add rider notification types (assignment, earnings, expiry)
- [ ] T194 [PH11] [P] Create `services/locationService.ts` (mobile) - Background GPS tracking (30s intervals)
- [ ] T195 [PH11] [P] Create `services/notificationService.ts` (mobile) - Push notification handler
- [ ] T196 [PH11] [P] Create `services/heartbeatService.ts` (mobile) - Heartbeat system (5min intervals)
- [ ] T197 [PH11] Update mobile rider screens - Add Convex real-time subscriptions

### Subphase 11.10: Admin Operations & Analytics (10-14 days)

- [ ] T198 [PH11] Create `convex/analytics/riders.ts` - Rider analytics queries (growth, trends, coverage)
- [ ] T199 [PH11] [P] Create `src/components/admin/RiderOverviewStats.tsx` - Rider stats cards
- [ ] T200 [PH11] [P] Create `src/components/rider/RiderBulkActions.tsx` - Bulk operations (approve, suspend)
- [ ] T201 [PH11] [P] Create `src/components/analytics/RiderAnalytics.tsx` - Analytics dashboard
- [ ] T202 [PH11] [P] Create `src/components/analytics/ComplianceReports.tsx` - Compliance reports
- [ ] T203 [PH11] [P] Create `src/routes/_authed/_admin/a/analytics/riders.tsx` - Rider analytics page
- [ ] T204 [PH11] Update `src/routes/_authed/_admin/a/index.tsx` - Add rider stats to admin dashboard

### Subphase 11.11: Advanced Features (Optional - Low Priority)

- [ ] T205 [PH11] [P] Create `app/(all)/(rider)/chat/[orderId].tsx` (mobile) - In-app chat with customer/store
- [ ] T206 [PH11] [P] Create `components/rider/MultiStopDelivery.tsx` (mobile) - Multi-stop delivery support
- [ ] T207 [PH11] [P] Create `src/components/maps/RiderHeatMap.tsx` (web) - Geographic heat map
- [ ] T208 [PH11] [P] Create `convex/optimization/routes.ts` - Route optimization for multi-stop
- [ ] T209 [PH11] [P] Create `convex/fraud/detection.ts` - Duplicate rider detection

**Checkpoint**: Complete rider management system operational across web and mobile platforms

---

## Task Count Summary

| Phase     | Count   | Status      | Description             | Critical Tasks           |
| --------- | ------- | ----------- | ----------------------- | ------------------------ |
| PH0       | 9       | ⏳ Pending  | Project Setup           | T008a (org category)     |
| PH1       | 9       | ✅ Complete | Authentication          | -                        |
| PH2       | 17      | ⏳ Pending  | Organization            | T021a, T021b (filtering) |
| PH3       | 11      | ✅ Complete | Products                | -                        |
| PH4       | 12      | ✅ Complete | Variants                | -                        |
| PH5       | 22      | ⏳ Pending  | Customer                | T068a, T068b, T068c (delivery pricing) |
| PH6       | 23      | ⏳ Pending  | Orders                  | -                        |
| PH7       | 11      | ⏳ Pending  | Parcels                 | -                        |
| PH8       | 13      | ⏳ Pending  | Promotions              | -                        |
| PH9       | 9       | ⏳ Pending  | Dashboards              | -                        |
| PH10      | 15      | ⏳ Pending  | Polish                  | -                        |
| PH11      | 75      | ⏳ Pending  | BoxRiders (Advanced)    | -                        |
| **Total** | **226** | **55/226**  | **24% Done**            | **6 critical tasks**     |

### Phase 11 Breakdown

| Subphase   | Tasks  | Duration  | Priority  | Description                    |
| ---------- | ------ | --------- | --------- | ------------------------------ |
| 11.1       | 4      | 3-5 days  | 🔴 Critical | Schema & Foundation           |
| 11.2       | 11     | 5-7 days  | 🔴 Critical | Registration & Profiles       |
| 11.3       | 6      | 5-7 days  | 🔴 Critical | Compliance & Documents        |
| 11.4       | 5      | 5-7 days  | 🟡 Medium   | Stage/Hub Management          |
| 11.5       | 6      | 4-6 days  | 🔴 Critical | Performance & Ratings         |
| 11.6       | 8      | 10-14 days| 🔴 Critical | Payouts & Earnings            |
| 11.7       | 5      | 7-10 days | 🟡 Medium   | Auto-Assignment               |
| 11.8       | 13     | 10-14 days| 🔴 Critical | Mobile Rider App              |
| 11.9       | 5      | 4-6 days  | 🔴 Critical | Real-Time & Notifications     |
| 11.10      | 7      | 10-14 days| 🟡 Medium   | Admin Operations              |
| 11.11      | 5      | Ongoing   | 🟢 Low      | Advanced Features             |
| **Total**  | **75** | **8-10 weeks** |          |                               |
