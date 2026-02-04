/**
 * Orders Module - Customer Order Management
 *
 * This module handles all order operations for mobile app customers:
 * - Order creation from cart (checkout)
 * - Order tracking and history
 * - Order status updates
 * - Delivery quotes
 * - Order cancellation
 *
 * Orders are created by customers using mobile apps.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { rateLimiter } from "./components";
import { calculateFare, estimateDeliveryTime } from "./lib/fare";

// =============================================================================
// TYPES
// =============================================================================

const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("preparing"),
  v.literal("ready_for_pickup"),
  v.literal("out_for_delivery"),
  v.literal("delivered"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("canceled"),
  v.literal("refunded")
);

const fulfillmentTypeValidator = v.union(
  v.literal("delivery"),
  v.literal("pickup"),
  v.literal("self_delivery")
);

// =============================================================================
// COUNTER HELPER
// =============================================================================

/**
 * Get next order display ID (auto-increment)
 */
export const getNextDisplayId = internalMutation({
  args: {},
  handler: async (ctx) => {
    const counter = await ctx.db
      .query("counters")
      .filter((q) => q.eq(q.field("name"), "order_display_id"))
      .first();

    if (counter) {
      const nextValue = counter.value + 1;
      await ctx.db.patch(counter._id, { value: nextValue });
      return nextValue;
    }
    // Initialize counter starting at 1000
    await ctx.db.insert("counters", {
      name: "order_display_id",
      value: 1001,
    });
    return 1000;
  },
});

// =============================================================================
// DELIVERY QUOTE
// =============================================================================

/**
 * Get delivery quote for an order.
 * Called before checkout to show delivery fee to customer.
 */
export const getDeliveryQuote = query({
  args: {
    organizationId: v.id("organizations"),
    deliveryAddressId: v.id("customerAddresses"),
    orderSubtotal: v.number(),
    isExpress: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get store location
    const org = await ctx.db.get(args.organizationId);
    if (!(org && org.lat && org.lng)) {
      return {
        available: false,
        reason: "Store location not available",
      };
    }

    // Get delivery address
    const address = await ctx.db.get(args.deliveryAddressId);
    if (!(address && address.lat && address.lng)) {
      return {
        available: false,
        reason: "Delivery address coordinates not available",
      };
    }

    // Calculate distance
    const distanceKm = calculateDistance(
      org.lat,
      org.lng,
      address.lat,
      address.lng
    );

    // Check if within delivery zone (default 15km)
    const maxDeliveryDistance = 15;
    if (distanceKm > maxDeliveryDistance) {
      return {
        available: false,
        reason: `Delivery address is too far (${distanceKm.toFixed(1)}km). Maximum delivery distance is ${maxDeliveryDistance}km.`,
        distanceKm: Math.round(distanceKm * 100) / 100,
      };
    }

    // Calculate fare
    const fareBreakdown = calculateFare({
      distanceKm,
      orderSubtotal: args.orderSubtotal,
      hourOfDay: new Date().getHours(),
      isExpress: args.isExpress ?? false,
    });

    // Estimate delivery time
    const deliveryTime = estimateDeliveryTime(
      distanceKm,
      args.isExpress ?? false
    );

    return {
      available: true,
      distanceKm: Math.round(distanceKm * 100) / 100,
      fare: fareBreakdown,
      estimatedDeliveryTime: deliveryTime,
      storeName: org.name,
      storeAddress: [org.street, org.town, org.cityOrDistrict]
        .filter(Boolean)
        .join(", "),
      deliveryAddress: [address.street, address.town, address.city]
        .filter(Boolean)
        .join(", "),
    };
  },
});

// =============================================================================
// ORDER CREATION (CHECKOUT)
// =============================================================================

/**
 * Create an order from a cart (checkout).
 * This is the main order creation flow for mobile app customers.
 */
