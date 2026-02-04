/**
 * Scheduled Jobs using Crons Component
 *
 * This file defines all scheduled/recurring tasks for the platform:
 * - Cart expiration cleanup
 * - Daily sales reports
 * - Promotion activation/deactivation
 * - Stale order alerts
 */

import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { crons } from "./components";

// =============================================================================
// CART CLEANUP
// =============================================================================

/**
 * Clean up expired carts.
 * Runs every hour to remove carts that have passed their expiration time.
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

    let deletedCarts = 0;
    let deletedItems = 0;

    for (const cart of expiredCarts) {
      // Delete cart items first
      const items = await ctx.db
        .query("cartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
        .collect();

      for (const item of items) {
        await ctx.db.delete(item._id);
        deletedItems++;
      }

      // Delete the cart
      await ctx.db.delete(cart._id);
      deletedCarts++;
    }

    console.log(
      `[Cart Cleanup] Deleted ${deletedCarts} carts and ${deletedItems} items`
    );

    return { deletedCarts, deletedItems };
  },
});

// =============================================================================
// ORDER MANAGEMENT
// =============================================================================

/**
 * Check for stale orders (orders stuck in pending/preparing for too long).
 * Runs every 15 minutes.
 */
export const checkStaleOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const TWO_HOURS = 2 * ONE_HOUR;

    // Find orders that have been pending for more than 30 minutes
    const pendingThreshold = now - 30 * 60 * 1000;
    const pendingOrders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("_creationTime"), pendingThreshold)
        )
      )
      .take(50);

    // Find orders that have been preparing for more than 2 hours
    const preparingThreshold = now - TWO_HOURS;
    const preparingOrders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "preparing"),
          q.lt(q.field("_creationTime"), preparingThreshold)
        )
      )
      .take(50);

    const staleOrderIds = [
      ...pendingOrders.map((o) => ({ id: o._id, status: o.status, displayId: o.displayId })),
      ...preparingOrders.map((o) => ({ id: o._id, status: o.status, displayId: o.displayId })),
    ];

    if (staleOrderIds.length > 0) {
      console.log(`[Stale Orders] Found ${staleOrderIds.length} stale orders`);
      // In production, you might want to:
      // 1. Send alerts to admins
      // 2. Send reminders to vendors
      // 3. Auto-cancel very old pending orders
    }

    return { staleOrders: staleOrderIds.length };
  },
});

/**
 * Auto-cancel orders that have been pending for too long.
 * Runs every hour.
 */
export const autoCancelStaleOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    // Find orders pending for more than 6 hours
    const threshold = now - SIX_HOURS;
    const staleOrders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("_creationTime"), threshold)
        )
      )
      .take(20);

    let cancelled = 0;

    for (const order of staleOrders) {
      await ctx.db.patch(order._id, {
        status: "cancelled",
      });

      // Log the event
      await ctx.db.insert("orderEvents", {
        orderId: order._id,
        clerkId: order.customerClerkId,
        eventType: "status_change",
        fromOrderStatus: "pending",
        toOrderStatus: "cancelled",
        reason: "Auto-cancelled: order pending for more than 6 hours",
        snapshotTotal: order.total,
        snapshotTaxTotal: order.taxTotal,
        snapshotDiscountTotal: order.discountTotal,
        snapshotDeliveryTotal: order.deliveryTotal,
      });

      cancelled++;
    }

    if (cancelled > 0) {
      console.log(`[Auto-Cancel] Cancelled ${cancelled} stale orders`);
    }

    return { cancelled };
  },
});

// =============================================================================
// PROMOTIONS
// =============================================================================

/**
 * Activate promotions that have reached their start date.
 * Runs every 5 minutes.
 */
export const activateScheduledPromotions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find draft promotions that should be active now
    const promotions = await ctx.db
      .query("promotions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "draft"),
          q.lte(q.field("startsAt"), now),
          q.or(
            q.eq(q.field("endsAt"), undefined),
            q.gt(q.field("endsAt"), now)
          )
        )
      )
      .take(50);

    let activated = 0;

    for (const promo of promotions) {
      await ctx.db.patch(promo._id, { status: "active" });
      activated++;
    }

    if (activated > 0) {
      console.log(`[Promotions] Activated ${activated} scheduled promotions`);
    }

    return { activated };
  },
});

/**
 * Deactivate promotions that have reached their end date.
 * Runs every 5 minutes.
 */
export const deactivateExpiredPromotions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find active promotions that have ended
    const promotions = await ctx.db
      .query("promotions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.neq(q.field("endsAt"), undefined),
          q.lt(q.field("endsAt"), now)
        )
      )
      .take(50);

    let deactivated = 0;

    for (const promo of promotions) {
      await ctx.db.patch(promo._id, { status: "inactive" });
      deactivated++;
    }

    if (deactivated > 0) {
      console.log(`[Promotions] Deactivated ${deactivated} expired promotions`);
    }

    return { deactivated };
  },
});

// =============================================================================
// STATISTICS & AGGREGATES
// =============================================================================

/**
 * Calculate and cache daily statistics.
 * Runs at midnight every day.
 */
export const calculateDailyStats = internalMutation({
  args: {
    date: v.optional(v.string()), // YYYY-MM-DD format, defaults to yesterday
  },
  handler: async (ctx, args) => {
    // Calculate date range
    const targetDate = args.date || getYesterday();
    const startOfDay = new Date(targetDate).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Count orders for the day
    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), startOfDay),
          q.lt(q.field("_creationTime"), endOfDay)
        )
      )
      .collect();

    const stats = {
      date: targetDate,
      totalOrders: orders.length,
      completedOrders: orders.filter((o) => o.status === "delivered").length,
      cancelledOrders: orders.filter((o) => o.status === "cancelled").length,
      totalRevenue: orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total ?? 0), 0),
      totalDeliveryFees: orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (o.deliveryTotal ?? 0), 0),
    };

    console.log(`[Daily Stats] ${targetDate}:`, stats);

    return stats;
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

// =============================================================================
// CRON DEFINITIONS
// =============================================================================

/**
 * Register all cron jobs.
 * This should be called once during initialization.
 *
 * Note: In production, you would use the Convex dashboard or
 * convex.json to define cron schedules. This is a reference
 * for the schedules we want:
 *
 * - cleanupExpiredCarts: Every hour at minute 0
 * - checkStaleOrders: Every 15 minutes
 * - autoCancelStaleOrders: Every hour at minute 30
 * - activateScheduledPromotions: Every 5 minutes
 * - deactivateExpiredPromotions: Every 5 minutes
 * - calculateDailyStats: Daily at 00:05 UTC
 */

// Export cron schedules for reference
export const CRON_SCHEDULES = {
  cleanupExpiredCarts: "0 * * * *", // Every hour at :00
  checkStaleOrders: "*/15 * * * *", // Every 15 minutes
  autoCancelStaleOrders: "30 * * * *", // Every hour at :30
  activateScheduledPromotions: "*/5 * * * *", // Every 5 minutes
  deactivateExpiredPromotions: "*/5 * * * *", // Every 5 minutes
  calculateDailyStats: "5 0 * * *", // Daily at 00:05 UTC
};
