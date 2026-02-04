# Feature Specification: Grocery & Logistics Platform

**Feature Branch**: `001-grocery-logistics-platform`
**Created**: 2026-02-03
**Updated**: 2026-02-03
**Status**: Draft (Enhanced from parent project analysis)
**Migration Source**: `/Users/mwondha/Documents/dev/ts/web/boxkubox/` (Hono + Drizzle + PostgreSQL)

## Executive Summary

BoxKuBox is a multi-vendor grocery delivery and P2P logistics SaaS platform. The platform connects:

- **Vendors** (grocery stores) who sell products
- **Customers** who purchase groceries or send packages
- **Riders** who fulfill deliveries
- **Platform Admins** who manage the master catalog and operations

## Clarifications

### Session 2026-02-03

- Q: How should jobs be assigned to riders? → A: Nearest Rider Round-Robin (offer to closest first, then cascade).
- Q: How are payments and payouts handled? → A: Platform Collects All (Periodic Payouts); Platform acts as merchant of record, payouts tracked for later settlement.
- Q: Do Vendors need to accept orders? → A: Manual Acceptance (Vendor must confirm order before rider dispatch).
- Q: Order expiration timeout if vendor doesn't respond? → A: 10 minutes (auto-cancel).
- Q: Variant approval mode? → A: Manual approval required for all variants.
- Q: Delivery handoff retry policy? → A: 3 retries with exponential backoff (1m, 5m, 15m).

---

## Data Model (From Parent Project Analysis)

### Core Entities

#### 1. User

Primary identity for all system actors.

| Field               | Type       | Notes               |
| ------------------- | ---------- | ------------------- |
| id                  | string     | Primary key         |
| name                | string     | Required            |
| email               | string     | Unique, required    |
| emailVerified       | boolean    | Default: false      |
| image               | string?    | Profile image URL   |
| role                | string?    | User role           |
| is_staff            | boolean?   | Platform admin flag |
| phoneNumber         | string?    | Unique              |
| phoneNumberVerified | boolean    | Default: true       |
| banned              | boolean?   | Account suspension  |
| banReason           | string?    | Suspension reason   |
| banExpires          | timestamp? | Suspension expiry   |
| createdAt           | timestamp  | Auto                |
| updatedAt           | timestamp  | Auto                |

#### 2. Organization (Vendor/Store)

Represents a vendor/grocery store on the platform.

| Field            | Type      | Notes                         |
| ---------------- | --------- | ----------------------------- |
| id               | string    | Primary key                   |
| name             | string    | Required                      |
| slug             | string    | Unique, URL-friendly          |
| logo             | string?   | Logo URL                      |
| email            | string?   | Contact email                 |
| phone            | string?   | Contact phone                 |
| country          | string    | Default: 'UG'                 |
| city_or_district | string?   |                               |
| town             | string?   |                               |
| street           | string?   |                               |
| location         | point     | PostGIS geometry (lat/lng)    |
| categoryId       | string?   | FK → OrganizationCategory     |
| openingTime      | string?   | Format: "08:00"               |
| closingTime      | string?   | Format: "22:00"               |
| isBusy           | boolean   | Default: false (pause orders) |
| businessHours    | json?     | Per-day schedule              |
| timezone         | string    | Default: 'Africa/Kampala'     |
| metadata         | json?     | Extensible data               |
| createdAt        | timestamp | Auto                          |

**Business Hours Schema**:

```json
{
  "monday": { "open": "08:00", "close": "22:00", "isClosed": false },
  "tuesday": { "open": "08:00", "close": "22:00", "isClosed": false },
  ...
}
```

#### 3. Organization Category

Categorizes vendors (e.g., "Supermarket", "Pharmacy", "Restaurant").

| Field     | Type      | Notes                        |
| --------- | --------- | ---------------------------- |
| id        | string    | Primary key                  |
| name      | string    | Required                     |
| slug      | string    | Unique                       |
| parentId  | string?   | Self-reference for hierarchy |
| createdAt | timestamp | Auto                         |
| updatedAt | timestamp | Auto                         |

#### 4. Member

Links users to organizations with roles.

| Field          | Type      | Notes                           |
| -------------- | --------- | ------------------------------- |
| id             | string    | Primary key                     |
| organizationId | string    | FK → Organization               |
| userId         | string    | FK → User                       |
| role           | string?   | e.g., 'owner', 'admin', 'staff' |
| phone          | string?   | Work phone                      |
| contract       | string?   | Contract document               |
| createdAt      | timestamp | Auto                            |

#### 5. Team

Sub-groups within organizations.

| Field          | Type       | Notes             |
| -------------- | ---------- | ----------------- |
| id             | string     | Primary key       |
| name           | string     | Required          |
| organizationId | string     | FK → Organization |
| createdAt      | timestamp  | Auto              |
| updatedAt      | timestamp? |                   |

#### 6. TeamMember

Links users to teams.