export const createFromCart = mutation({
  args: {
    cartId: v.id("carts"),
    customerClerkId: v.string(),
    deliveryAddressId: v.optional(v.id("customerAddresses")),
    fulfillmentType: fulfillmentTypeValidator,
    notes: v.optional(v.string()),
    isExpress: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Rate limit order creation
    const { ok } = await rateLimiter.limit(ctx, "createOrder", {
      key: args.customerClerkId,
    });

    if (!ok) {
      throw new Error(
        "Too many order requests. Please wait a moment before trying again."
      );
    }

    // Get the cart
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    // Verify cart belongs to this customer
    if (cart.clerkId !== args.customerClerkId) {
      throw new Error("Cart does not belong to this customer");
    }

    // Check cart expiration
    if (cart.expiresAt < Date.now()) {
      throw new Error("Cart has expired. Please add items again.");
    }

    // Get cart items
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Get organization
    const org = await ctx.db.get(cart.organizationId);
    if (!org) {
      throw new Error("Store not found");
    }

    if (org.isBusy) {
      throw new Error("Store is currently not accepting orders");
    }

    // Validate delivery address for delivery orders
    let deliveryAddress = null;
    let deliveryTotal = 0;

    if (args.fulfillmentType === "delivery") {
      if (!args.deliveryAddressId) {
        throw new Error("Delivery address is required for delivery orders");
      }

      deliveryAddress = await ctx.db.get(args.deliveryAddressId);
      if (!deliveryAddress) {
        throw new Error("Delivery address not found");
      }

      // Verify address belongs to customer
      if (deliveryAddress.clerkId !== args.customerClerkId) {
        throw new Error("Delivery address does not belong to this customer");
      }

      // Calculate delivery fee
      if (org.lat && org.lng && deliveryAddress.lat && deliveryAddress.lng) {
        const distanceKm = calculateDistance(
          org.lat,
          org.lng,
          deliveryAddress.lat,
          deliveryAddress.lng
        );

        // Check delivery zone
        const maxDeliveryDistance = 15;
        if (distanceKm > maxDeliveryDistance) {
          throw new Error(
            `Delivery address is outside delivery zone (${distanceKm.toFixed(1)}km)`
          );
        }

        const fareBreakdown = calculateFare({
          distanceKm,
          orderSubtotal: 0, // Will recalculate after items
          hourOfDay: new Date().getHours(),
          isExpress: args.isExpress ?? false,
        });

        deliveryTotal = fareBreakdown.total;
      }
    }

    // Validate items and calculate totals
    let subtotal = 0;
    const orderItemsToInsert: Array<{
      productId: any;
      variantId: any;
      title: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      taxTotal: number;
    }> = [];

    for (const cartItem of cartItems) {
      const variant = await ctx.db.get(cartItem.variantId);
      if (!variant) {
        throw new Error("Product variant no longer exists");
      }

      if (!variant.isAvailable) {
        throw new Error("Product is no longer available");
      }

      // Verify variant belongs to same organization
      if (variant.organizationId !== cart.organizationId) {
        throw new Error("Invalid product in cart");
      }

      // Get product for title
      const product = await ctx.db.get(variant.productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Get current price
      const priceSet = await ctx.db
        .query("priceSets")
        .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
        .first();

      let unitPrice = 0;

      if (priceSet) {
        // Get price tiers, find applicable one based on quantity
        const moneyAmounts = await ctx.db
          .query("moneyAmounts")
          .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
          .collect();

        // Sort by minQuantity to find applicable tier
        const sortedPrices = moneyAmounts.sort(
          (a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0)
        );

        for (const ma of sortedPrices) {
          const minQty = ma.minQuantity ?? 1;
          const maxQty = ma.maxQuantity ?? Number.MAX_SAFE_INTEGER;

          if (cartItem.quantity >= minQty && cartItem.quantity <= maxQty) {
            unitPrice =
              ma.saleAmount && ma.saleAmount < ma.amount
                ? ma.saleAmount
                : ma.amount;
            break;
          }
        }

        // Fallback to first price if no tier matches
        if (unitPrice === 0 && sortedPrices.length > 0) {
          const firstPrice = sortedPrices[0];
          unitPrice =
            firstPrice.saleAmount && firstPrice.saleAmount < firstPrice.amount
              ? firstPrice.saleAmount
              : firstPrice.amount;
        }
      }

      if (unitPrice === 0) {
        throw new Error(`No price found for product: ${product.name}`);
      }

      const itemSubtotal = unitPrice * cartItem.quantity;
      const itemTax = 0; // Tax calculation would go here

      subtotal += itemSubtotal;

      orderItemsToInsert.push({
        productId: variant.productId,
        variantId: variant._id,
        title: `${product.name} - ${variant.unit}`,
        quantity: cartItem.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        taxTotal: itemTax,
      });
    }

    // Recalculate delivery with actual subtotal (for free delivery threshold)
    if (
      args.fulfillmentType === "delivery" &&
      org.lat &&
      org.lng &&
      deliveryAddress?.lat &&
      deliveryAddress?.lng
    ) {
      const distanceKm = calculateDistance(
        org.lat,
        org.lng,
        deliveryAddress.lat,
        deliveryAddress.lng
      );

      const fareBreakdown = calculateFare({
        distanceKm,
        orderSubtotal: subtotal,
        hourOfDay: new Date().getHours(),
        isExpress: args.isExpress ?? false,
      });

      deliveryTotal = fareBreakdown.total;
    }

    const taxTotal = 0; // Platform-wide tax calculation
    const discountTotal = 0; // Promotion/discount calculation
    const total = subtotal + taxTotal - discountTotal + deliveryTotal;

    // Get next display ID
    const displayId = await getNextDisplayIdInternal(ctx);

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      displayId,
      status: "pending",
      fulfillmentStatus: "not_fulfilled",
      paymentStatus: "awaiting",
      fulfillmentType: args.fulfillmentType,
      customerClerkId: args.customerClerkId,
      organizationId: cart.organizationId,
      deliveryAddressId: args.deliveryAddressId,
      currencyCode: cart.currencyCode ?? "UGX",
      total,
      taxTotal,
      discountTotal,
      deliveryTotal,
    });

    // Insert order items
    for (const item of orderItemsToInsert) {
      await ctx.db.insert("orderItems", {
        orderId,
        ...item,
      });
    }

    // Log order creation event
    await ctx.db.insert("orderEvents", {
      orderId,
      clerkId: args.customerClerkId,
      eventType: "created",
      toOrderStatus: "pending",
      snapshotTotal: total,
      snapshotTaxTotal: taxTotal,
      snapshotDiscountTotal: discountTotal,
      snapshotDeliveryTotal: deliveryTotal,
    });

    // Clear the cart
    for (const item of cartItems) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.cartId);

    // Track customer relationship with organization
    const existingRelation = await ctx.db
      .query("organizationCustomers")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), cart.organizationId),
          q.eq(q.field("clerkId"), args.customerClerkId)
        )
      )
      .first();

    if (!existingRelation) {
      await ctx.db.insert("organizationCustomers", {
        organizationId: cart.organizationId,
        clerkId: args.customerClerkId,
      });
    }

    return {
      orderId,
      displayId,
      total,
      itemCount: orderItemsToInsert.length,
    };
  },
});

