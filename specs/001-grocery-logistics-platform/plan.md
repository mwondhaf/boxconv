# Implementation Plan: Grocery & Logistics Platform

**Branch**: `001-grocery-logistics-platform` | **Date**: 2026-02-03
**Spec**: [specs/001-grocery-logistics-platform/spec.md](spec.md)
**Migration Source**: Hono + Drizzle + PostgreSQL → TanStack Start + Convex + Clerk

## Summary

BoxKuBox is a multi-vendor grocery delivery and P2P logistics SaaS platform migrated from a Hono/Drizzle/PostgreSQL stack to TanStack Start/Convex/Clerk. The platform supports:

1. **Platform Admins**: Manage master product catalog, categories, brands, vendors, and platform-wide promotions
2. **Vendors (Organizations)**: Manage store profile, product variants (with manual admin approval), pricing, orders, and vendor promotions
3. **Customers**: Browse stores, add items to cart, checkout, request P2P deliveries
4. **Riders**: External system integration for delivery fulfillment

Key clarifications from specification:

- **Order expiration**: 10 minutes auto-cancel if vendor doesn't respond
- **Variant approval**: Manual admin approval required for all variants
- **Delivery handoff retry**: 3 retries with exponential backoff (1m, 5m, 15m)

## Technical Context

| Aspect             | Value                                  |
| ------------------ | -------------------------------------- |
| **Language**       | TypeScript 5.x (Strict mode, no `any`) |
| **Frontend**       | TanStack Start (file-based routing)    |
| **Backend**        | Convex (serverless, realtime)          |
| **Authentication** | Clerk                                  |
| **UI Components**  | shadcn/ui + Tailwind CSS 4.x           |
| **Icons**          | Lucide React                           |
| **Date Handling**  | date-fns                               |
| **Storage**        | Convex document store + file storage   |
| **Testing**        | Manual verification (per constitution) |
| **Currency**       | UGX (Ugandan Shilling)                 |
| **Timezone**       | Africa/Kampala                         |

### Key Differences from Parent Project

| Parent (Hono/Drizzle) | Target (TanStack/Convex)                 |
| --------------------- | ---------------------------------------- |
| PostgreSQL + PostGIS  | Convex document store + geohash strings  |
| BullMQ job queues     | Convex scheduled functions               |
| Redis caching         | Convex realtime subscriptions            |
| Better Auth           | Clerk                                    |
| REST API              | Convex functions (query/mutation/action) |
| Drizzle ORM           | Convex schema + validators               |

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Modern SaaS Stack**: Plan uses TanStack Start, Convex, and Clerk
- [x] **UX-First Implementation**: Plan prioritizes shadcn/ui and intuitive flows
- [x] **Velocity Focus (No Tests)**: Plan explicitly excludes automated tests; verification is manual
- [x] **End-to-End Type Safety**: Plan mandates strict TypeScript usage across the stack (no `any`)

## Project Structure

### Documentation (this feature)

