/**
 * Riders Module - Internal Rider Management
 *
 * This module handles all rider operations for the internal delivery network:
 * - Rider registration and profile management
 * - Rider availability and status
 * - Delivery assignment (manual by vendor or auto-assignment)
 * - Rider actions (accept, pickup, deliver)
 * - Rider location tracking
 * - Earnings tracking
 *
 * Riders are users with platformRole: 'rider' in Clerk publicMetadata.
 * Their profile and location data is stored in Convex.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// =============================================================================
// TYPES
// =============================================================================

const riderStatusValidator = v.union(
  v.literal("offline"),
  v.literal("online"),
  v.literal("busy") // Currently on a delivery
);

// Delivery status values for reference:
// "pending" - Waiting for rider assignment
// "assigned" - Rider assigned, waiting for acceptance
// "accepted" - Rider accepted
// "picking_up" - Rider heading to store
// "picked_up" - Rider picked up from store
// "delivering" - Rider heading to customer
// "delivered" - Delivery complete
// "cancelled" - Delivery cancelled

// =============================================================================
// RIDER PROFILE MANAGEMENT
// =============================================================================

/**
 * Get rider profile by clerk ID.
 */
export const getProfile = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Get rider location record
    const riderLocation = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    // Check if rider has any active deliveries
    const activeDelivery = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("riderId"), args.clerkId),
          q.or(
            q.eq(q.field("status"), "out_for_delivery"),
            q.eq(q.field("status"), "ready_for_pickup")
          )
        )
      )
      .first();

    // Count completed deliveries today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaysDeliveries = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("riderId"), args.clerkId),
          q.eq(q.field("status"), "delivered"),
          q.gte(q.field("_creationTime"), startOfDay.getTime())
        )
      )
      .collect();

    const todaysEarnings = todaysDeliveries.reduce(
      (sum, order) => sum + (order.deliveryTotal ?? 0),
      0
    );

    return {
      clerkId: args.clerkId,
      status: riderLocation?.status ?? "offline",
      location: riderLocation
        ? { lat: riderLocation.lat, lng: riderLocation.lng }
        : null,
      hasActiveDelivery: !!activeDelivery,
      activeDeliveryOrderId: activeDelivery?._id,
      todaysDeliveries: todaysDeliveries.length,
      todaysEarnings,
    };
  },
});

/**
 * Set rider online/offline status.
 */
export const setStatus = mutation({
  args: {
    riderClerkId: v.string(),
    status: riderStatusValidator,
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.riderClerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastUpdatedAt: Date.now(),
        ...(args.lat !== undefined && { lat: args.lat }),
        ...(args.lng !== undefined && { lng: args.lng }),
      });
    } else {
      // Create new rider location record
      await ctx.db.insert("riderLocations", {
        clerkId: args.riderClerkId,
        lat: args.lat ?? 0,
        lng: args.lng ?? 0,
        status: args.status,
        lastUpdatedAt: Date.now(),
      });
    }

    return { success: true, status: args.status };
  },
});

/**
 * Go online (convenience mutation).
 */