/**
 * Internal helper to get next display ID within a mutation.
 */
async function getNextDisplayIdInternal(ctx: any): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .filter((q: any) => q.eq(q.field("name"), "order_display_id"))
    .first();

  if (counter) {
    const nextValue = counter.value + 1;
    await ctx.db.patch(counter._id, { value: nextValue });
    return nextValue;
  }
  await ctx.db.insert("counters", {
    name: "order_display_id",
    value: 1001,
  });
  return 1000;
}

// =============================================================================
// ORDER QUERIES - CUSTOMER
// =============================================================================

/**
 * Get order by ID with full details.
 */
export const get = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    // Get order items
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.id))
      .collect();

    // Enrich items with product images
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const variant = await ctx.db.get(item.variantId);
        const product = await ctx.db.get(item.productId);

        let imageUrl = null;
        if (product) {
          const primaryImage = await ctx.db
            .query("productImages")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .filter((q) => q.eq(q.field("isPrimary"), true))
            .first();

          if (primaryImage?.r2Key) {
            // Return R2 key - actual URL resolved on client
            imageUrl = primaryImage.r2Key;
          }
        }

        return {
          ...item,
          sku: variant?.sku,
          unit: variant?.unit,
          imageR2Key: imageUrl,
          productSlug: product?.slug,
        };
      })
    );

    // Get organization
    const org = await ctx.db.get(order.organizationId);

    // Get delivery address if applicable
    let deliveryAddress = null;
    if (order.deliveryAddressId) {
      deliveryAddress = await ctx.db.get(order.deliveryAddressId);
    }

    // Get order events for timeline
    const events = await ctx.db
      .query("orderEvents")
      .withIndex("by_order", (q) => q.eq("orderId", args.id))
      .collect();

    return {
      ...order,
      items: enrichedItems,
      organization: org
        ? {
            _id: org._id,
            name: org.name,
            slug: org.slug,
            logo: org.logo,
            phone: org.phone,
            address: [org.street, org.town, org.cityOrDistrict]
              .filter(Boolean)
              .join(", "),
          }
        : null,
      deliveryAddress: deliveryAddress
        ? {
            _id: deliveryAddress._id,
            name: deliveryAddress.name,
            phone: deliveryAddress.phone,
            address: [
              deliveryAddress.street,
              deliveryAddress.town,
              deliveryAddress.city,
            ]
              .filter(Boolean)
              .join(", "),
            directions: deliveryAddress.directions,
          }
        : null,
      timeline: events
        .map((e) => ({
          eventType: e.eventType,
          status: e.toOrderStatus,
          reason: e.reason,
          timestamp: e._creationTime,
        }))
        .sort((a, b) => a.timestamp - b.timestamp),
    };
  },
});