| Field     | Type       | Notes       |
| --------- | ---------- | ----------- |
| id        | string     | Primary key |
| teamId    | string     | FK → Team   |
| userId    | string     | FK → User   |
| createdAt | timestamp? | Auto        |

#### 7. Invitation

Pending team invitations.

| Field          | Type      | Notes                              |
| -------------- | --------- | ---------------------------------- |
| id             | string    | Primary key                        |
| organizationId | string    | FK → Organization                  |
| email          | string    | Invitee email                      |
| role           | string?   | Assigned role                      |
| teamId         | string?   | Specific team                      |
| status         | string    | 'pending' / 'accepted' / 'expired' |
| expiresAt      | timestamp | Invitation expiry                  |
| inviterId      | string    | FK → User                          |

---

### Product Catalog Entities

#### 8. Category (Product)

Hierarchical product categories.

| Field        | Type      | Notes                        |
| ------------ | --------- | ---------------------------- |
| id           | string    | Primary key                  |
| name         | string    | Required                     |
| slug         | string    | Unique                       |
| description  | string?   |                              |
| parentId     | string?   | Self-reference for hierarchy |
| thumbnailUrl | string?   | Category image               |
| bannerUrl    | string?   | Category banner              |
| isActive     | boolean   | Default: true                |
| createdAt    | timestamp | Auto                         |
| updatedAt    | timestamp | Auto                         |

#### 9. Brand

Product brands.

| Field       | Type      | Notes       |
| ----------- | --------- | ----------- |
| id          | string    | Primary key |
| name        | string    | Required    |
| slug        | string    | Unique      |
| description | string?   |             |
| createdAt   | timestamp | Auto        |
| updatedAt   | timestamp | Auto        |

#### 10. Product (Master Catalog)

Platform-wide product definitions. Only Platform Admins can manage.

| Field       | Type      | Notes                    |
| ----------- | --------- | ------------------------ |
| id          | string    | Primary key              |
| name        | string    | Required                 |
| slug        | string    | Unique                   |
| description | string?   |                          |
| brandId     | string?   | FK → Brand               |
| categoryId  | string    | FK → Category (required) |
| isActive    | boolean   | Default: true            |
| createdAt   | timestamp | Auto                     |
| updatedAt   | timestamp | Auto                     |

#### 11. ProductImage

Product gallery images.

| Field     | Type      | Notes                 |
| --------- | --------- | --------------------- |
| id        | string    | Primary key           |
| productId | string    | FK → Product          |
| url       | string    | Image URL             |
| alt       | string?   | Alt text              |
| isPrimary | boolean   | Primary display image |
| createdAt | timestamp | Auto                  |

#### 12. ProductTag

Searchable tags for products.

| Field     | Type   | Notes        |
| --------- | ------ | ------------ |
| id        | string | Primary key  |
| productId | string | FK → Product |
| value     | string | Tag value    |

**Unique Constraint**: (productId, value)

#### 13. ProductVariant

Vendor-specific product listings with pricing and stock.

| Field          | Type      | Notes                        |
| -------------- | --------- | ---------------------------- |
| id             | string    | Primary key                  |
| productId      | string    | FK → Product                 |
| organizationId | string    | FK → Organization            |
| sku            | string    | Stock keeping unit           |
| unit           | string    | e.g., "kg", "piece", "500ml" |
| weightGrams    | integer?  | For shipping calculations    |
| barcode        | string?   | Product barcode              |
| stockQuantity  | integer   | Current inventory            |
| isAvailable    | boolean   | Vendor can toggle            |
| isApproved     | boolean   | Admin approval status        |
| createdAt      | timestamp | Auto                         |
| updatedAt      | timestamp | Auto                         |

**Unique Constraints**:

- (organizationId, sku)
- (organizationId, productId, unit)

#### 14. PriceSet

Container for variant pricing.

| Field          | Type      | Notes                        |
| -------------- | --------- | ---------------------------- |
| id             | string    | Primary key                  |
| variantId      | string    | FK → ProductVariant (unique) |
| organizationId | string    | FK → Organization            |
| createdAt      | timestamp | Auto                         |
| updatedAt      | timestamp | Auto                         |

#### 15. MoneyAmount

Actual price values with tiered pricing support.

| Field       | Type           | Notes                |
| ----------- | -------------- | -------------------- |
| id          | string         | Primary key          |
| priceSetId  | string         | FK → PriceSet        |
| currency    | string         | Default: 'UGX'       |
| amount      | decimal(10,2)  | Regular price        |
| saleAmount  | decimal(10,2)? | Discounted price     |
| minQuantity | integer?       | Tiered pricing start |
| maxQuantity | integer?       | Tiered pricing end   |
| createdAt   | timestamp      | Auto                 |
| updatedAt   | timestamp      | Auto                 |

---

### Customer Entities

#### 16. CustomerAddress

Saved delivery addresses.