export const goOnline = mutation({
  args: {
    riderClerkId: v.string(),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.riderClerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "online",
        lat: args.lat,
        lng: args.lng,
        lastUpdatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("riderLocations", {
        clerkId: args.riderClerkId,
        lat: args.lat,
        lng: args.lng,
        status: "online",
        lastUpdatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Go offline (convenience mutation).
 */
export const goOffline = mutation({
  args: { riderClerkId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.riderClerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "offline",
        lastUpdatedAt: Date.now(),
        activeOrderId: undefined,
      });
    }

    return { success: true };
  },
});

// =============================================================================
// AVAILABLE DELIVERIES (For Riders)
// =============================================================================

/**
 * List orders available for pickup (ready and no rider assigned).
 * Riders can see these and accept them.
 */
export const listAvailableDeliveries = query({
  args: {
    riderLat: v.optional(v.number()),
    riderLng: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get orders that are ready for pickup and have no rider
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "ready_for_pickup"))
      .filter((q) =>
        q.and(
          q.eq(q.field("fulfillmentType"), "delivery"),
          q.eq(q.field("riderId"), undefined)
        )
      )
      .take(limit * 2); // Get more to filter/sort

    // Enrich with store and delivery info
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const org = await ctx.db.get(order.organizationId);

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
              lat: addr.lat,
              lng: addr.lng,
            };
          }
        }

        // Calculate distance from rider if location provided
        let distanceFromRider: number | undefined;
        if (args.riderLat && args.riderLng && org?.lat && org?.lng) {
          distanceFromRider = calculateDistance(
            args.riderLat,
            args.riderLng,
            org.lat,
            org.lng
          );
        }

        // Calculate delivery distance
        let deliveryDistance: number | undefined;
        if (
          org?.lat &&
          org?.lng &&
          deliveryAddress?.lat &&
          deliveryAddress?.lng
        ) {
          deliveryDistance = calculateDistance(
            org.lat,
            org.lng,
            deliveryAddress.lat,
            deliveryAddress.lng
          );
        }

        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        return {
          _id: order._id,
          displayId: order.displayId,
          total: order.total,
          deliveryTotal: order.deliveryTotal,
          currencyCode: order.currencyCode,
          itemCount: items.length,
          createdAt: order._creationTime,
          store: org
            ? {
                _id: org._id,
                name: org.name,
                phone: org.phone,
                address: [org.street, org.town, org.cityOrDistrict]
                  .filter(Boolean)
                  .join(", "),
                lat: org.lat,
                lng: org.lng,
              }
            : null,
          deliveryAddress,
          distanceFromRider: distanceFromRider
            ? Math.round(distanceFromRider * 100) / 100
            : undefined,
          deliveryDistance: deliveryDistance
            ? Math.round(deliveryDistance * 100) / 100
            : undefined,
        };
      })
    );

    // Sort by distance from rider if available, otherwise by creation time
    const sorted = enrichedOrders.sort((a, b) => {
      if (
        a.distanceFromRider !== undefined &&
        b.distanceFromRider !== undefined
      ) {
        return a.distanceFromRider - b.distanceFromRider;
      }
      return a.createdAt - b.createdAt;
    });

    return sorted.slice(0, limit);
  },
});

/**
 * Get details of a specific delivery for a rider.
 */
export const getDeliveryDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const org = await ctx.db.get(order.organizationId);

    let deliveryAddress = null;
    if (order.deliveryAddressId) {
      const addr = await ctx.db.get(order.deliveryAddressId);
      if (addr) {
        deliveryAddress = {
          _id: addr._id,
          name: addr.name,
          phone: addr.phone,
          address: [addr.street, addr.town, addr.city]
            .filter(Boolean)
            .join(", "),
          lat: addr.lat,
          lng: addr.lng,
          directions: addr.directions,
          buildingName: addr.buildingName,
          apartmentNo: addr.apartmentNo,
        };
      }
    }

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Calculate delivery distance
    let deliveryDistance: number | undefined;
    if (org?.lat && org?.lng && deliveryAddress?.lat && deliveryAddress?.lng) {
      deliveryDistance = calculateDistance(
        org.lat,
        org.lng,
        deliveryAddress.lat,
        deliveryAddress.lng
      );
    }

    return {
      _id: order._id,
      displayId: order.displayId,
      status: order.status,
      total: order.total,
      deliveryTotal: order.deliveryTotal,
      currencyCode: order.currencyCode,
      customerClerkId: order.customerClerkId,
      riderId: order.riderId,
      createdAt: order._creationTime,
      store: org
        ? {
            _id: org._id,
            name: org.name,
            phone: org.phone,
            address: [org.street, org.town, org.cityOrDistrict]
              .filter(Boolean)
              .join(", "),
            lat: org.lat,
            lng: org.lng,
          }
        : null,
      deliveryAddress,
      deliveryDistance: deliveryDistance
        ? Math.round(deliveryDistance * 100) / 100
        : undefined,
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
      })),
    };
  },
});

// =============================================================================
// RIDER ACTIONS
// =============================================================================

/**
 * Accept a delivery (rider claims an unassigned order).
 */
