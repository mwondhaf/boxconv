# 🚀 IMMEDIATE ACTIONS - Start Here

**Date**: 2025-01-10  
**Priority**: URGENT  
**Estimated Time**: 1-2 days total

---

## 📋 Summary

You need to implement **6 critical tasks** to enable customers to:
1. ✅ See delivery prices in the mobile app checkout
2. ✅ Complete order placement with accurate totals
3. ✅ Browse only real stores (filter out rider organizations)

---

## 🎯 The Problem

**Current State**:
- ❌ Customers cannot see delivery fees before placing orders
- ❌ Rider organizations appear in store listings (should be hidden)
- ❌ Order totals don't include delivery costs in the UI

**Impact**: 
- Customers can't make informed purchase decisions
- Confusion about which stores are actual stores vs rider organizations
- Potential incorrect order totals

---

## ✅ The Solution (6 Tasks)

### Part A: Delivery Pricing (Tasks 1-3) - 3-4 hours

**Goal**: Show delivery fees in mobile checkout

1. **T068a** - Fetch delivery quotes from backend
   - File: `boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx`
   - Add: `useQuery` to call `api.orders.getDeliveryQuote`
   - Time: 2-3 hours

2. **T068b** - Display delivery fees in UI
   - File: Same as above
   - Add: Delivery fee row in order summary
   - Update: Grand total calculation
   - Time: 1-2 hours

3. **T068c** - Verify backend integration
   - Check: Backend already calculates delivery in `checkout.complete`
   - Time: 30 minutes (verification only)

### Part B: Organization Filtering (Tasks 4-6) - 2-3 hours

**Goal**: Hide rider organizations from customer app

4. **T008a** - Create "Riders" category
   - Method: Convex Dashboard (easiest)
   - Action: Add category with name="Riders", slug="riders"
   - Time: 10 minutes

5. **T021a** - Filter in mobile app
   - File: `boxkuboxapp/lib/convex-queries.ts`
   - Add: `excludeCategories: ["riders"]` to store queries
   - Time: 1 hour

6. **T021b** - Filter in backend
   - Files: `convex/organizations.ts`, `convex/storeLocations.ts`
   - Add: Category filtering to queries
   - Time: 1 hour

---

## 🏃 Quick Start Guide

### Step 1: Backend Setup (40 minutes)

```bash
# Terminal 1: Start Convex
cd boxkubox/boxconv
npx convex dev
```

1. **Create "Riders" category** (Task 4):
   - Open Convex Dashboard (URL shown in terminal)
   - Go to `organizationCategories` table
   - Click "Add Document"
   - Insert:
     ```json
     {
       "name": "Riders",
       "slug": "riders"
     }
     ```

2. **Update backend queries** (Task 6):
   - Edit `convex/organizations.ts` → Add `excludeCategories` parameter to `listActive`
   - Edit `convex/storeLocations.ts` → Add `excludeCategories` parameter to `getNearby`
   - See `CRITICAL_TASKS.md` for detailed code

### Step 2: Mobile App Updates (3-4 hours)

```bash
# Terminal 2: Start mobile app
cd boxkuboxapp
npx expo start
```

1. **Fetch delivery quotes** (Task 1):
   - Edit `app/(all)/(grocery)/(main)/checkout.tsx`
   - Add state: `const [deliveryQuotes, setDeliveryQuotes] = useState<Map<string, number>>(new Map())`
   - Add useEffect to fetch quotes for each store
   - Use: `api.orders.getDeliveryQuote`

2. **Display delivery fees** (Task 2):
   - Update order summary to show:
     - Subtotal
     - Delivery Fee (NEW)
     - Total
   - Update grand total calculation

3. **Add category filters** (Task 5):
   - Edit `lib/convex-queries.ts` (or where store queries are)
   - Add `excludeCategories: ["riders"]` to all store listing queries

### Step 3: Test (30 minutes)

1. **Test Delivery Pricing**:
   - Add items to cart in mobile app
   - Go to checkout
   - Select delivery address
   - ✅ Verify delivery fee appears
   - ✅ Verify total includes delivery
   - Complete order
   - ✅ Verify order has correct `deliveryTotal` in database

