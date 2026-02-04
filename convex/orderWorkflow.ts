/**
 * Order Workflow using Workflow Component
 *
 * This file defines durable workflows for order processing.
 * Workflows are resilient to failures and can be retried.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { workflow } from "./components";

// =============================================================================
// WORKFLOW STEP MUTATIONS
// =============================================================================

/**
 * Validate an order before processing.
 */
export const validateOrder = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<{ valid: boolean; reason?: string }> => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { valid: false, reason: "Order not found" };
    }

    // Check if order is in valid state
    if (order.status !== "pending") {
      return { valid: false, reason: `Invalid order status: ${order.status}` };
    }

    // Validate order items exist
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    if (items.length === 0) {
      return { valid: false, reason: "Order has no items" };
    }

    // Validate all variants are still available
    for (const item of items) {
      const variant = await ctx.db.get(item.variantId);
      if (!variant) {
        return { valid: false, reason: `Product variant not found: ${item.title}` };
      }
      if (!variant.isAvailable) {
        return { valid: false, reason: `Product no longer available: ${item.title}` };
      }
    }

    // Validate organization exists
    const org = await ctx.db.get(order.organizationId);
    if (!org) {
      return { valid: false, reason: "Store not found" };
    }

    // Check if store is busy/closed
    if (org.isBusy) {
      return { valid: false, reason: "Store is currently not accepting orders" };
    }

    return { valid: true };
  },
});

/**
 * Confirm an order.
 */
export const confirmOrder = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, { status: "confirmed" });

    // Log the event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: order.customerClerkId,
      eventType: "status_change",
      fromOrderStatus: order.status,
      toOrderStatus: "confirmed",
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    return { success: true };
  },
});

/**
 * Cancel an order.
 */
export const cancelOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, { status: "cancelled" });

    // Log the event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: order.customerClerkId,
      eventType: "status_change",
      fromOrderStatus: order.status,
      toOrderStatus: "cancelled",
      reason: args.reason,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    return { success: true };
  },
});

/**
 * Update order status.
 */
export const updateOrderStatus = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
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
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const previousStatus = order.status;
    await ctx.db.patch(args.orderId, { status: args.status });

    // Log the event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: order.customerClerkId,
      eventType: "status_change",
      fromOrderStatus: previousStatus,
      toOrderStatus: args.status,
      reason: args.reason,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    return { success: true, previousStatus, newStatus: args.status };
  },
});

/**
 * Notify vendor about a new order.
 */
export const notifyVendor = internalMutation({
  args: {
    orderId: v.id("orders"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Get item count
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Get organization
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    // Schedule the push notification
    // Note: In production, you'd need to look up vendor user clerkIds
    // and send notifications to each of them
    console.log(
      `[New Order] Order #${order.displayId ?? args.orderId} for ${org.name} - ${items.length} items - ${order.total} ${order.currencyCode}`
    );

    return { success: true };
  },
});

/**
 * Notify customer about order status.
 */
export const notifyCustomer = internalMutation({
  args: {
    orderId: v.id("orders"),
    customerClerkId: v.string(),
    status: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Log the notification (actual push would use the notifications module)
    console.log(
      `[Order Update] Customer ${args.customerClerkId}: Order #${order.displayId ?? args.orderId} - ${args.status}`
    );

    return { success: true };
  },
});

/**
 * Calculate delivery fare for an order.
 */
export const calculateDeliveryFare = internalMutation({
  args: {
    orderId: v.id("orders"),
    pickupLat: v.number(),
    pickupLng: v.number(),
    deliveryLat: v.number(),
    deliveryLng: v.number(),
  },
  handler: async (ctx, args) => {
    // Calculate distance using Haversine formula
    const EARTH_RADIUS_KM = 6371;

    const dLat = toRadians(args.deliveryLat - args.pickupLat);
    const dLng = toRadians(args.deliveryLng - args.pickupLng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(args.pickupLat)) *
        Math.cos(toRadians(args.deliveryLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = EARTH_RADIUS_KM * c;

    // Calculate fare based on distance
    const baseFare = 2000; // UGX 2,000 base
    const perKmRate = 500; // UGX 500 per km
    const minimumFare = 3000; // UGX 3,000 minimum

    let fare = baseFare + Math.round(distanceKm * perKmRate);
    fare = Math.max(fare, minimumFare);

    // Update order with delivery total
    await ctx.db.patch(args.orderId, {
      deliveryTotal: fare,
    });

    return { fare, distanceKm: Math.round(distanceKm * 100) / 100 };
  },
});

/**
 * Find nearby riders for delivery assignment.
 */
export const findNearbyRiders = internalMutation({
  args: {
    lat: v.number(),
    lng: v.number(),
    maxDistanceKm: v.number(),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would query rider locations
    // from a geospatial index. For now, return an empty array.
    // The rider tracking system would need to be implemented.

    // TODO: Implement rider location tracking and geospatial queries

    return {
      riders: [] as Array<{ id: string; name: string; distanceKm: number }>,
    };
  },
});

/**
 * Assign a rider to an order.
 */
export const assignRider = internalMutation({
  args: {
    orderId: v.id("orders"),
    riderId: v.string(),
    riderName: v.string(),
    riderPhone: v.optional(v.string()),
    estimatedFare: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      riderId: args.riderId,
      riderName: args.riderName,
      riderPhone: args.riderPhone,
    });

    // Log the event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: order.customerClerkId,
      eventType: "rider_assigned",
      reason: `Rider ${args.riderName} assigned`,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    return { success: true };
  },
});

// =============================================================================
// WORKFLOW MANAGEMENT MUTATIONS
// =============================================================================

/**
 * Start order processing (simplified without workflow component for now).
 * This can be expanded to use the workflow component for more complex flows.
 */
export const processOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    // Validate the order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "pending") {
      throw new Error(`Cannot process order with status: ${order.status}`);
    }

    // Validate order items
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    if (items.length === 0) {
      throw new Error("Order has no items");
    }

    // Validate organization
    const org = await ctx.db.get(order.organizationId);
    if (!org) {
      throw new Error("Store not found");
    }

    if (org.isBusy) {
      throw new Error("Store is currently not accepting orders");
    }

    // Confirm the order
    await ctx.db.patch(args.orderId, { status: "confirmed" });

    // Log the event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: order.customerClerkId,
      eventType: "status_change",
      fromOrderStatus: order.status,
      toOrderStatus: "confirmed",
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    return { success: true, orderId: args.orderId };
  },
});

/**
 * Get order processing status.
 */
export const getOrderStatus = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    // Get order events
    const events = await ctx.db
      .query("orderEvents")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      orderId: order._id,
      displayId: order.displayId,
      status: order.status,
      riderId: order.riderId,
      riderName: order.riderName,
      events: events.map((e) => ({
        eventType: e.eventType,
        fromStatus: e.fromOrderStatus,
        toStatus: e.toOrderStatus,
        reason: e.reason,
        timestamp: e._creationTime,
      })),
    };
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
