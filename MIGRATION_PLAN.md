# BoxKuBox → BoxConv Migration Plan

> Migrating from Hono + Better Auth + Drizzle (PostgreSQL) + Redis to TanStack Start + Clerk + Convex

## Overview

This document outlines the step-by-step migration of the BoxKuBox platform from the current architecture to the new Convex-based architecture with Clerk authentication.

### Current Stack (boxkubox)
- **Frontend**: React + TanStack Router + Vite
- **Backend**: Hono (Bun runtime)
- **Auth**: Better Auth (email/password, OAuth)
- **Database**: PostgreSQL + Drizzle ORM
- **Cache/Queue**: Redis + BullMQ
- **File Storage**: Cloudflare R2

### Target Stack (boxconv)
- **Frontend**: TanStack Start (SSR) + React
- **Backend**: Convex (serverless functions)
- **Auth**: Clerk (with Convex integration)
- **Database**: Convex (built-in)
- **Real-time**: Convex (built-in)
- **File Storage**: Convex (built-in) or keep R2

---

## Migration Phases

### Phase 0: Foundation Setup ✅ (Completed)
- [x] Initialize boxconv project with TanStack Start
- [x] Configure Clerk authentication
- [x] Set up Convex backend
- [x] Configure Clerk + Convex integration
- [x] Basic routing structure
- [x] Docker deployment setup

---

## Phase 1: Core Schema & Auth

### 1.1 User & Organization Schema
**Priority**: 🔴 Critical  
**Estimated Effort**: 2-3 days

Migrate the core entities that everything else depends on.

#### Convex Schema to Create (`convex/schema.ts`)

```typescript
// Users - Clerk handles primary user data, store app-specific data here
users: defineTable({
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
  role: v.optional(v.string()),
  phoneNumber: v.optional(v.string()),
  isStaff: v.optional(v.boolean()),
  banned: v.optional(v.boolean()),
  banReason: v.optional(v.string()),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"]),

// Organizations (Vendors)
organizations: defineTable({
  name: v.string(),
  slug: v.string(),
  logo: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  country: v.optional(v.string()),
  cityOrDistrict: v.optional(v.string()),
  town: v.optional(v.string()),
  street: v.optional(v.string()),
  categoryId: v.optional(v.id("organizationCategories")),
  // Location (lat/lng instead of PostGIS)
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  // Operating hours
  openingTime: v.optional(v.string()),
  closingTime: v.optional(v.string()),
  isBusy: v.boolean(),
  businessHours: v.optional(v.string()), // JSON string
  timezone: v.optional(v.string()),
})
  .index("by_slug", ["slug"])
  .index("by_category", ["categoryId"]),

// Organization Categories
organizationCategories: defineTable({
  name: v.string(),
  slug: v.string(),
  parentId: v.optional(v.id("organizationCategories")),
})
  .index("by_slug", ["slug"])
  .index("by_parent", ["parentId"]),

// Members (User <-> Organization relationship)
members: defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  role: v.string(), // "owner", "admin", "member"
  phone: v.optional(v.string()),
})
  .index("by_org", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_org_user", ["organizationId", "userId"]),
```

#### Migration Tasks
- [ ] Create Convex schema for users
- [ ] Create Convex schema for organizations
- [ ] Create Convex schema for organization categories
- [ ] Create Convex schema for members
- [ ] Set up Clerk webhook to sync users to Convex
- [ ] Create user/org management functions

#### Files to Reference
- `boxkubox/server/db/schemas/auth-schema.ts`

---

### 1.2 Teams & Invitations
**Priority**: 🟡 Medium  
**Estimated Effort**: 1 day

```typescript
// Teams within organizations
teams: defineTable({
  name: v.string(),
  organizationId: v.id("organizations"),
})
  .index("by_org", ["organizationId"]),

// Team members
teamMembers: defineTable({
  teamId: v.id("teams"),
  userId: v.id("users"),
})
  .index("by_team", ["teamId"])
  .index("by_user", ["userId"]),

// Invitations
invitations: defineTable({
  organizationId: v.id("organizations"),
  email: v.string(),
  role: v.string(),
  teamId: v.optional(v.id("teams")),
  status: v.string(), // "pending", "accepted", "expired"
  expiresAt: v.number(),
  inviterId: v.id("users"),
})
  .index("by_org", ["organizationId"])
  .index("by_email", ["email"]),
```

