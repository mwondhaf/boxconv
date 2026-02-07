import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getImageUrl } from "./lib/r2";

// =============================================================================
// CONSTANTS
// =============================================================================

// Cart expires after 24 hours of inactivity
const CART_EXPIRY_MS = 24 * 60 * 60 * 1000;

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a cart by ID with items
 */
export const get = query({
  args: { id: v.id("carts") },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.id);
    if (!cart) return null;

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.id))
      .collect();

    // Enrich items with variant and product info
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const variant = await ctx.db.get(item.variantId);
        if (!variant) return null;

        const product = await ctx.db.get(variant.productId);

        // Get price info
        const priceSet = await ctx.db
          .query("priceSets")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .first();

        let price = 0;
        let salePrice: number | undefined;
        let currency = "UGX";

        if (priceSet) {
          const moneyAmount = await ctx.db
            .query("moneyAmounts")
            .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
            .first();

          if (moneyAmount) {
            price = moneyAmount.amount;
            salePrice = moneyAmount.saleAmount ?? undefined;
            currency = moneyAmount.currency;
          }
        }

        const effectivePrice =
          salePrice && salePrice < price ? salePrice : price;

        return {
          ...item,
          variant: {
            _id: variant._id,
            sku: variant.sku,
            unit: variant.unit,
            isAvailable: variant.isAvailable,
          },
          product: product
            ? {
                _id: product._id,
                name: product.name,
                slug: product.slug,
              }
            : null,
          price,
          salePrice,
          effectivePrice,
          currency,
          subtotal: effectivePrice * item.quantity,
        };
      })
    );

    // Filter out null items (variants that no longer exist)
    const validItems = enrichedItems.filter((item) => item !== null);

    // Calculate totals
    const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...cart,
      items: validItems,
      subtotal,
      itemCount,
    };
  },
});

/**
 * Get cart for a customer by clerk ID
 */