| Field        | Type      | Notes                                  |
| ------------ | --------- | -------------------------------------- |
| id           | string    | Primary key                            |
| userId       | string    | FK → User                              |
| name         | string    | Address label                          |
| email        | string?   | Contact email                          |
| phone        | string?   | Contact phone                          |
| country      | string?   |                                        |
| city         | string?   |                                        |
| town         | string?   |                                        |
| street       | string?   |                                        |
| postalCode   | string?   |                                        |
| addressType  | enum      | 'hotel', 'apartment', 'home', 'office' |
| buildingName | string?   |                                        |
| apartmentNo  | string?   |                                        |
| lat          | double?   | Latitude                               |
| lng          | double?   | Longitude                              |
| location     | point?    | PostGIS geometry                       |
| directions   | string?   | Special instructions                   |
| isDefault    | boolean   | Default: false                         |
| createdAt    | timestamp | Auto                                   |
| updatedAt    | timestamp | Auto                                   |

#### 17. OrganizationCustomer

Links customers to vendors they've ordered from.

| Field          | Type      | Notes             |
| -------------- | --------- | ----------------- |
| id             | string    | Primary key       |
| organizationId | string    | FK → Organization |
| userId         | string    | FK → User         |
| createdAt      | timestamp | Auto              |

---

### Order & Fulfillment Entities

#### 18. Order

Grocery orders from customers.

| Field             | Type      | Notes                                               |
| ----------------- | --------- | --------------------------------------------------- |
| id                | string    | Primary key                                         |
| displayId         | bigint    | Auto-increment display number                       |
| status            | enum      | 'pending', 'completed', 'canceled'                  |
| fulfillmentStatus | enum      | 'not_fulfilled', 'fulfilled', 'shipped', 'returned' |
| paymentStatus     | enum      | 'awaiting', 'captured', 'refunded', 'canceled'      |
| fulfillmentType   | enum      | 'delivery', 'pickup', 'self_delivery'               |
| customerId        | string    | FK → User                                           |
| organizationId    | string    | FK → Organization                                   |
| deliveryAddressId | string?   | FK → CustomerAddress                                |
| deliveryQuoteId   | string?   | External quote reference                            |
| riderId           | string?   | External rider ID                                   |
| riderName         | string?   | Denormalized for history                            |
| riderPhone        | string?   | Denormalized for history                            |
| currencyCode      | string    | Default: 'UGX'                                      |
| total             | integer   | Total in smallest unit                              |
| taxTotal          | integer   | Default: 0                                          |
| discountTotal     | integer   | Default: 0                                          |
| deliveryTotal     | integer   | Default: 0                                          |
| createdAt         | timestamp | Auto                                                |
| updatedAt         | timestamp | Auto                                                |

**Status Flow**:

- `pending` → Customer placed order, awaiting vendor confirmation
- `completed` → Order fully fulfilled and delivered
- `canceled` → Order canceled by customer, vendor, or system

**Fulfillment Status Flow**:

- `not_fulfilled` → Items not yet prepared
- `fulfilled` → Items ready for pickup
- `shipped` → Items with rider/in transit
- `returned` → Items returned

#### 19. OrderItem

Individual items in an order.

| Field     | Type      | Notes                    |
| --------- | --------- | ------------------------ |
| id        | string    | Primary key              |
| orderId   | string    | FK → Order               |
| productId | string    | FK → Product             |
| variantId | string    | FK → ProductVariant      |
| title     | string    | Snapshot of product name |
| quantity  | integer   | CHECK >= 0               |
| unitPrice | integer   | CHECK >= 0               |
| subtotal  | integer   | CHECK >= 0               |
| taxTotal  | integer   | CHECK >= 0               |
| createdAt | timestamp | Auto                     |

#### 20. OrderEvent (Audit Log)

Tracks all order state changes.

| Field                 | Type      | Notes                                                 |
| --------------------- | --------- | ----------------------------------------------------- |
| id                    | string    | Primary key                                           |
| orderId               | string    | FK → Order                                            |
| userId                | string    | Actor (no FK for history)                             |
| eventType             | string    | 'created', 'status_changed', 'payment_captured', etc. |
| fromOrderStatus       | string?   | Previous status                                       |
| toOrderStatus         | string?   | New status                                            |
| fromPaymentStatus     | string?   |                                                       |
| toPaymentStatus       | string?   |                                                       |
| fromFulfillmentStatus | string?   |                                                       |
| toFulfillmentStatus   | string?   |                                                       |
| reason                | string?   | Change reason                                         |
| snapshotTotal         | integer   | Total at event time                                   |
| snapshotTaxTotal      | integer   |                                                       |
| snapshotDiscountTotal | integer   |                                                       |
| snapshotDeliveryTotal | integer   |                                                       |
| createdAt             | timestamp | Auto                                                  |

#### 21. OrderItemEvent (Audit Log)

Tracks item-level changes.