/**
 * Get order by display ID.
 */
export const getByDisplayId = query({
  args: { displayId: v.number() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_displayId", (q) => q.eq("displayId", args.displayId))
      .first();

    if (!order) return null;

    // Use the main get query logic by fetching full details
    // For simplicity, return basic info here
    const org = await ctx.db.get(order.organizationId);

    return {
      ...order,
      organizationName: org?.name,
      organizationLogo: org?.logo,
    };
  },
});

/**
 * List orders for a customer (order history).
 * Supports pagination for mobile app infinite scroll.
 */
export const listByCustomer = query({
  args: {
    clerkId: v.string(),
    status: v.optional(orderStatusValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let ordersQuery = ctx.db
      .query("orders")
      .withIndex("by_customerClerkId", (q) =>
        q.eq("customerClerkId", args.clerkId)
      )
      .order("desc");

    // Apply status filter if provided
    if (args.status) {
      ordersQuery = ordersQuery.filter((q) =>
        q.eq(q.field("status"), args.status)
      );
    }

    const orders = await ordersQuery.take(limit + 1);

    // Check if there are more results
    const hasMore = orders.length > limit;
    const ordersPage = hasMore ? orders.slice(0, limit) : orders;

    // Enrich with organization info and item count
    const enrichedOrders = await Promise.all(
      ordersPage.map(async (order) => {
        const org = await ctx.db.get(order.organizationId);

        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        // Get first item's image for thumbnail
        let thumbnailR2Key = null;
        if (items.length > 0) {
          const product = await ctx.db.get(items[0].productId);
          if (product) {
            const primaryImage = await ctx.db
              .query("productImages")
              .withIndex("by_product", (q) => q.eq("productId", product._id))
              .filter((q) => q.eq(q.field("isPrimary"), true))
              .first();
            thumbnailR2Key = primaryImage?.r2Key;
          }
        }

        return {
          _id: order._id,
          displayId: order.displayId,
          status: order.status,
          fulfillmentType: order.fulfillmentType,
          total: order.total,
          currencyCode: order.currencyCode,
          itemCount: items.length,
          createdAt: order._creationTime,
          organization: org
            ? {
                _id: org._id,
                name: org.name,
                logo: org.logo,
              }
            : null,
          thumbnailR2Key,
          riderName: order.riderName,
        };
      })
    );

    return {
      orders: enrichedOrders,
      hasMore,
      nextCursor: hasMore ? ordersPage[ordersPage.length - 1]._id : null,
    };
  },
});

/**
 * Get active orders for a customer (orders that are in progress).
 * Perfect for "Current Orders" section in mobile app.
 */
export const getActiveOrders = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const activeStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "out_for_delivery",
    ];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerClerkId", (q) =>
        q.eq("customerClerkId", args.clerkId)
      )
      .order("desc")
      .collect();

    const activeOrders = orders.filter((o) =>
      activeStatuses.includes(o.status)
    );

    // Enrich with organization info
    const enrichedOrders = await Promise.all(
      activeOrders.map(async (order) => {
        const org = await ctx.db.get(order.organizationId);

        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        return {
          _id: order._id,
          displayId: order.displayId,
          status: order.status,
          fulfillmentType: order.fulfillmentType,
          total: order.total,
          currencyCode: order.currencyCode,
          itemCount: items.length,
          createdAt: order._creationTime,
          organization: org
            ? {
                _id: org._id,
                name: org.name,
                logo: org.logo,
                phone: org.phone,
              }
            : null,
          riderName: order.riderName,
          riderPhone: order.riderPhone,
        };
      })
    );

    return enrichedOrders;
  },
});