export const getByClerkId = query({
  args: {
    clerkId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const cartQuery = ctx.db
      .query("carts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId));

    const carts = await cartQuery.collect();

    // Filter by organization if provided
    const cart = args.organizationId
      ? carts.find((c) => c.organizationId === args.organizationId)
      : carts[0];

    if (!cart) return null;

    // Check if cart is expired
    if (cart.expiresAt < Date.now()) {
      return null;
    }

    // Get items
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();

    return {
      ...cart,
      itemCount: items.length,
    };
  },
});

/**
 * Get cart for a guest session
 */
export const getBySession = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const cartQuery = ctx.db
      .query("carts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId));

    const carts = await cartQuery.collect();

    // Filter by organization if provided
    const cart = args.organizationId
      ? carts.find((c) => c.organizationId === args.organizationId)
      : carts[0];

    if (!cart) return null;

    // Check if cart is expired
    if (cart.expiresAt < Date.now()) {
      return null;
    }

    // Get items
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();

    return {
      ...cart,
      itemCount: items.length,
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new cart or return existing one for this customer/organization
 * Enforces one cart per customer per organization
 */
export const create = mutation({
  args: {
    clerkId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    organizationId: v.id("organizations"),
    currencyCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(args.clerkId || args.sessionId)) {
      throw new Error("Either clerkId or sessionId is required");
    }

    // Check for existing cart for this customer/organization
    let existingCart = null;

    if (args.clerkId) {
      // Find existing cart by clerkId and organization
      const carts = await ctx.db
        .query("carts")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .collect();

      existingCart = carts.find(
        (c) => c.organizationId === args.organizationId && c.expiresAt > Date.now()
      );
    } else if (args.sessionId) {
      // Find existing cart by sessionId and organization
      const carts = await ctx.db
        .query("carts")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();

      existingCart = carts.find(
        (c) => c.organizationId === args.organizationId && c.expiresAt > Date.now()
      );
    }

    // If cart exists, refresh its expiry and return it
    if (existingCart) {
      await ctx.db.patch(existingCart._id, {
        expiresAt: Date.now() + CART_EXPIRY_MS,
      });
      return existingCart._id;
    }

    // Create new cart
    const cartId = await ctx.db.insert("carts", {
      clerkId: args.clerkId,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      currencyCode: args.currencyCode ?? "UGX",
      expiresAt: Date.now() + CART_EXPIRY_MS,
    });

    return cartId;
  },
});

/**
 * Add an item to cart (or update quantity if already exists)
 */
export const addItem = mutation({
  args: {
    cartId: v.id("carts"),
    variantId: v.id("productVariants"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    // Check if cart is expired
    if (cart.expiresAt < Date.now()) {
      throw new Error("Cart has expired");
    }

    // Verify variant exists and is available
    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Product variant not found");
    }

    if (!variant.isAvailable) {
      throw new Error("Product variant is not available");
    }

    // Verify variant belongs to the same organization as the cart
    if (variant.organizationId !== cart.organizationId) {
      throw new Error(
        "Cannot add items from different vendors to the same cart"
      );
    }

    // Check if item already exists in cart
    const existingItem = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .filter((q) => q.eq(q.field("variantId"), args.variantId))
      .first();

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + args.quantity;
      if (newQuantity <= 0) {
        await ctx.db.delete(existingItem._id);
      } else {
        await ctx.db.patch(existingItem._id, { quantity: newQuantity });
      }
    } else if (args.quantity > 0) {
      // Add new item
      await ctx.db.insert("cartItems", {
        cartId: args.cartId,
        variantId: args.variantId,
        quantity: args.quantity,
      });
    }

    // Update cart expiry
    await ctx.db.patch(args.cartId, {
      expiresAt: Date.now() + CART_EXPIRY_MS,
    });

    return args.cartId;
  },
});

/**
 * Update item quantity in cart
 */
export const updateItemQuantity = mutation({
  args: {
    cartId: v.id("carts"),
    variantId: v.id("productVariants"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    const item = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .filter((q) => q.eq(q.field("variantId"), args.variantId))
      .first();

    if (!item) {
      throw new Error("Item not found in cart");
    }

    if (args.quantity <= 0) {
      await ctx.db.delete(item._id);
    } else {
      await ctx.db.patch(item._id, { quantity: args.quantity });
    }

    // Update cart expiry
    await ctx.db.patch(args.cartId, {
      expiresAt: Date.now() + CART_EXPIRY_MS,
    });

    return args.cartId;
  },
});

/**
 * Remove an item from cart
 */
export const removeItem = mutation({
  args: {
    cartId: v.id("carts"),
    variantId: v.id("productVariants"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    const item = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .filter((q) => q.eq(q.field("variantId"), args.variantId))
      .first();

    if (item) {
      await ctx.db.delete(item._id);
    }

    // Update cart expiry
    await ctx.db.patch(args.cartId, {
      expiresAt: Date.now() + CART_EXPIRY_MS,
    });

    return args.cartId;
  },
});

/**
 * Clear all items from cart
 */
export const clear = mutation({
  args: { cartId: v.id("carts") },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    return args.cartId;
  },
});

/**
 * Delete a cart and all its items
 */
export const remove = mutation({
  args: { cartId: v.id("carts") },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    // Delete all items first
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete the cart
    await ctx.db.delete(args.cartId);

    return { success: true };
  },
});

/**
 * Merge a guest cart into a user's cart (when they log in)
 */
export const mergeGuestCart = mutation({
  args: {
    guestSessionId: v.string(),
    clerkId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Find guest cart
    const guestCarts = await ctx.db
      .query("carts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.guestSessionId))
      .collect();

    const guestCart = guestCarts.find(
      (c) => c.organizationId === args.organizationId
    );

    if (!guestCart) {
      return null; // No guest cart to merge
    }

    // Find or create user cart
    const userCarts = await ctx.db
      .query("carts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    const userCart = userCarts.find(
      (c) => c.organizationId === args.organizationId
    );

    if (!userCart) {
      // Convert guest cart to user cart
      await ctx.db.patch(guestCart._id, {
        clerkId: args.clerkId,
        sessionId: undefined,
        expiresAt: Date.now() + CART_EXPIRY_MS,
      });
      return guestCart._id;
    }

    // Merge items from guest cart to user cart
    const guestItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", guestCart._id))
      .collect();

    for (const guestItem of guestItems) {
      const existingItem = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", userCart._id))
        .filter((q) => q.eq(q.field("variantId"), guestItem.variantId))
        .first();

      if (existingItem) {
        // Add quantities
        await ctx.db.patch(existingItem._id, {
          quantity: existingItem.quantity + guestItem.quantity,
        });
      } else {
        // Add new item to user cart
        await ctx.db.insert("cartItems", {
          cartId: userCart._id,
          variantId: guestItem.variantId,
          quantity: guestItem.quantity,
        });
      }

      // Delete guest item
      await ctx.db.delete(guestItem._id);
    }

    // Delete guest cart
    await ctx.db.delete(guestCart._id);

    // Update user cart expiry
    await ctx.db.patch(userCart._id, {
      expiresAt: Date.now() + CART_EXPIRY_MS,
    });

    return userCart._id;
  },
});

// =============================================================================
// SCHEDULED FUNCTIONS
// =============================================================================

/**
 * Clean up expired carts (internal mutation to be called by scheduler)
 */
export const cleanupExpiredCarts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired carts (limit to 100 at a time to avoid timeout)
    const expiredCarts = await ctx.db
      .query("carts")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    let deletedCount = 0;

    for (const cart of expiredCarts) {
      // Delete cart items first
      const items = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
        .collect();

      for (const item of items) {
        await ctx.db.delete(item._id);
      }

      // Delete the cart
      await ctx.db.delete(cart._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

// =============================================================================
// CHECKOUT HELPERS
// =============================================================================

// =============================================================================
// ADMIN & VENDOR REAL-TIME MONITORING QUERIES
// =============================================================================

/**
 * List all active carts for admin dashboard (real-time monitoring)
 * Returns carts with items, customer info, and organization details
 */
export const listActiveCarts = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const now = Date.now();

    // Get non-expired carts
    let cartsQuery = ctx.db
      .query("carts")
      .filter((q) => q.gt(q.field("expiresAt"), now));

    const allCarts = await cartsQuery.collect();

    // Filter by organization if specified
    const filteredCarts = args.organizationId
      ? allCarts.filter((c) => c.organizationId === args.organizationId)
      : allCarts;

    // Sort by most recently updated (using expiresAt as proxy)
    const sortedCarts = filteredCarts
      .sort((a, b) => b.expiresAt - a.expiresAt)
      .slice(0, limit);

    // Enrich with items and organization info
    const enrichedCarts = await Promise.all(
      sortedCarts.map(async (cart) => {
        // Get cart items
        const items = await ctx.db
          .query("cartItems")
          .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
          .collect();

        if (items.length === 0) return null; // Skip empty carts

        // Get organization details
        const organization = await ctx.db.get(cart.organizationId);

        // Enrich items with product details
        const enrichedItems = await Promise.all(
          items.map(async (item) => {
            const variant = await ctx.db.get(item.variantId);
            if (!variant) return null;

            const product = await ctx.db.get(variant.productId);

            // Get primary image
            let imageUrl: string | null = null;
            if (product) {
              const primaryImage = await ctx.db
                .query("productImages")
                .withIndex("by_primary", (q) =>
                  q.eq("productId", product._id).eq("isPrimary", true)
                )
                .first();
              imageUrl = getImageUrl(primaryImage?.r2Key) ?? null;
            }

            // Get price info
            const priceSet = await ctx.db
              .query("priceSets")
              .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
              .first();

            let price = 0;
            let currency = "UGX";

            if (priceSet) {
              const moneyAmount = await ctx.db
                .query("moneyAmounts")
                .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
                .first();

              if (moneyAmount) {
                price =
                  moneyAmount.saleAmount && moneyAmount.saleAmount < moneyAmount.amount
                    ? moneyAmount.saleAmount
                    : moneyAmount.amount;
                currency = moneyAmount.currency;
              }
            }

            return {
              _id: item._id,
              variantId: item.variantId,
              quantity: item.quantity,
              productName: product?.name ?? "Unknown Product",
              sku: variant.sku,
              unit: variant.unit,
              price,
              currency,
              subtotal: price * item.quantity,
              imageUrl,
            };
          })
        );

        const validItems = enrichedItems.filter((item) => item !== null);
        const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
        const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);

        // Calculate cart age
        const cartCreatedAt = cart.expiresAt - CART_EXPIRY_MS;
        const lastActivityAt = cart.expiresAt - CART_EXPIRY_MS + (CART_EXPIRY_MS - (cart.expiresAt - now));

        return {
          _id: cart._id,
          clerkId: cart.clerkId,
          sessionId: cart.sessionId,
          isGuest: !cart.clerkId,
          organizationId: cart.organizationId,
          organizationName: organization?.name ?? "Unknown Store",
          organizationSlug: organization?.slug,
          currencyCode: cart.currencyCode,
          items: validItems,
          itemCount,
          subtotal,
          createdAt: cartCreatedAt,
          lastActivityAt,
          expiresAt: cart.expiresAt,
        };
      })
    );

    return enrichedCarts.filter((cart) => cart !== null);
  },
});