2. **Test Organization Filtering**:
   - Assign a test organization to "Riders" category
   - Browse stores in mobile app
   - ✅ Verify rider organization is hidden
   - ✅ Verify normal stores still appear

---

## 📝 Code Snippets

### 1. Fetch Delivery Quote (Task 1)

```typescript
// boxkuboxapp/app/(all)/(grocery)/(main)/checkout.tsx

import { useQuery } from "convex/react";

// Add state
const [deliveryQuotes, setDeliveryQuotes] = useState<Map<string, number>>(new Map());

// Fetch quotes when address selected
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

      try {
        const quote = await getDeliveryQuote({
          organizationId: storeId as Id<"organizations">,
          deliveryAddressId: selectedAddressId,
          orderSubtotal: storeSubtotal,
        });

        if (quote) {
          quotes.set(storeId, quote.deliveryFee);
        }
      } catch (error) {
        console.error("Failed to get delivery quote:", error);
        quotes.set(storeId, 0);
      }
    }

    setDeliveryQuotes(quotes);
  };

  fetchQuotes();
}, [itemsByStore, selectedAddressId, fulfillmentType]);
```

### 2. Display Delivery Fee (Task 2)

```tsx
{/* Add to order summary for each store */}
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
```

### 3. Backend Category Filter (Task 6)

```typescript
// convex/organizations.ts

export const listActive = query({
  args: {
    excludeCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let orgs = await ctx.db
      .query("organizations")
      .filter((q) => q.neq(q.field("isBusy"), true))
      .collect();

    // Filter out excluded categories
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
      
      orgs = orgs.filter(
        (org) => !org.categoryId || !excludedCategoryIds.has(org.categoryId)
      );
    }

    return orgs;
  },
});
```

### 4. Mobile App Category Filter (Task 5)

```typescript
// boxkuboxapp/lib/convex-queries.ts

export function useStores() {
  const stores = useQuery(api.organizations.listActive, {
    excludeCategories: ["riders"], // Hide rider organizations
  });
  
  return stores;
}
```

---

## 📂 Files to Edit

### Backend (boxconv):
1. `convex/organizations.ts` - Add category filtering
2. `convex/storeLocations.ts` - Add category filtering
3. Convex Dashboard - Create "Riders" category

### Mobile (boxkuboxapp):
1. `app/(all)/(grocery)/(main)/checkout.tsx` - Main changes here
2. `lib/convex-queries.ts` - Add category filters

---

## ✅ Success Criteria

**When done correctly**:
- ✅ Delivery fee shows in checkout for each store
- ✅ Grand total = subtotal + delivery fees
- ✅ Orders saved with correct `deliveryTotal`
- ✅ Rider organizations hidden from customer app
- ✅ Normal stores still visible
- ✅ No console errors

---

## 📚 Detailed Documentation

For complete code examples and step-by-step instructions, see:
- **`CRITICAL_TASKS.md`** - Detailed implementation guide
- **`specs/001-grocery-logistics-platform/tasks.md`** - Task tracking

---

## 🆘 Need Help?

**Backend already implemented**:
- ✅ `convex/orders.ts` - `getDeliveryQuote` query exists
- ✅ `convex/checkout.ts` - `complete` mutation handles delivery totals
- ✅ `convex/lib/fare.ts` - Fare calculation logic

**What's missing**:
- ❌ Mobile app not calling `getDeliveryQuote`
- ❌ Mobile app not displaying delivery fees
- ❌ Category filtering not implemented

**Common Issues**:
- **Delivery fee not showing**: Check if `getDeliveryQuote` is being called
- **Rider orgs still visible**: Verify category slug is exactly "riders"
- **TypeScript errors**: Import `Id` from `@/convex/_generated/dataModel`

---

## 🎯 Priority Order

**Do in this order**:
1. ✅ Create "Riders" category (10 min) - FASTEST WIN
2. ✅ Backend category filtering (1 hour)
3. ✅ Mobile category filtering (1 hour)
4. ✅ Fetch delivery quotes (2 hours)
5. ✅ Display delivery fees (1 hour)
6. ✅ Test everything (30 min)

**Total**: 5-6 hours of focused work

---

**Start with Task 4 (Create category) - takes only 10 minutes and unblocks Task 5-6!**

Good luck! 🚀