| Field             | Type      | Notes                       |
| ----------------- | --------- | --------------------------- |
| id                | string    | Primary key                 |
| orderId           | string    | FK → Order                  |
| orderItemId       | string    | Raw ID (no FK)              |
| userId            | string    | Actor                       |
| eventType         | string    | 'add', 'exchange', 'remove' |
| oldVariantId      | string?   | For exchanges               |
| newVariantId      | string?   | For exchanges               |
| snapshotTitle     | string    |                             |
| snapshotQuantity  | integer   |                             |
| snapshotUnitPrice | integer   |                             |
| snapshotSubtotal  | integer   |                             |
| snapshotTaxTotal  | integer   |                             |
| createdAt         | timestamp | Auto                        |

#### 22. DeliveryHandoff

Tracks integration with external delivery system.

| Field         | Type       | Notes                              |
| ------------- | ---------- | ---------------------------------- |
| id            | string     | Primary key                        |
| orderId       | string     | FK → Order                         |
| externalId    | string?    | External delivery system ID        |
| status        | enum       | 'queued', 'acknowledged', 'failed' |
| attemptCount  | integer    | Default: 0                         |
| lastAttemptAt | timestamp? |                                    |
| signature     | string?    | Webhook signature                  |
| payload       | json?      | Request/response data              |
| createdAt     | timestamp  | Auto                               |
| updatedAt     | timestamp  | Auto                               |

---

### Parcel/P2P Delivery Entities

#### 23. Parcel

Point-to-point package delivery request.

| Field                   | Type           | Notes                                     |
| ----------------------- | -------------- | ----------------------------------------- |
| id                      | string         | Primary key                               |
| displayId               | integer        | Unique display number                     |
| senderId                | string         | FK → User                                 |
| **Pickup Details**      |                |                                           |
| pickupName              | string         | Contact name                              |
| pickupPhone             | string         | Contact phone                             |
| pickupAddress           | string         | Full address                              |
| pickupLat               | decimal(10,7)? |                                           |
| pickupLng               | decimal(10,7)? |                                           |
| pickupNotes             | string?        | Special instructions                      |
| **Dropoff Details**     |                |                                           |
| recipientName           | string         |                                           |
| recipientPhone          | string         |                                           |
| dropoffAddress          | string         |                                           |
| dropoffLat              | decimal(10,7)? |                                           |
| dropoffLng              | decimal(10,7)? |                                           |
| dropoffNotes            | string?        |                                           |
| **Package Details**     |                |                                           |
| description             | string         | Package contents                          |
| weight                  | decimal(10,2)? | In kg                                     |
| sizeCategory            | enum           | 'small', 'medium', 'large', 'extra_large' |
| fragile                 | boolean        | Default: false                            |
| valueAmount             | decimal(10,2)? | Declared value                            |
| valueCurrency           | string         | Default: 'UGX'                            |
| **Status & Assignment** |                |                                           |
| status                  | enum           | See below                                 |
| externalDeliveryId      | string?        |                                           |
| externalRiderId         | string?        |                                           |
| externalRiderName       | string?        |                                           |
| externalRiderPhone      | string?        |                                           |
| riderAssignedAt         | timestamp?     |                                           |
| **Pricing**             |                |                                           |
| estimatedDistance       | decimal(10,2)? | In km                                     |
| priceAmount             | decimal(10,2)? | Calculated fare                           |
| priceCurrency           | string         | Default: 'UGX'                            |
| paymentStatus           | string         | 'pending', 'paid', 'refunded'             |
| **Verification**        |                |                                           |
| pickupCode              | string?        | OTP for pickup verification               |
| deliveryCode            | string?        | OTP for delivery verification             |
| **Timestamps**          |                |                                           |
| pickedUpAt              | timestamp?     |                                           |
| deliveredAt             | timestamp?     |                                           |
| canceledAt              | timestamp?     |                                           |
| cancelReason            | string?        |                                           |
| metadata                | json?          |                                           |
| createdAt               | timestamp      | Auto                                      |
| updatedAt               | timestamp      | Auto                                      |

**Parcel Status Enum**:

- `draft` - Saved but not submitted
- `pending` - Submitted, awaiting rider assignment
- `picked_up` - Rider has collected package
- `in_transit` - On the way to destination
- `delivered` - Successfully delivered
- `canceled` - Canceled before pickup
- `failed` - Delivery failed

**Size Category Pricing** (example):
| Category | Max Weight | Base Price |
|----------|-----------|------------|
| small | 2kg | 5,000 UGX |
| medium | 5kg | 8,000 UGX |
| large | 15kg | 15,000 UGX |
| extra_large | 30kg | 25,000 UGX |

#### 24. ParcelEvent

Tracks parcel status changes.

| Field       | Type      | Notes                                         |
| ----------- | --------- | --------------------------------------------- |
| id          | string    | Primary key                                   |
| parcelId    | string    | FK → Parcel                                   |
| eventType   | string    | 'created', 'status_changed', 'assigned', etc. |
| status      | enum?     | New status                                    |
| description | string?   | Event description                             |
| userId      | string?   | FK → User (actor)                             |
| metadata    | json?     |                                               |
| createdAt   | timestamp | Auto                                          |