/**
 * Get live cart activity feed for admin (recent cart events)
 */
export const getCartActivityFeed = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const now = Date.now();

    // Get all cart items - we'll filter by cart's organization
    const recentCartItems = await ctx.db
      .query("cartItems")
      .order("desc")
      .take(200); // Get more to filter

    const activityItems = await Promise.all(
      recentCartItems.map(async (item) => {
        const cart = await ctx.db.get(item.cartId);
        if (!cart) return null;

        // Filter by organization if specified
        if (args.organizationId && cart.organizationId !== args.organizationId) {
          return null;
        }

        // Check if cart is not expired
        if (cart.expiresAt < now) return null;

        const variant = await ctx.db.get(item.variantId);
        if (!variant) return null;

        const product = await ctx.db.get(variant.productId);
        const organization = await ctx.db.get(cart.organizationId);

        // Get primary image
        let imageUrl: string | null = null;
        if (product) {
          const primaryImage = await ctx.db
            .query("productImages")
            .withIndex("by_primary", (q) =>
              q.eq("productId", product._id).eq("isPrimary", true)
            )
            .first();
          imageUrl = getImageUrl(primaryImage?.r2Key) ?? null;
        }

        // Get price
        const priceSet = await ctx.db
          .query("priceSets")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .first();

        let price = 0;
        let currency = "UGX";

        if (priceSet) {
          const moneyAmount = await ctx.db
            .query("moneyAmounts")
            .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
            .first();

          if (moneyAmount) {
            price =
              moneyAmount.saleAmount && moneyAmount.saleAmount < moneyAmount.amount
                ? moneyAmount.saleAmount
                : moneyAmount.amount;
            currency = moneyAmount.currency;
          }
        }

        return {
          _id: item._id,
          cartId: cart._id,
          clerkId: cart.clerkId,
          isGuest: !cart.clerkId,
          organizationId: cart.organizationId,
          organizationName: organization?.name ?? "Unknown Store",
          productName: product?.name ?? "Unknown Product",
          sku: variant.sku,
          unit: variant.unit,
          quantity: item.quantity,
          price,
          currency,
          subtotal: price * item.quantity,
          imageUrl,
          // Use item creation time from Convex
          addedAt: item._creationTime,
        };
      })
    );

    return activityItems
      .filter((item) => item !== null)
      .slice(0, limit);
  },
});

