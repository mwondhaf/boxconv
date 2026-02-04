# Data Model: Grocery & Logistics Platform

## Conceptual Model

### Users & Roles

- **User**: Core identity (synced from Clerk).
  - Role: `admin` | `vendor` | `rider` | `customer`
- **RiderProfile**: Extension for riders.
  - `status`: `idle` | `busy` | `offline`
  - `location`: `{ lat, lng }`
  - `geohash`: String for geo-queries

### Product Catalog

- **MasterProduct**: Global definition (Admin only).
  - `name`, `description`, `imageUrl`, `category`
- **ProductVariant**: Vendor offer (Vendor only).
  - `masterProductId` (Ref)
  - `vendorId` (Ref to User)
  - `price`, `stockQuantity`, `sku`

### Logistics (Groceries)

- **Order**: A purchase from a specific vendor.
  - `customerId`, `vendorId`
  - `status`: `pending` -> `vendor_confirmed` -> `searching_rider` -> `rider_accepted` -> `picked_up` -> `delivered`
  - `items`: Array of `{ variantId, quantity, priceAtPurchase }`
  - `deliveryAddress`
  - `riderId` (optional, assigned later)

### Logistics (Package Delivery)

- **DeliveryJob**: Point-to-Point request.
  - `customerId`
  - `pickupLocation`, `dropoffLocation`
  - `packageDetails`
  - `status`: `pending` -> `searching_rider` -> `rider_accepted` -> `picked_up` -> `delivered`
  - `riderId` (optional)
  - `fee`

### Financials

- **LedgerEntry**: Accounting record.
  - `payeeId` (Vendor or Rider)
  - `amount`
  - `type`: `credit` (payout owed) | `debit` (payout paid)
  - `referenceId` (OrderId or DeliveryJobId)

## Schema Definition (Convex)

See `/specs/001-grocery-logistics-platform/contracts/schema.ts` for the exact TypeScript definition.