```text
specs/001-grocery-logistics-platform/
├── plan.md              # This file
├── spec.md              # Feature specification (comprehensive)
├── tasks.md             # Implementation tasks (145 tasks)
├── research.md          # Design decisions
├── data-model.md        # Entity relationships
├── quickstart.md        # Setup guide
└── contracts/
    └── schema.ts        # Convex schema definition
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── routes/
│   │   ├── _authed/              # Authenticated layout (Clerk)
│   │   │   ├── _admin/           # Platform admin routes
│   │   │   │   ├── dashboard/    # Admin dashboard
│   │   │   │   ├── products/     # Master catalog CRUD
│   │   │   │   ├── categories/   # Category management
│   │   │   │   ├── brands/       # Brand management
│   │   │   │   ├── vendors/      # Vendor management
│   │   │   │   ├── customers/    # Customer management
│   │   │   │   ├── orders/       # All orders view
│   │   │   │   ├── parcels/      # P2P deliveries
│   │   │   │   └── promotions/   # Platform promotions
│   │   │   ├── _vendor/          # Vendor routes
│   │   │   │   ├── dashboard/    # Vendor dashboard
│   │   │   │   ├── catalog/      # Browse master products
│   │   │   │   ├── variants/     # Manage variants (pending approval)
│   │   │   │   ├── orders/       # Vendor orders
│   │   │   │   ├── customers/    # Vendor customers
│   │   │   │   ├── promotions/   # Vendor promotions
│   │   │   │   ├── team/         # Team management
│   │   │   │   └── settings/     # Store settings + hours
│   │   │   └── _customer/        # Customer routes
│   │   │       ├── store/        # Browse vendor store
│   │   │       ├── cart/         # Shopping cart
│   │   │       ├── checkout/     # Checkout flow
│   │   │       ├── orders/       # Order history
│   │   │       ├── parcels/      # P2P delivery requests
│   │   │       └── addresses/    # Saved addresses
│   │   ├── auth/                 # Auth pages (login, signup)
│   │   └── index.tsx             # Landing page
│   ├── client.tsx
│   └── routeTree.gen.ts
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── admin/                    # Admin-specific components
│   ├── vendor/                   # Vendor-specific components
│   ├── customer/                 # Customer-specific components
│   ├── orders/                   # Order components (shared)
│   ├── products/                 # Product components (shared)
│   └── layout/                   # Layout components
│       ├── app-sidebar.tsx
│       ├── nav-main.tsx
│       ├── nav-user.tsx
│       └── team-switcher.tsx
├── hooks/
│   ├── use-auth.ts               # Auth utilities
│   ├── use-organization.ts       # Active org context
│   └── use-permissions.ts        # Role-based access
├── lib/
│   ├── utils.ts                  # cn() and helpers
│   ├── geohash.ts                # Geohash encoding
│   ├── fare.ts                   # Fare calculation
│   └── constants.ts              # App constants
└── store/
    └── ability.ts                # CASL permissions (optional)

convex/
├── schema.ts                     # Database schema
├── auth.config.ts                # Clerk configuration
├── _generated/                   # Auto-generated types
├── lib/
│   ├── helpers.ts                # Shared utilities
│   ├── geohash.ts                # Geohash functions
│   └── fare.ts                   # Fare calculation
├── users.ts                      # User sync from Clerk
├── organizations.ts              # Organization CRUD
├── members.ts                    # Member management
├── teams.ts                      # Team management
├── invitations.ts                # Invitation handling
├── categories.ts                 # Category CRUD (admin)
├── brands.ts                     # Brand CRUD (admin)
├── products.ts                   # Master product CRUD (admin)
├── productImages.ts              # Image upload/management
├── productVariants.ts            # Variant CRUD (vendor) + approval workflow
├── priceSets.ts                  # Pricing management
├── customerAddresses.ts          # Address CRUD
├── carts.ts                      # Cart operations
├── orders.ts                     # Order lifecycle + 10min auto-cancel
├── orderEvents.ts                # Order audit log
├── deliveryHandoffs.ts           # External delivery integration + retry logic
├── parcels.ts                    # P2P parcel CRUD
├── parcelEvents.ts               # Parcel audit log
├── campaigns.ts                  # Campaign CRUD
├── promotions.ts                 # Promotion CRUD
├── counters.ts                   # Display ID generation
├── scheduled/
│   ├── orderExpiration.ts        # 10-minute order auto-cancel
│   └── deliveryRetry.ts          # Exponential backoff retries
├── dashboard/
│   ├── admin.ts                  # Admin dashboard stats
│   └── vendor.ts                 # Vendor dashboard stats
└── http.ts                       # HTTP routes (webhooks)
```

**Structure Decision**: Single TanStack Start application with Convex backend. Role-based routing under `_authed/` with `_admin/`, `_vendor/`, and `_customer/` sub-layouts. This follows the "Modern SaaS Stack" constitution principle.

## Implementation Phases