/**
 * Get order tracking info for real-time updates.
 */
export const getTrackingInfo = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const org = await ctx.db.get(order.organizationId);

    // Get delivery address
    let deliveryAddress = null;
    if (order.deliveryAddressId) {
      const addr = await ctx.db.get(order.deliveryAddressId);
      if (addr) {
        deliveryAddress = {
          lat: addr.lat,
          lng: addr.lng,
          address: [addr.street, addr.town, addr.city]
            .filter(Boolean)
            .join(", "),
        };
      }
    }

    // Get order events for progress
    const events = await ctx.db
      .query("orderEvents")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    const statusTimestamps: Record<string, number> = {};
    for (const event of events) {
      if (event.toOrderStatus) {
        statusTimestamps[event.toOrderStatus] = event._creationTime;
      }
    }

    return {
      orderId: order._id,
      displayId: order.displayId,
      status: order.status,
      fulfillmentType: order.fulfillmentType,
      store: org
        ? {
            name: org.name,
            lat: org.lat,
            lng: org.lng,
            phone: org.phone,
          }
        : null,
      delivery: deliveryAddress,
      rider: order.riderId
        ? {
            id: order.riderId,
            name: order.riderName,
            phone: order.riderPhone,
          }
        : null,
      statusTimestamps,
      createdAt: order._creationTime,
    };
  },
});

// =============================================================================
// ORDER QUERIES - VENDOR
// =============================================================================

/**
 * List orders for a vendor/organization.
 */
export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(orderStatusValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let ordersQuery = ctx.db
      .query("orders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc");

    if (args.status) {
      ordersQuery = ordersQuery.filter((q) =>
        q.eq(q.field("status"), args.status)
      );
    }

    const orders = await ordersQuery.take(limit + 1);

    const hasMore = orders.length > limit;
    const ordersPage = hasMore ? orders.slice(0, limit) : orders;

    // Enrich with items
    const enrichedOrders = await Promise.all(
      ordersPage.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        let deliveryAddress = null;
        if (order.deliveryAddressId) {
          const addr = await ctx.db.get(order.deliveryAddressId);
          if (addr) {
            deliveryAddress = {
              name: addr.name,
              phone: addr.phone,
              address: [addr.street, addr.town, addr.city]
                .filter(Boolean)
                .join(", "),
            };
          }
        }

        return {
          ...order,
          items: items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
          itemCount: items.length,
          deliveryAddress,
        };
      })
    );

    return {
      orders: enrichedOrders,
      hasMore,
      nextCursor: hasMore ? ordersPage[ordersPage.length - 1]._id : null,
    };
  },
});

/**
 * Get new/pending orders count for vendor dashboard.
 */
export const getPendingOrdersCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const pendingOrders = await ctx.db
      .query("orders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return pendingOrders.length;
  },
});

/**
 * Get today's orders summary for vendor.
 */
export const getTodaysSummary = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.gte(q.field("_creationTime"), startOfDay.getTime()))
      .collect();

    const pending = orders.filter((o) => o.status === "pending").length;
    const preparing = orders.filter((o) => o.status === "preparing").length;
    const completed = orders.filter(
      (o) => o.status === "delivered" || o.status === "completed"
    ).length;
    const cancelled = orders.filter(
      (o) => o.status === "cancelled" || o.status === "canceled"
    ).length;

    const revenue = orders
      .filter((o) => o.status === "delivered" || o.status === "completed")
      .reduce((sum, o) => sum + o.total, 0);

    return {
      totalOrders: orders.length,
      pending,
      preparing,
      completed,
      cancelled,
      revenue,
    };
  },
});

// =============================================================================
// ORDER MUTATIONS - STATUS UPDATES
// =============================================================================

/**
 * Update order status (vendor action).
 */