/**
 * Get cart statistics for dashboard widgets
 */
export const getCartStats = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all active carts
    const allCarts = await ctx.db
      .query("carts")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    // Filter by organization if specified
    const carts = args.organizationId
      ? allCarts.filter((c) => c.organizationId === args.organizationId)
      : allCarts;

    // Count carts with items
    let totalActiveCarts = 0;
    let totalItems = 0;
    let totalValue = 0;
    let guestCarts = 0;
    let userCarts = 0;

    for (const cart of carts) {
      const items = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
        .collect();

      if (items.length === 0) continue;

      totalActiveCarts++;

      if (cart.clerkId) {
        userCarts++;
      } else {
        guestCarts++;
      }

      for (const item of items) {
        totalItems += item.quantity;

        // Get price
        const variant = await ctx.db.get(item.variantId);
        if (variant) {
          const priceSet = await ctx.db
            .query("priceSets")
            .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
            .first();

          if (priceSet) {
            const moneyAmount = await ctx.db
              .query("moneyAmounts")
              .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
              .first();

            if (moneyAmount) {
              const price =
                moneyAmount.saleAmount && moneyAmount.saleAmount < moneyAmount.amount
                  ? moneyAmount.saleAmount
                  : moneyAmount.amount;
              totalValue += price * item.quantity;
            }
          }
        }
      }
    }

    return {
      totalActiveCarts,
      totalItems,
      totalValue,
      guestCarts,
      userCarts,
      currency: "UGX",
    };
  },
});