---

### Promotions System

#### 25. Campaign

Marketing campaign container.

| Field              | Type       | Notes                                    |
| ------------------ | ---------- | ---------------------------------------- |
| id                 | string     | Primary key                              |
| name               | string     | Required                                 |
| description        | string?    |                                          |
| campaignIdentifier | string?    | External tracking (e.g., Google Tag)     |
| startsAt           | timestamp? |                                          |
| endsAt             | timestamp? |                                          |
| organizationId     | string?    | FK → Organization (null = platform-wide) |
| createdAt          | timestamp  | Auto                                     |
| updatedAt          | timestamp  | Auto                                     |
| deletedAt          | timestamp? | Soft delete                              |

**Unique Constraint**: (name, organizationId)

#### 26. CampaignBudget

Budget limits for campaigns.

| Field        | Type           | Notes              |
| ------------ | -------------- | ------------------ |
| id           | string         | Primary key        |
| campaignId   | string         | FK → Campaign      |
| type         | enum           | 'spend' or 'usage' |
| currencyCode | string         | Default: 'UGX'     |
| limitAmount  | decimal(12,2)? | Max spend/uses     |
| usedAmount   | decimal(12,2)  | Default: 0         |
| createdAt    | timestamp      | Auto               |
| updatedAt    | timestamp      | Auto               |

#### 27. Promotion

Discount code or automatic promotion.

| Field              | Type       | Notes                                    |
| ------------------ | ---------- | ---------------------------------------- |
| id                 | string     | Primary key                              |
| code               | string     | e.g., "SAVE20"                           |
| type               | enum       | 'standard' or 'buyget'                   |
| status             | enum       | 'draft', 'active', 'inactive', 'expired' |
| isAutomatic        | boolean    | Auto-apply without code                  |
| isTaxInclusive     | boolean    |                                          |
| campaignId         | string?    | FK → Campaign                            |
| organizationId     | string?    | FK → Organization (null = platform)      |
| startsAt           | timestamp? |                                          |
| endsAt             | timestamp? |                                          |
| usageLimit         | integer?   | Max total uses                           |
| usageCount         | integer    | Default: 0                               |
| customerUsageLimit | integer?   | Max per customer                         |
| createdAt          | timestamp  | Auto                                     |
| updatedAt          | timestamp  | Auto                                     |
| deletedAt          | timestamp? | Soft delete                              |

**Unique Constraint**: (code, organizationId)

#### 28. ApplicationMethod

How the promotion discount is applied.

| Field               | Type          | Notes                        |
| ------------------- | ------------- | ---------------------------- |
| id                  | string        | Primary key                  |
| promotionId         | string        | FK → Promotion               |
| type                | enum          | 'fixed' or 'percentage'      |
| targetType          | enum          | 'items', 'shipping', 'order' |
| allocation          | enum          | 'each' or 'across'           |
| value               | decimal(12,2) | Discount amount or %         |
| currencyCode        | string        | Default: 'UGX'               |
| maxQuantity         | integer?      | Max items affected           |
| buyRulesMinQuantity | integer?      | Buy X (for buyget)           |
| applyToQuantity     | integer?      | Get Y free (for buyget)      |
| createdAt           | timestamp     | Auto                         |
| updatedAt           | timestamp     | Auto                         |

#### 29. PromotionRule

Conditions for promotion eligibility.

| Field       | Type      | Notes                                      |
| ----------- | --------- | ------------------------------------------ |
| id          | string    | Primary key                                |
| promotionId | string    | FK → Promotion                             |
| description | string?   |                                            |
| attribute   | enum      | See below                                  |
| operator    | enum      | 'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in' |
| createdAt   | timestamp | Auto                                       |
| updatedAt   | timestamp | Auto                                       |

**Rule Attributes**:

- `product_id` - Specific products
- `product_category_id` - Product categories
- `customer_id` - Specific customers
- `customer_group_id` - Customer groups
- `currency_code` - Currency match
- `cart_total` - Minimum cart value
- `item_quantity` - Minimum quantity

#### 30. PromotionRuleValue

Values for promotion rules.

| Field           | Type      | Notes              |
| --------------- | --------- | ------------------ |
| id              | string    | Primary key        |
| promotionRuleId | string    | FK → PromotionRule |
| value           | string    | The actual value   |
| createdAt       | timestamp | Auto               |

#### 31. PromotionUsage

Tracks when promotions are used.

| Field          | Type          | Notes          |
| -------------- | ------------- | -------------- |
| id             | string        | Primary key    |
| promotionId    | string        | FK → Promotion |
| orderId        | string        | FK → Order     |
| customerId     | string        |                |
| discountAmount | decimal(12,2) |                |
| currencyCode   | string        | Default: 'UGX' |
| createdAt      | timestamp     | Auto           |