---

## Phase 2: Product Catalog

### 2.1 Categories & Brands
**Priority**: 🔴 Critical  
**Estimated Effort**: 1 day

```typescript
// Product categories (hierarchical)
categories: defineTable({
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  parentId: v.optional(v.id("categories")),
  thumbnailUrl: v.optional(v.string()),
  bannerUrl: v.optional(v.string()),
  isActive: v.boolean(),
})
  .index("by_slug", ["slug"])
  .index("by_parent", ["parentId"]),

// Brands
brands: defineTable({
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
})
  .index("by_slug", ["slug"]),
```

#### Files to Reference
- `boxkubox/server/db/schemas/categories-schema.ts`
- `boxkubox/server/db/schemas/brands-schema.ts`

---

### 2.2 Products & Variants
**Priority**: 🔴 Critical  
**Estimated Effort**: 2-3 days

```typescript
// Products (global catalog)
products: defineTable({
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  brandId: v.optional(v.id("brands")),
  categoryId: v.id("categories"),
  isActive: v.boolean(),
})
  .index("by_slug", ["slug"])
  .index("by_category", ["categoryId"])
  .index("by_brand", ["brandId"]),

// Product images
productImages: defineTable({
  productId: v.id("products"),
  storageId: v.id("_storage"), // Convex file storage
  url: v.string(),
  alt: v.optional(v.string()),
  isPrimary: v.boolean(),
})
  .index("by_product", ["productId"]),

// Product tags
productTags: defineTable({
  productId: v.id("products"),
  value: v.string(),
})
  .index("by_product", ["productId"]),

// Product variants (org-scoped)
productVariants: defineTable({
  productId: v.id("products"),
  organizationId: v.id("organizations"),
  sku: v.string(),
  unit: v.string(),
  weightGrams: v.optional(v.number()),
  barcode: v.optional(v.string()),
  stockQuantity: v.number(),
  isAvailable: v.boolean(),
  isApproved: v.boolean(),
})
  .index("by_product", ["productId"])
  .index("by_org", ["organizationId"])
  .index("by_org_sku", ["organizationId", "sku"]),
```

#### Files to Reference
- `boxkubox/server/db/schemas/products-schema.ts`

---

### 2.3 Pricing
**Priority**: 🔴 Critical  
**Estimated Effort**: 1 day

```typescript
// Price sets for variants
priceSets: defineTable({
  variantId: v.id("productVariants"),
  name: v.string(),
  type: v.string(), // "sale", "retail", "wholesale"
})
  .index("by_variant", ["variantId"]),

// Money amounts
moneyAmounts: defineTable({
  priceSetId: v.id("priceSets"),
  currencyCode: v.string(),
  amount: v.number(), // in cents/smallest unit
})
  .index("by_price_set", ["priceSetId"]),
```

#### Files to Reference
- `boxkubox/server/db/schemas/pricing-schema.ts`

---

## Phase 3: Customer Management

### 3.1 Customer Addresses
**Priority**: 🔴 Critical  
**Estimated Effort**: 1-2 days

```typescript
// Customer addresses
customerAddresses: defineTable({
  userId: v.id("users"),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  country: v.optional(v.string()),
  city: v.optional(v.string()),
  town: v.optional(v.string()),
  street: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  addressType: v.optional(v.string()), // "hotel", "apartment", "home", "office"
  buildingName: v.optional(v.string()),
  apartmentNo: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  directions: v.optional(v.string()),
  isDefault: v.boolean(),
})
  .index("by_user", ["userId"]),

// Organization <-> Customer relationship
organizationCustomers: defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
})
  .index("by_org", ["organizationId"])
  .index("by_user", ["userId"]),
```

#### Files to Reference
- `boxkubox/server/db/schemas/customers-schema.ts`

---

## Phase 4: Orders & Fulfillment

### 4.1 Orders
**Priority**: 🔴 Critical  
**Estimated Effort**: 3-4 days