export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
    actorClerkId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const previousStatus = order.status;

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled", "canceled"],
      confirmed: ["preparing", "cancelled", "canceled"],
      preparing: ["ready_for_pickup", "cancelled", "canceled"],
      ready_for_pickup: [
        "out_for_delivery",
        "delivered",
        "cancelled",
        "canceled",
      ],
      out_for_delivery: ["delivered", "cancelled", "canceled"],
      delivered: ["completed", "refunded"],
      completed: ["refunded"],
    };

    const allowed = validTransitions[previousStatus] ?? [];
    if (!allowed.includes(args.status)) {
      throw new Error(
        `Cannot transition from ${previousStatus} to ${args.status}`
      );
    }

    // Update order status
    await ctx.db.patch(args.orderId, { status: args.status });

    // Update fulfillment status if applicable
    if (args.status === "delivered" || args.status === "completed") {
      await ctx.db.patch(args.orderId, { fulfillmentStatus: "fulfilled" });
    }

    // Log the event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "status_change",
      fromOrderStatus: previousStatus,
      toOrderStatus: args.status,
      reason: args.reason,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    // Schedule push notification to customer
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendOrderStatusNotification,
      {
        customerClerkId: order.customerClerkId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        status: args.status,
      }
    );

    return { success: true, previousStatus, newStatus: args.status };
  },
});

/**
 * Confirm order (vendor accepts the order).
 */
export const confirm = mutation({
  args: {
    orderId: v.id("orders"),
    actorClerkId: v.string(),
    estimatedPrepTime: v.optional(v.number()), // minutes
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "pending") {
      throw new Error(`Cannot confirm order with status: ${order.status}`);
    }

    await ctx.db.patch(args.orderId, { status: "confirmed" });

    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "status_change",
      fromOrderStatus: "pending",
      toOrderStatus: "confirmed",
      reason: args.estimatedPrepTime
        ? `Estimated preparation time: ${args.estimatedPrepTime} minutes`
        : undefined,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    // Notify customer
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendOrderStatusNotification,
      {
        customerClerkId: order.customerClerkId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        status: "confirmed",
        message: args.estimatedPrepTime
          ? `Your order has been confirmed! Estimated preparation time: ${args.estimatedPrepTime} minutes.`
          : undefined,
      }
    );

    return { success: true };
  },
});

/**
 * Mark order as preparing.
 */
export const startPreparing = mutation({
  args: {
    orderId: v.id("orders"),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "confirmed") {
      throw new Error(
        `Cannot start preparing order with status: ${order.status}`
      );
    }

    await ctx.db.patch(args.orderId, { status: "preparing" });

    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "status_change",
      fromOrderStatus: "confirmed",
      toOrderStatus: "preparing",
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendOrderStatusNotification,
      {
        customerClerkId: order.customerClerkId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        status: "preparing",
      }
    );

    return { success: true };
  },
});

/**
 * Mark order as ready for pickup/delivery.
 */
export const markReady = mutation({
  args: {
    orderId: v.id("orders"),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "preparing") {
      throw new Error(
        `Cannot mark as ready order with status: ${order.status}`
      );
    }

    await ctx.db.patch(args.orderId, { status: "ready_for_pickup" });

    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "status_change",
      fromOrderStatus: "preparing",
      toOrderStatus: "ready_for_pickup",
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendOrderStatusNotification,
      {
        customerClerkId: order.customerClerkId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        status: "ready_for_pickup",
      }
    );

    return { success: true };
  },
});

/**
 * Assign rider and mark as out for delivery.
 */
export const assignRiderAndDispatch = mutation({
  args: {
    orderId: v.id("orders"),
    actorClerkId: v.string(),
    riderId: v.string(),
    riderName: v.string(),
    riderPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "ready_for_pickup") {
      throw new Error(`Cannot dispatch order with status: ${order.status}`);
    }

    await ctx.db.patch(args.orderId, {
      status: "out_for_delivery",
      riderId: args.riderId,
      riderName: args.riderName,
      riderPhone: args.riderPhone,
    });

    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "status_change",
      fromOrderStatus: "ready_for_pickup",
      toOrderStatus: "out_for_delivery",
      reason: `Rider assigned: ${args.riderName}`,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    // Notify customer
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendOrderStatusNotification,
      {
        customerClerkId: order.customerClerkId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        status: "out_for_delivery",
        message: `Your order is on the way! ${args.riderName} is delivering your order.`,
      }
    );

    // Notify rider
    const deliveryAddress = order.deliveryAddressId
      ? await ctx.db.get(order.deliveryAddressId)
      : null;
    const org = await ctx.db.get(order.organizationId);

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendDeliveryAssignedNotification,
      {
        riderClerkId: args.riderId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        pickupAddress: org
          ? [org.street, org.town, org.cityOrDistrict]
              .filter(Boolean)
              .join(", ")
          : "Store",
        deliveryAddress: deliveryAddress
          ? [deliveryAddress.street, deliveryAddress.town, deliveryAddress.city]
              .filter(Boolean)
              .join(", ")
          : "Customer",
        estimatedFare: order.deliveryTotal,
        currency: order.currencyCode,
      }
    );

    return { success: true };
  },
});

