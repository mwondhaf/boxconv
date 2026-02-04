/**
 * Push Notifications using Expo Push Notifications Component
 *
 * This file provides push notification functionality for:
 * - Order status updates to customers
 * - New order alerts to vendors
 * - Delivery assignment notifications to riders
 * - Promotional messages
 *
 * Uses clerkId (string) as the user identifier for notifications.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { pushNotifications, rateLimiter } from "./components";

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

/**
 * Register a push token for a user.
 * Called when the mobile app starts or token refreshes.
 */
export const registerPushToken = mutation({
  args: {
    clerkId: v.string(),
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Rate limit token registration
    const { ok } = await rateLimiter.limit(ctx, "apiCall", {
      key: args.clerkId,
    });

    if (!ok) {
      throw new Error("Rate limit exceeded for token registration");
    }

    // Store the push token using the component
    await pushNotifications.recordToken(ctx, {
      userId: args.clerkId as any,
      pushToken: args.pushToken,
    });

    return { success: true };
  },
});

/**
 * Unregister a push token (e.g., on logout).
 */
export const unregisterPushToken = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    await pushNotifications.removeToken(ctx, {
      userId: args.clerkId as any,
    });
    return { success: true };
  },
});

// =============================================================================
// ORDER NOTIFICATIONS
// =============================================================================

/**
 * Send order status update notification to customer.
 */
export const sendOrderStatusNotification = internalMutation({
  args: {
    customerClerkId: v.string(),
    orderId: v.id("orders"),
    orderDisplayId: v.string(),
    status: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const titleMap: Record<string, string> = {
      confirmed: "Order Confirmed! 🎉",
      preparing: "Your order is being prepared 👨‍🍳",
      ready_for_pickup: "Order Ready for Pickup 📦",
      out_for_delivery: "Your order is on the way! 🚀",
      delivered: "Order Delivered! ✅",
      cancelled: "Order Cancelled",
      canceled: "Order Cancelled",
    };

    const bodyMap: Record<string, string> = {
      confirmed: `Order #${args.orderDisplayId} has been confirmed`,
      preparing: `Order #${args.orderDisplayId} is being prepared`,
      ready_for_pickup: `Order #${args.orderDisplayId} is ready for pickup`,
      out_for_delivery: `Order #${args.orderDisplayId} is on its way to you`,
      delivered: `Order #${args.orderDisplayId} has been delivered`,
      cancelled: `Order #${args.orderDisplayId} has been cancelled`,
      canceled: `Order #${args.orderDisplayId} has been cancelled`,
    };

    const title = titleMap[args.status] || "Order Update";
    const body =
      args.message ||
      bodyMap[args.status] ||
      `Order #${args.orderDisplayId} status: ${args.status}`;

    try {
      await pushNotifications.sendPushNotification(ctx, {
        userId: args.customerClerkId as any,
        notification: {
          title,
          body,
          data: {
            type: "order_status",
            orderId: args.orderId,
            orderDisplayId: args.orderDisplayId,
            status: args.status,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send order notification:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send new order notification to vendor.
 */
export const sendNewOrderNotification = internalMutation({
  args: {
    vendorClerkId: v.string(),
    orderId: v.id("orders"),
    orderDisplayId: v.string(),
    orderTotal: v.number(),
    currency: v.string(),
    itemCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Format total for display
    const formattedTotal = new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: args.currency,
      minimumFractionDigits: 0,
    }).format(args.orderTotal);

    const title = "New Order! 🛒";
    const body = `Order #${args.orderDisplayId} - ${args.itemCount} item(s) - ${formattedTotal}`;

    try {
      await pushNotifications.sendPushNotification(ctx, {
        userId: args.vendorClerkId as any,
        notification: {
          title,
          body,
          data: {
            type: "new_order",
            orderId: args.orderId,
            orderDisplayId: args.orderDisplayId,
          },
          sound: "default",
          priority: "high",
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send new order notification:", error);
      return { success: false, error: String(error) };
    }
  },
});

// =============================================================================
// DELIVERY NOTIFICATIONS
// =============================================================================

/**
 * Send delivery assignment notification to rider.
 */
export const sendDeliveryAssignedNotification = internalMutation({
  args: {
    riderClerkId: v.string(),
    orderId: v.id("orders"),
    orderDisplayId: v.string(),
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    estimatedFare: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = "New Delivery Assigned! 📍";
    let body = `Order #${args.orderDisplayId}\nPickup: ${args.pickupAddress}`;

    if (args.estimatedFare && args.currency) {
      const formattedFare = new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: args.currency,
        minimumFractionDigits: 0,
      }).format(args.estimatedFare);
      body += `\nEarnings: ${formattedFare}`;
    }

    try {
      await pushNotifications.sendPushNotification(ctx, {
        userId: args.riderClerkId as any,
        notification: {
          title,
          body,
          data: {
            type: "delivery_assigned",
            orderId: args.orderId,
            orderDisplayId: args.orderDisplayId,
            pickupAddress: args.pickupAddress,
            deliveryAddress: args.deliveryAddress,
          },
          sound: "default",
          priority: "high",
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send delivery assignment notification:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Notify customer that rider is nearby.
 */
export const sendRiderNearbyNotification = internalMutation({
  args: {
    customerClerkId: v.string(),
    orderId: v.id("orders"),
    orderDisplayId: v.string(),
    riderName: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const title = "Rider is nearby! 🏃";
    let body = `Your order #${args.orderDisplayId} is almost there`;

    if (args.riderName) {
      body = `${args.riderName} is nearby with your order #${args.orderDisplayId}`;
    }

    if (args.estimatedMinutes) {
      body += ` - arriving in ~${args.estimatedMinutes} min`;
    }

    try {
      await pushNotifications.sendPushNotification(ctx, {
        userId: args.customerClerkId as any,
        notification: {
          title,
          body,
          data: {
            type: "rider_nearby",
            orderId: args.orderId,
            orderDisplayId: args.orderDisplayId,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send rider nearby notification:", error);
      return { success: false, error: String(error) };
    }
  },
});

// =============================================================================
// PROMOTIONAL NOTIFICATIONS
// =============================================================================

/**
 * Send promotional notification to a user.
 */
export const sendPromoNotification = internalMutation({
  args: {
    clerkId: v.string(),
    title: v.string(),
    body: v.string(),
    promoCode: v.optional(v.string()),
    deepLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await pushNotifications.sendPushNotification(ctx, {
        userId: args.clerkId as any,
        notification: {
          title: args.title,
          body: args.body,
          data: {
            type: "promotion",
            promoCode: args.promoCode,
            deepLink: args.deepLink,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send promo notification:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send bulk promotional notifications (internal only).
 */
export const sendBulkPromoNotifications = internalMutation({
  args: {
    clerkIds: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let sent = 0;
    let failed = 0;

    for (const clerkId of args.clerkIds) {
      try {
        await pushNotifications.sendPushNotification(ctx, {
          userId: clerkId as any,
          notification: {
            title: args.title,
            body: args.body,
            data: {
              type: "promotion",
              promoCode: args.promoCode,
            },
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed, total: args.clerkIds.length };
  },
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Check if a user has a registered push token.
 * Note: The PushNotifications component doesn't have a getToken method.
 * Token registration status would need to be tracked separately if needed.
 */
export const hasPushToken = query({
  args: { clerkId: v.string() },
  handler: async (_ctx, _args) => {
    // The expo push notifications component doesn't expose a way to check
    // if a token exists. The mobile app should track this client-side.
    // Returning true to indicate the feature is available.
    return { hasToken: true, note: "Token status tracked on client" };
  },
});