---

## User Scenarios & Acceptance Criteria

### User Story 1 - Centralized Product Catalog Management (Priority: P1)

As a Platform Administrator, I need to define and manage a master list of products so that data quality is consistent across all vendors.

**Why this priority**: Foundational data structure; vendors cannot sell anything without the master product list.

**Acceptance Scenarios**:

1. **Given** I am a Platform Admin (`is_staff = true`), **When** I create a new product with name, description, category, brand, and images, **Then** the product is saved to the master catalog.
2. **Given** a product exists, **When** I edit its details, **Then** the updates are reflected for all potential vendors linking to it.
3. **Given** I am a Vendor, **When** I try to edit a master product's core details (name, description), **Then** the system prevents this action.
4. **Given** I am a Platform Admin, **When** I create a product category with parent, **Then** the hierarchical relationship is preserved.
5. **Given** I am a Platform Admin, **When** I deactivate a product (`isActive = false`), **Then** all vendor variants become hidden from customers.

---

### User Story 2 - Vendor Product Variant Listing (Priority: P1)

As a Vendor, I need to select products from the master catalog and define my specific variants (price, stock, unit) so that I can sell items without re-entering base data.

**Why this priority**: Enables the supply side of the marketplace.

**Acceptance Scenarios**:

1. **Given** a master product "Fresh Milk" exists, **When** I (Vendor) select it, **Then** I can create a variant with SKU, unit (e.g., "1 liter"), price (5,000 UGX), and stock quantity (50).
2. **Given** I have created a variant, **When** it is approved, **Then** it appears in my store listing.
3. **Given** I set `isAvailable = false` on a variant, **Then** customers cannot add it to cart.
4. **Given** the master product has no variants for my store, **When** a customer views my store, **Then** that product does not appear.
5. **Given** I update my variant's price, **When** a customer has this item in their cart, **Then** the cart reflects the new price at checkout.

---

### User Story 3 - Vendor Organization Management (Priority: P1)

As a Vendor Owner, I need to manage my store profile, team members, and operating hours so that my business is accurately represented.

**Why this priority**: Foundation for vendor operations.

**Acceptance Scenarios**:

1. **Given** I am a Vendor Owner, **When** I update my store's location, contact info, and logo, **Then** the changes are saved and visible to customers.
2. **Given** I set businessHours for each day, **When** a customer views my store outside hours, **Then** they see my store as "Closed" and cannot place delivery orders.
3. **Given** I set `isBusy = true`, **Then** customers see a warning and cannot place new orders.
4. **Given** I invite a team member via email, **When** they accept, **Then** they become a member of my organization with the specified role.
5. **Given** I am an org member with 'admin' role, **When** I try to delete another admin, **Then** the action is allowed if I am the owner.

---

### User Story 4 - Customer Grocery Ordering (Priority: P1)

As a Customer, I need to browse vendor products, add them to a cart, and complete checkout so that I can get groceries delivered.

**Why this priority**: Core revenue-generating flow for the grocery segment.

**Acceptance Scenarios**:

1. **Given** I am browsing a vendor's store, **When** I view products, **Then** I see only active, available variants with their prices.
2. **Given** I add items to my cart, **When** I proceed to checkout, **Then** I can select a saved address or enter a new one.
3. **Given** I have a valid address, **When** I request a delivery quote, **Then** the system calculates the fee based on distance.
4. **Given** I complete checkout, **When** the order is created, **Then** it has status `pending`, fulfillmentStatus `not_fulfilled`, and goes to the vendor for confirmation.
5. **Given** I have a promo code, **When** I apply it at checkout, **Then** the discount is calculated and applied to my order total.
6. **Given** I select `fulfillmentType = 'pickup'`, **Then** no delivery fee is charged and no rider is assigned.

---

### User Story 5 - Vendor Order Management (Priority: P1)

As a Vendor, I need to view incoming orders, accept/reject them, and mark items as fulfilled so that orders can proceed to delivery.

**Why this priority**: Vendor confirmation is required before rider dispatch.

**Acceptance Scenarios**:

1. **Given** a new order arrives, **When** I view my orders dashboard, **Then** I see the order with customer details, items, and totals.
2. **Given** an order is pending, **When** I accept it, **Then** the order moves to `fulfillmentStatus = 'fulfilled'` and triggers rider assignment.
3. **Given** an order is pending, **When** I reject it with a reason (e.g., "Out of stock"), **Then** the order is canceled and the customer is notified.
4. **Given** I need to modify an order, **When** I exchange an item for another variant, **Then** the change is logged in OrderItemEvent.
5. **Given** `fulfillmentType = 'self_delivery'`, **When** I mark as fulfilled, **Then** no external rider is requested.

---

### User Story 6 - Point-to-Point Package Delivery (Priority: P1)

As a Customer, I need to request a courier to pick up a package from Location A and deliver it to Location B.