```typescript
// Orders
orders: defineTable({
  displayId: v.number(),
  status: v.string(), // "pending", "completed", "canceled"
  fulfillmentStatus: v.string(), // "not_fulfilled", "fulfilled", "shipped", "returned"
  paymentStatus: v.string(), // "awaiting", "captured", "refunded", "canceled"
  fulfillmentType: v.string(), // "delivery", "pickup", "self_delivery"
  customerId: v.id("users"),
  organizationId: v.id("organizations"),
  deliveryAddressId: v.optional(v.id("customerAddresses")),
  // Delivery info
  deliveryQuoteId: v.optional(v.string()),
  riderId: v.optional(v.string()),
  riderName: v.optional(v.string()),
  riderPhone: v.optional(v.string()),
  // Totals
  currencyCode: v.string(),
  total: v.number(),
  taxTotal: v.number(),
  discountTotal: v.number(),
  deliveryTotal: v.number(),
})
  .index("by_customer", ["customerId"])
  .index("by_org", ["organizationId"])
  .index("by_status", ["status"])
  .index("by_display_id", ["displayId"]),

// Order items
orderItems: defineTable({
  orderId: v.id("orders"),
  variantId: v.id("productVariants"),
  quantity: v.number(),
  unitPrice: v.number(),
  total: v.number(),
  fulfillmentStatus: v.string(),
})
  .index("by_order", ["orderId"]),

// Order events (audit log)
orderEvents: defineTable({
  orderId: v.id("orders"),
  type: v.string(),
  data: v.optional(v.string()), // JSON
  createdBy: v.optional(v.id("users")),
})
  .index("by_order", ["orderId"]),
```

#### Files to Reference
- `boxkubox/server/db/schemas/orders-schema.ts`
- `boxkubox/server/db/schemas/order-items-schema.ts`
- `boxkubox/server/db/schemas/order-events-schema.ts`

---

### 4.2 Delivery & Riders
**Priority**: 🟡 Medium  
**Estimated Effort**: 2 days

```typescript
// Delivery handoffs
deliveryHandoffs: defineTable({
  orderId: v.id("orders"),
  riderId: v.string(),
  riderName: v.optional(v.string()),
  riderPhone: v.optional(v.string()),
  status: v.string(),
  handoffTime: v.optional(v.number()),
  deliveryTime: v.optional(v.number()),
})
  .index("by_order", ["orderId"])
  .index("by_rider", ["riderId"]),
```

#### Files to Reference
- `boxkubox/server/db/schemas/delivery-handoff.ts`

---

## Phase 5: Promotions & Marketing

### 5.1 Promotions
**Priority**: 🟢 Low  
**Estimated Effort**: 1-2 days

```typescript
// Promotions
promotions: defineTable({
  organizationId: v.id("organizations"),
  code: v.string(),
  type: v.string(), // "percentage", "fixed"
  value: v.number(),
  minOrderAmount: v.optional(v.number()),
  maxUses: v.optional(v.number()),
  usedCount: v.number(),
  startsAt: v.number(),
  endsAt: v.optional(v.number()),
  isActive: v.boolean(),
})
  .index("by_org", ["organizationId"])
  .index("by_code", ["code"]),
```

#### Files to Reference
- `boxkubox/server/db/schemas/promotions-schema.ts`

---

## Phase 6: Frontend Components

### 6.1 Shared UI Components
**Priority**: 🔴 Critical  
**Estimated Effort**: 2-3 days

Copy and adapt from `boxkubox/front/src/components/ui/`:
- [ ] Button, Input, Select, etc. (shadcn/ui components)
- [ ] Data tables
- [ ] Forms
- [ ] Modals/Sheets

### 6.2 Feature Components
**Priority**: 🔴 Critical  
**Estimated Effort**: 5-7 days

Migrate in order of dependency:

1. **Auth Components** (Clerk handles most of this)
   - [ ] Login/Signup pages (use Clerk components)
   - [ ] User profile
   - [ ] Organization switcher

2. **Dashboard Layout**
   - [ ] Sidebar navigation
   - [ ] Header
   - [ ] Team switcher

3. **Vendor/Organization Management**
   - [ ] Organization settings
   - [ ] Team management
   - [ ] Member invitations

4. **Product Management**
   - [ ] Product list
   - [ ] Product form (create/edit)
   - [ ] Variant management
   - [ ] Category management
   - [ ] Brand management

5. **Customer Management**
   - [ ] Customer list
   - [ ] Customer details
   - [ ] Address management

6. **Order Management**
   - [ ] Order list
   - [ ] Order details
   - [ ] Order status updates
   - [ ] Order timeline