/**
 * Subscribe to cart changes for a specific organization (vendor view)
 * Returns the latest cart activity timestamp for change detection
 */
export const getLatestCartActivity = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the most recent cart item
    const recentItem = await ctx.db
      .query("cartItems")
      .order("desc")
      .first();

    if (!recentItem) {
      return { latestActivityAt: null, hasNewActivity: false };
    }

    // If organization filter, check if the cart belongs to it
    if (args.organizationId) {
      const cart = await ctx.db.get(recentItem.cartId);
      if (!cart || cart.organizationId !== args.organizationId || cart.expiresAt < now) {
        // Find the most recent item for this organization
        const orgItems = await ctx.db
          .query("cartItems")
          .order("desc")
          .take(100);

        for (const item of orgItems) {
          const itemCart = await ctx.db.get(item.cartId);
          if (itemCart && itemCart.organizationId === args.organizationId && itemCart.expiresAt > now) {
            return {
              latestActivityAt: item._creationTime,
              hasNewActivity: true,
              itemId: item._id,
            };
          }
        }

        return { latestActivityAt: null, hasNewActivity: false };
      }
    }

    return {
      latestActivityAt: recentItem._creationTime,
      hasNewActivity: true,
      itemId: recentItem._id,
    };
  },
});

// =============================================================================
// CHECKOUT HELPERS
// =============================================================================

/**
 * Validate cart prices against current prices (for checkout)
 */
export const validatePrices = query({
  args: { cartId: v.id("carts") },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      return { valid: false, errors: ["Cart not found"] };
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    const errors: Array<string> = [];
    const warnings: Array<string> = [];
    const validatedItems: Array<{
      variantId: string;
      quantity: number;
      price: number;
      available: boolean;
      stockQuantity: number;
      hasStockIssue: boolean;
    }> = [];

    for (const item of items) {
      const variant = await ctx.db.get(item.variantId);

      if (!variant) {
        errors.push(`Product variant ${item.variantId} no longer exists`);
        continue;
      }

      if (!variant.isAvailable) {
        errors.push(`${variant.sku} is no longer available`);
        continue;
      }

      // Check stock quantity
      const hasStockIssue = variant.stockQuantity < item.quantity;
      if (hasStockIssue) {
        if (variant.stockQuantity === 0) {
          errors.push(`${variant.sku} is out of stock`);
        } else {
          warnings.push(
            `${variant.sku}: Only ${variant.stockQuantity} available (you have ${item.quantity} in cart)`
          );
        }
      }

      // Get current price
      const priceSet = await ctx.db
        .query("priceSets")
        .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
        .first();

      let currentPrice = 0;

      if (priceSet) {
        const moneyAmount = await ctx.db
          .query("moneyAmounts")
          .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
          .first();

        if (moneyAmount) {
          currentPrice =
            moneyAmount.saleAmount &&
            moneyAmount.saleAmount < moneyAmount.amount
              ? moneyAmount.saleAmount
              : moneyAmount.amount;
        }
      }

      validatedItems.push({
        variantId: variant._id,
        quantity: item.quantity,
        price: currentPrice,
        available: variant.isAvailable,
        stockQuantity: variant.stockQuantity,
        hasStockIssue,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      items: validatedItems,
      total: validatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    };
  },
});