**Why this priority**: Core revenue-generating flow for the logistics segment.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I enter pickup address, dropoff address, and package details (size, description, fragile), **Then** the system calculates a fare estimate.
2. **Given** a confirmed fare, **When** I request delivery, **Then** a Parcel is created with status `pending` and payment is captured.
3. **Given** a parcel is pending, **When** a rider is assigned, **Then** I receive the rider's name and phone, and a pickupCode is generated.
4. **Given** the rider arrives at pickup, **When** they verify the pickupCode, **Then** the parcel status changes to `picked_up`.
5. **Given** the rider completes delivery, **When** they verify the deliveryCode, **Then** the parcel status changes to `delivered`.

---

### User Story 7 - Rider Delivery Management (Priority: P2)

As a Rider, I need to receive job offers, accept deliveries, and update job status so that the logistics cycle is completed.

**Why this priority**: Fulfills the service promise; requires Orders/Jobs to exist first.

**Note**: Rider management is handled by an **external delivery system**. The platform integrates via:

- Delivery handoff queue (BullMQ in parent, Convex scheduled functions in target)
- Webhook callbacks for status updates
- Rider info denormalized on Order/Parcel records

**Acceptance Scenarios**:

1. **Given** a vendor fulfills an order, **When** the system triggers rider assignment, **Then** a DeliveryHandoff record is created with status `queued`.
2. **Given** the external system assigns a rider, **When** it calls back with rider info, **Then** the Order is updated with riderId, riderName, riderPhone.
3. **Given** the rider picks up the order, **When** the callback arrives, **Then** fulfillmentStatus changes to `shipped`.
4. **Given** the rider completes delivery, **When** the callback arrives, **Then** the Order is marked `completed`.
5. **Given** the external delivery system fails to assign a rider after 3 retry attempts (21 minutes), **Then** the DeliveryHandoff is marked `failed` and the order is flagged for manual intervention.

---

### User Story 8 - Promotions Management (Priority: P2)

As a Platform Admin or Vendor, I need to create and manage promotional campaigns so that we can attract and retain customers.

**Why this priority**: Marketing feature, enhances core ordering flow.

**Acceptance Scenarios**:

1. **Given** I am a Platform Admin, **When** I create a platform-wide promotion (organizationId = null), **Then** it applies to all vendor orders.
2. **Given** I am a Vendor, **When** I create a promotion, **Then** it only applies to my store's orders.
3. **Given** a promotion with `usageLimit = 100`, **When** the 100th customer uses it, **Then** subsequent uses are rejected.
4. **Given** a promotion with `type = 'buyget'` and buy 2 get 1 free, **When** a customer adds 3 items, **Then** one item is discounted to 0.
5. **Given** a promotion with rules for `cart_total >= 50000`, **When** cart total is 40000, **Then** the promotion does not apply.

---

### User Story 9 - Dashboard & Analytics (Priority: P2)

As a Platform Admin or Vendor, I need to view business metrics and order statistics so that I can make informed decisions.

**Why this priority**: Operational visibility, not blocking for core flows.

**Acceptance Scenarios**:

**Admin Dashboard**:

1. **Given** I am a Platform Admin, **When** I view the dashboard, **Then** I see platform-wide metrics: total orders, revenue, active vendors, new customers.
2. **Given** I view charts, **Then** I see revenue trends (daily/weekly/monthly), order status distribution, and top vendors by revenue.

**Vendor Dashboard**:

1. **Given** I am a Vendor, **When** I view my dashboard, **Then** I see my store metrics: today's orders, revenue, pending fulfillment, low stock alerts.
2. **Given** I view charts, **Then** I see my sales trends, fulfillment status distribution, and top-selling products.

---

## Edge Cases & Error Handling

### Product & Variant Edge Cases

- **Master Product Deactivation**: If a master product's `isActive` becomes false, all vendor variants MUST be hidden from customers automatically.
- **Price Change Mid-Cart**: If a vendor updates price while a customer has the item in cart, the cart MUST reflect the new price at checkout or warn the user.
- **Stock Exhaustion**: If stockQuantity reaches 0, the variant MUST become unavailable for purchase.
- **Variant Approval**: New variants require `isApproved = true` before appearing to customers. All variants require manual admin approval before becoming visible.

### Order Edge Cases

- **Vendor Rejection**: If a vendor rejects an order, the customer MUST be notified and payment authorization voided/refunded.
- **Partial Fulfillment**: If a vendor can only fulfill part of an order, they can mark items as removed (logged in OrderItemEvent) and adjust totals.
- **Order Expiration**: If a vendor doesn't respond to an order within 10 minutes, the order is auto-canceled and the customer is notified.

### Delivery Edge Cases

- **Rider Unavailability**: Rider assignment is handled by the external delivery system. The platform's DeliveryHandoff record tracks integration attempts. If the external system returns an error, retry with exponential backoff (1m, 5m, 15m). After 3 failed attempts (21 minutes total), mark handoff as `failed` and notify admin for manual intervention. Rider-level timeout/surge logic is managed by the external delivery system, not the platform.
- **Assignment Timeout**: If a rider does not accept the assignment within 30 seconds, the system re-assigns to the next nearest rider.
- **Delivery Handoff Failure**: If the external delivery system returns an error, the DeliveryHandoff status is marked `failed` with attemptCount incremented. Retry policy: 3 retries with exponential backoff at 1 minute, 5 minutes, and 15 minutes. After all retries exhausted, the handoff is marked permanently failed and requires manual intervention.

### Parcel Edge Cases

- **Invalid Address**: If coordinates cannot be resolved, the fare calculation fails and the user is prompted to correct the address.
- **Pickup Verification Failure**: If the pickupCode doesn't match, the rider cannot mark as picked up.
- **Delivery Failure**: If delivery fails (recipient unavailable, wrong address), the parcel status becomes `failed` and requires resolution.

### Promotion Edge Cases

- **Budget Exhaustion**: If a campaign budget's usedAmount reaches limitAmount, the promotion becomes inactive.
- **Expired Promotion**: If current time passes endsAt, the promotion status becomes `expired`.
- **Code Collision**: Promotion codes must be unique within the same organization scope.

---

## Requirements Summary

### Functional Requirements

| ID     | Requirement                                                                                    | Priority |
| ------ | ---------------------------------------------------------------------------------------------- | -------- |
| FR-001 | System MUST support distinct user roles: Platform Admin, Vendor, Rider (external), Customer    | P1       |
| FR-002 | Platform Admins MUST be the exclusive editors of the Master Product Catalog                    | P1       |
| FR-003 | Vendors MUST be able to create Variants linked to Master Products with Price, Stock, Unit, SKU | P1       |
| FR-004 | Vendor A's price/stock changes MUST NOT affect Vendor B's variants                             | P1       |
| FR-005 | Organizations MUST have location, business hours, and operating status                         | P1       |
| FR-006 | Customers MUST be able to add items to cart and checkout with address selection                | P1       |
| FR-007 | Orders MUST track status, fulfillmentStatus, paymentStatus, and fulfillmentType                | P1       |
| FR-008 | Vendors MUST be able to accept/reject orders before rider dispatch                             | P1       |
| FR-009 | System MUST integrate with external delivery system for rider assignment                       | P1       |
| FR-010 | Customers MUST be able to request P2P parcel delivery with size category pricing               | P1       |
| FR-011 | Parcels MUST have verification codes for pickup and delivery                                   | P1       |
| FR-012 | System MUST calculate delivery fees based on distance                                          | P1       |
| FR-013 | System MUST support promotional campaigns with rules and budgets                               | P2       |
| FR-014 | All order/parcel state changes MUST be logged in event tables                                  | P2       |
| FR-015 | Dashboard MUST show key metrics for admins and vendors                                         | P2       |
| FR-016 | Team invitations MUST support email-based onboarding                                           | P2       |

### Non-Functional Requirements

| ID      | Requirement                                        |
| ------- | -------------------------------------------------- |
| NFR-001 | Use Clerk for authentication (as per constitution) |
| NFR-002 | Use Convex for backend (realtime, type-safe)       |
| NFR-003 | Use TanStack Start for frontend routing            |
| NFR-004 | Use shadcn/ui for UI components                    |
| NFR-005 | All data MUST be strongly typed (no `any`)         |
| NFR-006 | Currency defaults to UGX (Ugandan Shilling)        |
| NFR-007 | Timezone defaults to Africa/Kampala                |

---

## Success Criteria

| ID     | Metric                                               | Target       |
| ------ | ---------------------------------------------------- | ------------ |
| SC-001 | Platform Admin can create a product with images      | < 2 minutes  |
| SC-002 | Vendor can list a variant with pricing               | < 30 seconds |
| SC-003 | Customer can complete checkout                       | < 5 steps    |
| SC-004 | P2P delivery request submission                      | < 3 steps    |
| SC-005 | Data integrity: sold items map to valid variants     | 100%         |
| SC-006 | Completed deliveries have pickup/delivery timestamps | 100%         |
| SC-007 | All state changes logged in event tables             | 100%         |

---

## Assumptions

1. Authentication handled by Clerk (as per constitution)
2. Location services available via Mapbox or similar (address resolution, distance calculation)
3. External rider/delivery system handles actual rider management, assignments, and tracking
4. Platform acts as merchant of record; payouts handled via separate back-office process
5. WebSocket/realtime updates provided by Convex subscriptions
6. Image uploads handled via Convex file storage

---

## Out of Scope (for MVP)

1. Real-time rider tracking map in customer app (external system handles)
2. In-app chat between customer/rider
3. Complex inventory management (just stockQuantity tracking)
4. Multi-currency support (UGX only for MVP)
5. Automated payout settlement
6. Customer loyalty/rewards program
7. Scheduled/future orders