export const acceptDelivery = mutation({
  args: {
    orderId: v.id("orders"),
    riderClerkId: v.string(),
    riderName: v.string(),
    riderPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Check if order is available for pickup
    if (order.status !== "ready_for_pickup") {
      throw new Error(`Order is not ready for pickup. Status: ${order.status}`);
    }

    // Check if order already has a rider
    if (order.riderId) {
      throw new Error("This order has already been assigned to another rider");
    }

    // Check if order is a delivery order
    if (order.fulfillmentType !== "delivery") {
      throw new Error("This order is not a delivery order");
    }

    // Assign rider to order
    await ctx.db.patch(args.orderId, {
      riderId: args.riderClerkId,
      riderName: args.riderName,
      riderPhone: args.riderPhone,
      status: "out_for_delivery",
    });

    // Log event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.riderClerkId,
      eventType: "rider_accepted",
      fromOrderStatus: "ready_for_pickup",
      toOrderStatus: "out_for_delivery",
      reason: `Rider ${args.riderName} accepted delivery`,
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
        message: `${args.riderName} is on the way to pick up your order!`,
      }
    );

    return { success: true };
  },
});

/**
 * Mark order as picked up (rider collected from store).
 */
export const markPickedUp = mutation({
  args: {
    orderId: v.id("orders"),
    riderClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify rider is assigned to this order
    if (order.riderId !== args.riderClerkId) {
      throw new Error("You are not assigned to this order");
    }

    // Verify order is in correct status
    if (order.status !== "out_for_delivery") {
      throw new Error(
        `Cannot mark as picked up. Order status: ${order.status}`
      );
    }

    // Log event (status remains out_for_delivery)
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.riderClerkId,
      eventType: "picked_up",
      reason: "Rider picked up order from store",
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
        message: "Your order has been picked up and is on the way!",
      }
    );

    return { success: true };
  },
});

/**
 * Notify customer that rider is nearby.
 */
export const notifyNearby = mutation({
  args: {
    orderId: v.id("orders"),
    riderClerkId: v.string(),
    estimatedMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify rider is assigned
    if (order.riderId !== args.riderClerkId) {
      throw new Error("You are not assigned to this order");
    }

    // Send notification
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendRiderNearbyNotification,
      {
        customerClerkId: order.customerClerkId,
        orderId: args.orderId,
        orderDisplayId: String(order.displayId),
        riderName: order.riderName,
        estimatedMinutes: args.estimatedMinutes,
      }
    );

    return { success: true };
  },
});

/**
 * Mark order as delivered (rider completed delivery).
 */
export const markDelivered = mutation({
  args: {
    orderId: v.id("orders"),
    riderClerkId: v.string(),
    deliveryNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify rider is assigned
    if (order.riderId !== args.riderClerkId) {
      throw new Error("You are not assigned to this order");
    }

    // Verify order is out for delivery
    if (order.status !== "out_for_delivery") {
      throw new Error(
        `Cannot mark as delivered. Order status: ${order.status}`
      );
    }

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "delivered",
      fulfillmentStatus: "fulfilled",
      paymentStatus: "captured", // Assuming cash on delivery is collected
    });

    // Log event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.riderClerkId,
      eventType: "delivered",
      fromOrderStatus: "out_for_delivery",
      toOrderStatus: "delivered",
      reason: args.deliveryNotes ?? "Order delivered successfully",
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
        status: "delivered",
      }
    );

    return { success: true };
  },
});

/**
 * Cancel/unassign from a delivery (rider can't complete).
 */
export const cancelDelivery = mutation({
  args: {
    orderId: v.id("orders"),
    riderClerkId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify rider is assigned
    if (order.riderId !== args.riderClerkId) {
      throw new Error("You are not assigned to this order");
    }

    // Can only cancel before delivery
    if (order.status === "delivered") {
      throw new Error("Cannot cancel a delivered order");
    }

    // Unassign rider, set order back to ready for pickup
    await ctx.db.patch(args.orderId, {
      riderId: undefined,
      riderName: undefined,
      riderPhone: undefined,
      status: "ready_for_pickup",
    });

    // Log event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.riderClerkId,
      eventType: "rider_unassigned",
      fromOrderStatus: order.status,
      toOrderStatus: "ready_for_pickup",
      reason: `Rider cancelled: ${args.reason}`,
      snapshotTotal: order.total,
      snapshotTaxTotal: order.taxTotal,
      snapshotDiscountTotal: order.discountTotal,
      snapshotDeliveryTotal: order.deliveryTotal,
    });

    return { success: true };
  },
});

// =============================================================================
// RIDER'S CURRENT DELIVERY
// =============================================================================

/**
 * Get rider's current active delivery.
 */
export const getCurrentDelivery = query({
  args: { riderClerkId: v.string() },
  handler: async (ctx, args) => {
    // Find active order for this rider
    const order = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("riderId"), args.riderClerkId),
          q.eq(q.field("status"), "out_for_delivery")
        )
      )
      .first();

    if (!order) return null;

    // Get full details
    const org = await ctx.db.get(order.organizationId);

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
          lat: addr.lat,
          lng: addr.lng,
          directions: addr.directions,
        };
      }
    }

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    // Check if picked up (from events)
    const pickupEvent = await ctx.db
      .query("orderEvents")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .filter((q) => q.eq(q.field("eventType"), "picked_up"))
      .first();

    return {
      _id: order._id,
      displayId: order.displayId,
      total: order.total,
      deliveryTotal: order.deliveryTotal,
      currencyCode: order.currencyCode,
      isPickedUp: !!pickupEvent,
      store: org
        ? {
            name: org.name,
            phone: org.phone,
            address: [org.street, org.town, org.cityOrDistrict]
              .filter(Boolean)
              .join(", "),
            lat: org.lat,
            lng: org.lng,
          }
        : null,
      deliveryAddress,
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
      })),
    };
  },
});

// =============================================================================
// RIDER DELIVERY HISTORY
// =============================================================================

/**
 * Get rider's delivery history.
 */
export const getDeliveryHistory = query({
  args: {
    riderClerkId: v.string(),
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()), // Timestamp
    endDate: v.optional(v.number()), // Timestamp
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const query = ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("riderId"), args.riderClerkId),
          q.eq(q.field("status"), "delivered")
        )
      );

    const orders = await query.order("desc").take(limit);

    // Filter by date if provided
    let filteredOrders = orders;
    if (args.startDate || args.endDate) {
      filteredOrders = orders.filter((o) => {
        if (args.startDate && o._creationTime < args.startDate) return false;
        if (args.endDate && o._creationTime > args.endDate) return false;
        return true;
      });
    }

    // Enrich with store info
    const enriched = await Promise.all(
      filteredOrders.map(async (order) => {
        const org = await ctx.db.get(order.organizationId);

        return {
          _id: order._id,
          displayId: order.displayId,
          deliveryTotal: order.deliveryTotal,
          currencyCode: order.currencyCode,
          deliveredAt: order._creationTime,
          storeName: org?.name,
        };
      })
    );

    // Calculate totals
    const totalEarnings = enriched.reduce(
      (sum, o) => sum + (o.deliveryTotal ?? 0),
      0
    );

    return {
      deliveries: enriched,
      count: enriched.length,
      totalEarnings,
    };
  },
});

/**
 * Get rider's earnings summary.
 */
export const getEarningsSummary = query({
  args: { riderClerkId: v.string() },
  handler: async (ctx, args) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all delivered orders for this rider
    const allDeliveries = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("riderId"), args.riderClerkId),
          q.eq(q.field("status"), "delivered")
        )
      )
      .collect();

    // Calculate earnings by period
    const todaysDeliveries = allDeliveries.filter(
      (o) => o._creationTime >= startOfToday.getTime()
    );
    const weeksDeliveries = allDeliveries.filter(
      (o) => o._creationTime >= startOfWeek.getTime()
    );
    const monthsDeliveries = allDeliveries.filter(
      (o) => o._creationTime >= startOfMonth.getTime()
    );

    const sumEarnings = (orders: typeof allDeliveries) =>
      orders.reduce((sum, o) => sum + (o.deliveryTotal ?? 0), 0);

    return {
      today: {
        deliveries: todaysDeliveries.length,
        earnings: sumEarnings(todaysDeliveries),
      },
      thisWeek: {
        deliveries: weeksDeliveries.length,
        earnings: sumEarnings(weeksDeliveries),
      },
      thisMonth: {
        deliveries: monthsDeliveries.length,
        earnings: sumEarnings(monthsDeliveries),
      },
      allTime: {
        deliveries: allDeliveries.length,
        earnings: sumEarnings(allDeliveries),
      },
    };
  },
});

// =============================================================================
// VENDOR: ASSIGN RIDER TO ORDER
// =============================================================================

/**
 * Vendor manually assigns a rider to an order.
 */
export const assignToOrder = mutation({
  args: {
    orderId: v.id("orders"),
    riderId: v.string(),
    riderName: v.string(),
    riderPhone: v.optional(v.string()),
    actorClerkId: v.string(), // Vendor making the assignment
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order is ready and doesn't have a rider
    if (order.status !== "ready_for_pickup" && order.status !== "preparing") {
      throw new Error(`Cannot assign rider. Order status: ${order.status}`);
    }

    if (order.riderId) {
      throw new Error("Order already has a rider assigned");
    }

    // Assign rider
    await ctx.db.patch(args.orderId, {
      riderId: args.riderId,
      riderName: args.riderName,
      riderPhone: args.riderPhone,
      status: "out_for_delivery",
    });

    // Log event
    await ctx.db.insert("orderEvents", {
      orderId: args.orderId,
      clerkId: args.actorClerkId,
      eventType: "rider_assigned",
      fromOrderStatus: order.status,
      toOrderStatus: "out_for_delivery",
      reason: `Rider ${args.riderName} assigned by vendor`,
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
        message: `${args.riderName} has been assigned to deliver your order!`,
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

// =============================================================================
// RIDER LOCATION UPDATES
// =============================================================================

/**
 * Update rider's current location.
 * Called periodically by rider's mobile app.
 */
export const updateLocation = mutation({
  args: {
    riderClerkId: v.string(),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.riderClerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lat: args.lat,
        lng: args.lng,
        lastUpdatedAt: Date.now(),
      });
    } else {
      // Create new record if doesn't exist
      await ctx.db.insert("riderLocations", {
        clerkId: args.riderClerkId,
        lat: args.lat,
        lng: args.lng,
        status: "online",
        lastUpdatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Get online riders (for vendor to see available riders).
 */
export const listOnlineRiders = query({
  args: {
    storeLat: v.optional(v.number()),
    storeLng: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get online riders
    const onlineRiders = await ctx.db
      .query("riderLocations")
      .withIndex("by_status", (q) => q.eq("status", "online"))
      .take(limit * 2);

    // Filter out stale locations (no update in last 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const activeRiders = onlineRiders.filter(
      (r) => r.lastUpdatedAt > tenMinutesAgo
    );

    // Calculate distance from store if provided
    const ridersWithDistance = activeRiders.map((rider) => {
      let distanceKm: number | undefined;
      if (args.storeLat && args.storeLng) {
        distanceKm = calculateDistance(
          args.storeLat,
          args.storeLng,
          rider.lat,
          rider.lng
        );
      }

      return {
        clerkId: rider.clerkId,
        lat: rider.lat,
        lng: rider.lng,
        lastUpdatedAt: rider.lastUpdatedAt,
        distanceKm: distanceKm ? Math.round(distanceKm * 100) / 100 : undefined,
      };
    });

    // Sort by distance if available
    const sorted = ridersWithDistance.sort((a, b) => {
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });

    return sorted.slice(0, limit);
  },
});

/**
 * Get rider's current location (for customer tracking).
 */
export const getRiderLocation = query({
  args: { riderClerkId: v.string() },
  handler: async (ctx, args) => {
    const location = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.riderClerkId))
      .first();

    if (!location) return null;

    // Don't return stale locations
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    if (location.lastUpdatedAt < tenMinutesAgo) {
      return null;
    }

    return {
      lat: location.lat,
      lng: location.lng,
      lastUpdatedAt: location.lastUpdatedAt,
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