7. **Promotions**
   - [ ] Promotion list
   - [ ] Promotion form

---

## Phase 7: Background Jobs & Real-time

### 7.1 Replace Redis/BullMQ with Convex
**Priority**: 🟡 Medium  
**Estimated Effort**: 2-3 days

Convex provides built-in:
- **Real-time subscriptions** (replaces WebSocket)
- **Scheduled functions** (replaces cron jobs)
- **Actions** (for external API calls)

#### Workers to Migrate
- [ ] `server/workers/rider-assignment.ts` → Convex scheduled function
- [ ] `server/db/scripts/process-delivery-queue.ts` → Convex action

---

## Phase 8: External Integrations

### 8.1 Rider Provider (BoxRiders)
**Priority**: 🟡 Medium  
**Estimated Effort**: 1-2 days

Create Convex actions for:
- [ ] Get delivery quotes
- [ ] Request rider assignment
- [ ] Track delivery status

### 8.2 Email (Resend)
**Priority**: 🟡 Medium  
**Estimated Effort**: 1 day

- [ ] Create Convex action for sending emails
- [ ] Migrate email templates

### 8.3 File Storage
**Priority**: 🟢 Low  
**Estimated Effort**: 1 day

Options:
1. Use Convex file storage (simpler)
2. Keep Cloudflare R2 (if needed for existing files)

---

## Data Migration Strategy

### Option A: Fresh Start (Recommended for Beta)
- Start with empty Convex database
- Manually re-create organizations/products
- Suitable if still in development/beta

### Option B: Data Migration Script
- Export PostgreSQL data to JSON
- Create Convex migration action to import
- Map old IDs to new Convex IDs

---

## Directory Structure for boxconv

```
boxconv/
├── convex/
│   ├── schema.ts           # All table definitions
│   ├── _generated/         # Auto-generated
│   ├── auth.config.ts      # Clerk config
│   │
│   ├── users/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── organizations/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── products/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── orders/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── actions.ts      # External API calls
│   └── ...
│
├── src/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── organizations/
│   │   ├── products/
│   │   ├── customers/
│   │   ├── orders/
│   │   └── promotions/
│   │
│   ├── shared/
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   └── types/          # TypeScript types
│   │
│   ├── routes/             # TanStack Router pages
│   │   ├── __root.tsx
│   │   ├── _authed/        # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   └── ...
│   │   └── ...
│   │
│   └── styles/
│
└── public/
```

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current PostgreSQL database
- [ ] Document all environment variables needed
- [ ] List all external API integrations
- [ ] Identify critical business logic

### During Migration
- [ ] Complete each phase before moving to next
- [ ] Write tests for Convex functions
- [ ] Test Clerk auth flow thoroughly
- [ ] Verify real-time updates work

### Post-Migration
- [ ] Performance testing
- [ ] Security audit
- [ ] Update deployment scripts
- [ ] Update documentation
- [ ] Train team on new stack

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Core Schema & Auth | 3-4 days | None |
| Phase 2: Product Catalog | 4-5 days | Phase 1 |
| Phase 3: Customer Management | 2-3 days | Phase 1 |
| Phase 4: Orders & Fulfillment | 4-5 days | Phase 2, 3 |
| Phase 5: Promotions | 2 days | Phase 4 |
| Phase 6: Frontend Components | 7-10 days | Phase 1-4 |
| Phase 7: Background Jobs | 2-3 days | Phase 4 |
| Phase 8: External Integrations | 3-4 days | Phase 4 |

**Total Estimated Time**: 4-6 weeks

---

## Notes & Considerations

### Convex Limitations to Consider
- No SQL joins (use document references)
- No PostGIS (use simple lat/lng with manual distance calc)
- File size limits for storage
- Function execution time limits

### Benefits of Migration
- Real-time by default
- Simpler deployment (no Redis, no separate DB)
- Type-safe end-to-end
- Built-in file storage
- Automatic scaling

### Risk Mitigation
- Keep boxkubox running during migration
- Parallel testing environment
- Feature flags for gradual rollout
- Rollback plan documented

---

## Getting Started

1. Start with **Phase 1.1** - User & Organization schema
2. Set up Clerk webhook to sync users
3. Create basic CRUD functions in Convex
4. Build simple UI to test the flow
5. Proceed to next phase

Run `npm run dev` and start building!