/**
 * Mark order as delivered.
 */
export const markDelivered = mutation({
  args: {
    orderId: v.id("orders"),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const validStatuses = ["out_for_delivery", "ready_for_pickup"];
    if (!validStatuses.includes(order.status)) {
      throw new Error(
        `Cannot mark as delivered order with status: ${order.status}`
      );
    }

    await ctx.db.patch(args.orderId, {
      status: "delivered",
      fulfillmentStatus: "fulfilled",
      paymentStatus: "captured", // Assuming payment on delivery
    });

    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "status_change",
      fromOrderStatus: order.status,
      toOrderStatus: "delivered",
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendOrderStatusNotification,
      {
        customerClerkId: order.customerClerkId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        status: "delivered",
      }
    );

    return { success: true };
  },
});

// =============================================================================
// ORDER CANCELLATION
// =============================================================================

/**
 * Cancel an order (customer or vendor).
 */
export const cancel = mutation({
  args: {
    orderId: v.id("orders"),
    actorClerkId: v.string(),
    reason: v.string(),
    isCustomer: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Check if order can be cancelled
    const cancellableStatuses = ["pending", "confirmed", "preparing"];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(
        `Cannot cancel order with status: ${order.status}. Order may already be on the way.`
      );
    }

    // If customer is cancelling, verify ownership
    if (args.isCustomer && order.customerClerkId !== args.actorClerkId) {
      throw new Error("You can only cancel your own orders");
    }

    await ctx.db.patch(args.orderId, {
      status: "cancelled",
      fulfillmentStatus: "not_fulfilled",
    });

    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "status_change",
      fromOrderStatus: order.status,
      toOrderStatus: "cancelled",
      reason: args.reason,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    // Notify customer (if vendor cancelled)
    if (!args.isCustomer) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.sendOrderStatusNotification,
        {
          customerClerkId: order.customerClerkId,
          orderId: args.orderId,
          orderDisplayId: String(order.displayId),
          status: "cancelled",
          message: `Your order has been cancelled. Reason: ${args.reason}`,
        }
      );
    }

    return { success: true };
  },
});

// =============================================================================
// REORDER
// =============================================================================

/**
 * Create a new cart from a previous order (reorder functionality).
 */
export const reorder = mutation({
  args: {
    orderId: v.id("orders"),
    customerClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to customer
    if (order.customerClerkId !== args.customerClerkId) {
      throw new Error("Order does not belong to this customer");
    }

    // Get order items
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    if (orderItems.length === 0) {
      throw new Error("Order has no items");
    }

    // Check if a cart already exists for this organization
    const existingCarts = await ctx.db
      .query("carts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.customerClerkId))
      .collect();

    const cart = existingCarts.find(
      (c) => c.organizationId === order.organizationId
    );

    let cartId: any;
    if (cart) {
      cartId = cart._id;
      // Clear existing items
      const existingItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", cart!._id))
        .collect();

      for (const item of existingItems) {
        await ctx.db.delete(item._id);
      }

      // Update expiry
      await ctx.db.patch(cartId, {
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    } else {
      // Create new cart
      cartId = await ctx.db.insert("carts", {
        clerkId: args.customerClerkId,
        organizationId: order.organizationId,
        currencyCode: order.currencyCode,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }

    // Add items to cart (if still available)
    let addedCount = 0;
    const unavailableItems: string[] = [];

    for (const orderItem of orderItems) {
      const variant = await ctx.db.get(orderItem.variantId);

      if (!(variant && variant.isAvailable)) {
        unavailableItems.push(orderItem.title);
        continue;
      }

      await ctx.db.insert("cartItems", {
        cartId,
        variantId: orderItem.variantId,
        quantity: orderItem.quantity,
      });
      addedCount++;
    }

    return {
      cartId,
      addedCount,
      unavailableItems,
      message:
        unavailableItems.length > 0
          ? `Some items are no longer available: ${unavailableItems.join(", ")}`
          : "All items added to cart",
    };
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate distance between two points using Haversine formula.
 * @returns Distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_KM = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