### Phase 0: Project Setup

- Initialize TanStack Start project
- Configure Convex
- Set up Clerk authentication
- Install and configure shadcn/ui
- Set up Tailwind CSS

### Phase 1: Authentication & Authorization

- Clerk integration with Convex user sync
- Role-based access control (isStaff for admin)
- Protected route layouts
- User profile management

### Phase 2: Organization Foundation

- Organization CRUD (admin creates vendors)
- Organization categories
- Member management
- Team management
- Invitation system
- Operating hours configuration

### Phase 3: Product Catalog (Admin)

- Category hierarchy CRUD
- Brand CRUD
- Master product CRUD with images
- Product search and filtering
- Product activation/deactivation

### Phase 4: Vendor Variants & Pricing

- Browse master catalog
- Create variants with unit/SKU
- Price set and money amount management
- Stock quantity tracking
- Availability toggle
- **Manual admin approval workflow** (new variants start with isApproved=false)

### Phase 5: Customer Experience

- Customer address management
- Store browsing (by vendor)
- Product listing with prices
- Shopping cart (with expiration)
- Delivery quote calculation
- Checkout flow

### Phase 6: Order Management

- Order creation from cart
- Order status workflow
- Vendor order dashboard
- Accept/reject orders
- **10-minute auto-cancel** for unresponded orders
- Order item management
- Order event logging
- Delivery handoff integration with **3 retries, exponential backoff**

### Phase 7: P2P Parcel Delivery

- Parcel creation form
- Size category selection
- Fare calculation
- Parcel status tracking
- Verification codes
- Parcel event logging

### Phase 8: Promotions System

- Campaign CRUD
- Campaign budgets
- Promotion CRUD with rules
- Application methods
- Promotion validation at checkout
- Usage tracking

### Phase 9: Dashboards & Analytics

- Admin dashboard (platform metrics)
- Vendor dashboard (store metrics)
- Charts and visualizations
- Low stock alerts

### Phase 10: Polish & Integration

- Error handling
- Loading states
- Toast notifications
- Responsive design
- External delivery webhooks

## Key Technical Decisions

### 1. Geospatial Queries

Parent uses PostGIS geometry. Convex doesn't have native geo support.

**Solution**: Use geohash strings for proximity queries. Store lat/lng for display. Use external service (Mapbox) for distance calculations via Convex actions.

### 2. Job Queues / Scheduled Functions

Parent uses BullMQ for delivery handoff.

**Solution**: Use Convex scheduled functions for:

- Order expiration (10-minute auto-cancel check)
- Delivery handoff retries (exponential backoff: 1m, 5m, 15m)
- Cart expiration cleanup

### 3. Cart Storage

Parent uses Redis for ephemeral carts.

**Solution**: Store carts in Convex with `expiresAt` field. Use scheduled function to clean expired carts.

### 4. Display IDs

Parent uses `bigserial` for auto-increment.

**Solution**: Use a `counters` table with atomic increment mutations.

### 5. File Storage

Parent uses AWS S3.

**Solution**: Use Convex file storage for product images.

### 6. Realtime Updates

Parent uses Socket.io.

**Solution**: Use Convex subscriptions (built-in realtime).

### 7. Variant Approval Workflow

**Decision**: All variants require manual admin approval before becoming visible.

**Implementation**:

- New variants created with `isApproved = false`
- Admin UI shows pending variants for approval
- Customer-facing queries filter by `isApproved = true AND isAvailable = true`

### 8. Order Expiration

**Decision**: Orders auto-cancel after 10 minutes if vendor doesn't respond.

**Implementation**:

- On order creation, schedule a function to run in 10 minutes
- If order still `pending` at execution, change to `canceled` and notify customer
- If vendor accepts/rejects before timeout, cancel the scheduled job

### 9. Delivery Handoff Retry

**Decision**: 3 retries with exponential backoff (1m, 5m, 15m).

**Implementation**:

- On handoff failure, increment `attemptCount` and schedule next retry
- Retry intervals: attempt 1 → 1min, attempt 2 → 5min, attempt 3 → 15min
- After 3 failures, mark as permanently failed, require manual intervention

## API Mapping (Parent → Target)

### Organization Routes

| Parent Endpoint                | Convex Function                 |
| ------------------------------ | ------------------------------- |
| `GET /api/organizations`       | `query organizations:list`      |
| `POST /api/organizations`      | `mutation organizations:create` |
| `PATCH /api/organizations/:id` | `mutation organizations:update` |
| `GET /api/organizations/:id`   | `query organizations:get`       |

### Product Routes

| Parent Endpoint                  | Convex Function                       |
| -------------------------------- | ------------------------------------- |
| `GET /api/products`              | `query products:list`                 |
| `POST /api/products`             | `mutation products:create`            |
| `PATCH /api/products/:id`        | `mutation products:update`            |
| `DELETE /api/products/:id`       | `mutation products:archive`           |
| `GET /api/products/:id/variants` | `query productVariants:listByProduct` |

### Variant Approval Routes (New)

| Action                | Convex Function                             |
| --------------------- | ------------------------------------------- |
| List pending variants | `query productVariants:listPendingApproval` |
| Approve variant       | `mutation productVariants:approve`          |
| Reject variant        | `mutation productVariants:reject`           |

### Order Routes

| Parent Endpoint                | Convex Function                                       |
| ------------------------------ | ----------------------------------------------------- |
| `GET /api/orders`              | `query orders:list`                                   |
| `POST /api/orders`             | `mutation orders:create` (schedules 10min expiration) |
| `PATCH /api/orders/:id/status` | `mutation orders:updateStatus`                        |
| `POST /api/orders/:id/accept`  | `mutation orders:accept` (cancels expiration timer)   |
| `POST /api/orders/:id/reject`  | `mutation orders:reject` (cancels expiration timer)   |

### Store (Public) Routes

| Parent Endpoint                      | Convex Function                                             |
| ------------------------------------ | ----------------------------------------------------------- |
| `GET /api/store/vendors`             | `query organizations:listActive`                            |
| `GET /api/store/products`            | `query productVariants:listByOrg` (filters isApproved=true) |
| `POST /api/store/carts`              | `mutation carts:create`                                     |
| `POST /api/store/carts/:id/items`    | `mutation cartItems:add`                                    |
| `POST /api/store/carts/:id/complete` | `mutation orders:createFromCart`                            |

### Parcel Routes

| Parent Endpoint                 | Convex Function                 |
| ------------------------------- | ------------------------------- |
| `GET /api/parcels`              | `query parcels:list`            |
| `POST /api/parcels`             | `mutation parcels:create`       |
| `PATCH /api/parcels/:id/status` | `mutation parcels:updateStatus` |

## Success Metrics

| Metric                                       | Target       |
| -------------------------------------------- | ------------ |
| Product creation time                        | < 2 minutes  |
| Variant listing time                         | < 30 seconds |
| Checkout steps                               | < 5          |
| P2P delivery request                         | < 3 steps    |
| Data integrity (sold items → valid variants) | 100%         |
| Delivery timestamp logging                   | 100%         |
| Event audit logging                          | 100%         |

## Risks & Mitigations

| Risk                                 | Mitigation                                                  |
| ------------------------------------ | ----------------------------------------------------------- |
| Convex query limitations (no joins)  | Denormalize data, use multiple queries                      |
| Geospatial query performance         | Pre-compute geohashes, limit query radius                   |
| File upload size limits              | Compress images client-side, use thumbnails                 |
| External delivery system unavailable | Queue retries (3x exponential backoff), manual fallback UI  |
| Cart expiration race conditions      | Validate stock at checkout, not just at add                 |
| Order timeout race condition         | Use Convex transactions, check status before auto-cancel    |
| Variant approval backlog             | Admin notification for pending approvals, dashboard counter |

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |
