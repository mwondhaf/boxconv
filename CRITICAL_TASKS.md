# 🔴 CRITICAL TASKS - Implement Immediately

**Last Updated**: 2025-01-10  
**Status**: URGENT - Required for mobile app order completion  
**Estimated Time**: 1-2 days  
**Assignee**: TBD

---

## Overview

These 6 critical tasks enable customers to:
1. ✅ See accurate delivery prices in the mobile app
2. ✅ Complete order placement with delivery fees
3. ✅ Browse only real stores (not rider organizations)

**Current State**: 
- ❌ Customers cannot see delivery fees before checkout
- ❌ Order totals may be incorrect without delivery calculation
- ❌ Rider organizations appear in store listings (incorrect)

**Target State**:
- ✅ Delivery fees displayed for each store
- ✅ Accurate total including delivery
- ✅ Only customer-facing stores appear in app

---

## Task 1: Fetch Delivery Quote in Mobile Checkout

**Task ID**: T068a  
**Priority**: 🔴 CRITICAL  
**File**: `boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx`  
**Estimated Time**: 2-3 hours

### What to Do

Add delivery quote fetching for each store in the cart:

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Inside CheckoutScreen component:

// Add state for delivery quotes
const [deliveryQuotes, setDeliveryQuotes] = useState<Map<string, number>>(new Map());

// For each store, fetch delivery quote
useEffect(() => {
  if (fulfillmentType !== "delivery" || !selectedAddressId) {
    setDeliveryQuotes(new Map());
    return;
  }

  const fetchQuotes = async () => {
    const quotes = new Map<string, number>();
    
    for (const [storeId, storeItems] of itemsByStore) {
      const storeSubtotal = storeItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Fetch delivery quote from backend
      try {
        const quote = await getDeliveryQuote({
          organizationId: storeId as Id<"organizations">,
          deliveryAddressId: selectedAddressId,
          orderSubtotal: storeSubtotal,
          isExpress: false,
        });

        if (quote) {
          quotes.set(storeId, quote.deliveryFee);
        }
      } catch (error) {
        console.error(`Failed to get delivery quote for store ${storeId}:`, error);
        // Set default delivery fee or show error
        quotes.set(storeId, 0);
      }
    }

    setDeliveryQuotes(quotes);
  };

  fetchQuotes();
}, [itemsByStore, selectedAddressId, fulfillmentType]);
```

### Backend Query Available

The backend query is already implemented:

```typescript
// convex/orders.ts - getDeliveryQuote
{
  organizationId: Id<"organizations">,
  deliveryAddressId: Id<"customerAddresses">,
  orderSubtotal: number,
  isExpress?: boolean
}

// Returns:
{
  deliveryFee: number,
  currency: string,
  distanceKm: number,
  estimatedMinutes: number
}
```

### Import Required

Add to imports:
```typescript
import { useMutation, useQuery } from "convex/react";

// Add mutation for getting quote
const getDeliveryQuote = useMutation(api.orders.getDeliveryQuote);
```

---

## Task 2: Display Delivery Fee in UI

**Task ID**: T068b  
**Priority**: 🔴 CRITICAL  
**File**: `boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx`  
**Estimated Time**: 1-2 hours

### What to Do

Update the order summary to show delivery fees:

```tsx
// For each store section, add delivery fee display:

{/* Order Summary */}
<View className="mt-4 space-y-2">
  {/* Subtotal */}
  <View className="flex-row justify-between items-center">
    <AppText className="text-sm text-muted">Subtotal</AppText>
    <AppText className="text-sm font-medium">
      {formatCheckoutPrice(storeSubtotal, currency)}
    </AppText>
  </View>

  {/* Delivery Fee - NEW */}
  {fulfillmentType === "delivery" && (
    <View className="flex-row justify-between items-center">
      <AppText className="text-sm text-muted">Delivery Fee</AppText>
      {deliveryQuotes.has(storeId) ? (
        <AppText className="text-sm font-medium text-accent">
          {formatCheckoutPrice(deliveryQuotes.get(storeId)!, currency)}
        </AppText>
      ) : (
        <Skeleton className="h-4 w-16" />
      )}
    </View>
  )}

  {/* Total */}
  <Divider className="my-2" />
  <View className="flex-row justify-between items-center">
    <AppText className="text-base font-semibold text-foreground">Total</AppText>
    <AppText className="text-base font-semibold text-accent">
      {formatCheckoutPrice(
        storeSubtotal + (deliveryQuotes.get(storeId) ?? 0),
        currency
      )}
    </AppText>
  </View>
</View>
```

### Update Grand Total Calculation

```typescript
// Calculate grand total including delivery fees
const calculateGrandTotal = useCallback(() => {
  let total = 0;
  
  for (const [storeId, storeItems] of itemsByStore) {
    const storeSubtotal = storeItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = deliveryQuotes.get(storeId) ?? 0;
    total += storeSubtotal + deliveryFee;
  }
  
  return total;
}, [itemsByStore, deliveryQuotes]);

const grandTotalWithDelivery = calculateGrandTotal();
```

### Update Summary Section

```tsx
{/* Grand Total Summary */}
<Surface className="mx-4 mb-4 p-4 rounded-xl">
  <View className="flex-row justify-between items-center mb-2">
    <AppText className="text-sm text-muted">Items Subtotal</AppText>
    <AppText className="text-sm">{formatCheckoutPrice(grandTotal, currency)}</AppText>
  </View>
  
  {fulfillmentType === "delivery" && (
    <View className="flex-row justify-between items-center mb-2">
      <AppText className="text-sm text-muted">Total Delivery Fees</AppText>
      <AppText className="text-sm text-accent">
        {formatCheckoutPrice(
          Array.from(deliveryQuotes.values()).reduce((sum, fee) => sum + fee, 0),
          currency
        )}
      </AppText>
    </View>
  )}
  
  <Divider className="my-2" />
  
  <View className="flex-row justify-between items-center">
    <AppText className="text-lg font-bold text-foreground">Grand Total</AppText>
    <AppText className="text-lg font-bold text-accent">
      {formatCheckoutPrice(grandTotalWithDelivery, currency)}
    </AppText>
  </View>
</Surface>
```

---

## Task 3: Pass Delivery Fee to Backend

**Task ID**: T068c  
**Priority**: 🔴 CRITICAL  
**File**: `boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx`  
**Estimated Time**: 30 minutes

### What to Do

The backend `checkout.complete` mutation already handles delivery fee calculation, but verify it's working:

```typescript
// The completeCheckout mutation already:
// 1. Recalculates delivery fee on the backend
// 2. Stores it in the order
// 3. Includes it in order total

// No changes needed in mobile app for this task!
// Backend handles it automatically in convex/checkout.ts
```

### Verification

After placing order, check that:
1. Order has correct `deliveryTotal` field
2. Order total includes delivery fee
3. Customer sees accurate total in order confirmation

---

## Task 4: Create "Riders" Organization Category

**Task ID**: T008a  
**Priority**: 🔴 CRITICAL  
**Method**: Via Convex Dashboard or Seed Script  
**Estimated Time**: 10 minutes

### Option A: Via Convex Dashboard (Easiest)

1. Open Convex Dashboard: `npx convex dev` → click dashboard URL
2. Navigate to `organizationCategories` table
3. Click "Add Document"
4. Insert:
```json
{
  "name": "Riders",
  "slug": "riders",
  "parentId": null
}
```
5. Save

### Option B: Via Seed Script

Create `convex/seed/organizationCategories.ts`:

```typescript
import { internalMutation } from "../_generated/server";

export const seedRiderCategory = internalMutation({
  handler: async (ctx) => {
    // Check if already exists
    const existing = await ctx.db
      .query("organizationCategories")
      .withIndex("by_slug", (q) => q.eq("slug", "riders"))
      .first();

    if (existing) {
      console.log("Riders category already exists");
      return existing._id;
    }

    // Create new category
    const categoryId = await ctx.db.insert("organizationCategories", {
      name: "Riders",
      slug: "riders",
    });

    console.log("Created Riders category:", categoryId);
    return categoryId;
  },
});
```

Then run:
```bash
npx convex run seed/organizationCategories:seedRiderCategory
```

### Option C: Manual SQL (Drizzle - Old System)

If migrating from old system, ensure category exists in new Convex DB.

---

## Task 5: Filter Rider Organizations in Mobile App

**Task ID**: T021a  
**Priority**: 🔴 CRITICAL  
**File**: `boxkuboxapp/lib/convex-queries.ts` (or wherever store queries are)  
**Estimated Time**: 1 hour

### What to Do

Update store browsing queries to exclude rider organizations:

```typescript
// In boxkuboxapp/lib/convex-queries.ts or similar

// Add to store listing queries
export function useStores() {
  const stores = useQuery(api.organizations.listActive, {
    excludeCategories: ["riders"], // Exclude rider organizations
  });
  
  return stores;
}

// For nearby stores
export function useNearbyStores(lat: number, lng: number, radiusKm: number) {
  const stores = useQuery(api.storeLocations.getNearby, {
    lat,
    lng,
    radiusKm,
    excludeCategories: ["riders"], // Exclude rider organizations
  });
  
  return stores;
}

// For search
export function useSearchStores(query: string) {
  const stores = useQuery(api.organizations.search, {
    query,
    excludeCategories: ["riders"], // Exclude rider organizations
  });
  
  return stores;
}
```

### Apply to All Store Queries

Find all places in mobile app that query organizations/stores:
- Browse screen
- Search screen
- Nearby stores
- Store listings
- Category browsing

Add the `excludeCategories: ["riders"]` parameter to each.

---

## Task 6: Backend Filtering for Rider Organizations

**Task ID**: T021b  
**Priority**: 🔴 CRITICAL  
**File**: `boxkubox/boxconv/convex/storeLocations.ts`, `convex/organizations.ts`  
**Estimated Time**: 1 hour

### What to Do - Part 1: Update `organizations.ts`

```typescript
// convex/organizations.ts

export const listActive = query({
  args: {
    excludeCategories: v.optional(v.array(v.string())), // NEW
  },
  handler: async (ctx, args) => {
    let orgs = await ctx.db
      .query("organizations")
      .filter((q) => q.neq(q.field("isBusy"), true))
      .collect();

    // Filter out excluded categories
    if (args.excludeCategories && args.excludeCategories.length > 0) {
      const excludedCategoryIds = new Set<Id<"organizationCategories">>();
      
      // Get category IDs for excluded slugs
      for (const slug of args.excludeCategories) {
        const category = await ctx.db
          .query("organizationCategories")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        
        if (category) {
          excludedCategoryIds.add(category._id);
        }
      }
      
      // Filter organizations
      orgs = orgs.filter(
        (org) => !org.categoryId || !excludedCategoryIds.has(org.categoryId)
      );
    }

    return orgs;
  },
});
```

### What to Do - Part 2: Update `storeLocations.ts`

```typescript
// convex/storeLocations.ts

export const getNearby = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusKm: v.number(),
    excludeCategories: v.optional(v.array(v.string())), // NEW
  },
  handler: async (ctx, args) => {
    // ... existing geohash logic ...

    // Get stores
    let stores = await ctx.db
      .query("organizations")
      .withIndex("by_geohash")
      // ... geohash filtering ...
      .collect();

    // Filter by category if specified
    if (args.excludeCategories && args.excludeCategories.length > 0) {
      const excludedCategoryIds = new Set<Id<"organizationCategories">>();
      
      for (const slug of args.excludeCategories) {
        const category = await ctx.db
          .query("organizationCategories")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        
        if (category) {
          excludedCategoryIds.add(category._id);
        }
      }
      
      stores = stores.filter(
        (store) => !store.categoryId || !excludedCategoryIds.has(store.categoryId)
      );
    }

    return stores;
  },
});
```

### Apply to All Organization Queries

Update these functions:
- `listActive` - list all active organizations
- `listByCategory` - filter by category
- `search` - search organizations
- `getNearby` (storeLocations) - nearby stores
- Any other query that returns organizations to customers

---

## Testing Checklist

### Test Task 1-3 (Delivery Pricing)

- [ ] Open mobile app and add items to cart
- [ ] Go to checkout
- [ ] Select delivery address
- [ ] Verify delivery fee appears for each store
- [ ] Verify delivery fee is reasonable (based on distance)
- [ ] Verify grand total = subtotal + delivery fees
- [ ] Complete checkout
- [ ] Verify order has correct deliveryTotal in database
- [ ] Verify order confirmation shows delivery fee

### Test Task 4-6 (Organization Filtering)

- [ ] Create a "Riders" organization category (if not exists)
- [ ] Assign a test organization to "Riders" category
- [ ] Open mobile app
- [ ] Verify rider organization does NOT appear in:
  - [ ] Store listings
  - [ ] Search results
  - [ ] Nearby stores
  - [ ] Browse by category
- [ ] Verify normal stores still appear
- [ ] Verify rider organization visible in admin panel (web)

---

## Rollout Plan

### Step 1: Backend (30 minutes)
1. Create "Riders" category (Task 4)
2. Update organization queries (Task 6)
3. Test in Convex dashboard

### Step 2: Mobile App (2-3 hours)
1. Add delivery quote fetching (Task 1)
2. Update UI to show delivery fees (Task 2)
3. Verify checkout flow (Task 3)
4. Add category filtering (Task 5)
5. Test on simulator/device

### Step 3: Verification (30 minutes)
1. Test complete order flow
2. Verify delivery fees calculated correctly
3. Verify rider organizations hidden
4. Check order totals in database

---

## Success Criteria

✅ **Delivery Pricing Working**:
- Customers see delivery fee for each store
- Delivery fee calculated based on distance
- Grand total includes delivery fees
- Orders saved with correct deliveryTotal

✅ **Organization Filtering Working**:
- Rider organizations don't appear in customer app
- Normal stores appear normally
- Admin can still see rider organizations
- No console errors

---

## Support & References

**Backend Files**:
- `convex/orders.ts` - getDeliveryQuote query
- `convex/checkout.ts` - complete mutation
- `convex/organizations.ts` - organization queries
- `convex/storeLocations.ts` - nearby stores query
- `convex/lib/fare.ts` - delivery fee calculation

**Mobile App Files**:
- `boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx` - checkout screen
- `boxkuboxapp/lib/convex-queries.ts` - query hooks
- `boxkuboxapp/components/grocery/cart-store-section.tsx` - cart display

**Related Docs**:
- `BOXRIDERS_FEATURES_IMPLEMENTATION.md` - Full rider features
- `specs/001-grocery-logistics-platform/tasks.md` - All tasks
- `convex/lib/fare.ts` - Fare calculation logic

---

**Questions?** Check the implementation files or ask in team chat.

**Blocked?** Escalate immediately - these are critical path tasks!
