/**
 * Parcels Module - P2P Parcel Delivery
 *
 * This module handles all parcel delivery operations for mobile app customers:
 * - Parcel creation with pickup and dropoff details
 * - Fare calculation based on distance and size
 * - Parcel status management
 * - Verification code generation
 * - Parcel tracking
 *
 * Parcels are created by customers using mobile apps.
 *
 * Status flow: draft -> pending -> picked_up -> in_transit -> delivered
 * Can be canceled or failed at various stages.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

// =============================================================================
// TYPES & VALIDATORS
// =============================================================================

// Match the schema exactly
const parcelStatusValidator = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("picked_up"),
  v.literal("in_transit"),
  v.literal("delivered"),
  v.literal("canceled"),
  v.literal("failed")
);

const parcelSizeCategoryValidator = v.union(
  v.literal("small"),
  v.literal("medium"),
  v.literal("large"),
  v.literal("extra_large")
);

const parcelPaymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("refunded")
);

// Type aliases for use in the module
type ParcelStatus =
  | "draft"
  | "pending"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "canceled"
  | "failed";

// =============================================================================
// COUNTER HELPER
// =============================================================================

/**
 * Get next parcel display ID (auto-increment)
 */
export const getNextDisplayId = internalMutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const counter = await ctx.db
      .query("counters")
      .filter((q) => q.eq(q.field("name"), "parcel_display_id"))
      .first();

    if (counter) {
      const nextValue = counter.value + 1;
      await ctx.db.patch(counter._id, { value: nextValue });
      return nextValue;
    }
    // Initialize counter starting at 5000 (different range from orders)
    await ctx.db.insert("counters", {
      name: "parcel_display_id",
      value: 5001,
    });
    return 5000;
  },
});

// =============================================================================
// VERIFICATION CODE HELPERS
// =============================================================================

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

/**
 * Generate pickup and delivery codes for a parcel
 */
function generateParcelCodes(): { pickupCode: string; deliveryCode: string } {
  return {
    pickupCode: generateVerificationCode(),
    deliveryCode: generateVerificationCode(),
  };
}

// =============================================================================
// FARE CALCULATION
// =============================================================================

/**
 * Size category multipliers for fare calculation
 */
const SIZE_MULTIPLIERS: Record<string, number> = {
  small: 1.0, // Documents, small items
  medium: 1.3, // Parcels up to 5kg
  large: 1.6, // Parcels up to 15kg
  extra_large: 2.0, // Heavy/bulky items
};

/**
 * Base fares and distance rates (in UGX)
 */
const FARE_CONFIG = {
  baseFare: 3000, // Base fee for any delivery
  perKmRate: 1000, // Per kilometer rate
  fragileMultiplier: 1.2, // 20% extra for fragile items
  minFare: 5000, // Minimum fare
  maxFare: 50_000, // Maximum fare cap
};

/**
 * Calculate distance between two points using Haversine formula
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

/**
 * Calculate parcel delivery fare
 */
function calculateParcelFare(params: {
  distanceKm: number;
  sizeCategory: string;
  isFragile: boolean;
}): {
  baseFare: number;
  distanceFare: number;
  sizeMultiplier: number;
  fragileCharge: number;
  totalFare: number;
} {
  const { distanceKm, sizeCategory, isFragile } = params;

  const baseFare = FARE_CONFIG.baseFare;
  const distanceFare = Math.round(distanceKm * FARE_CONFIG.perKmRate);
  const sizeMultiplier = SIZE_MULTIPLIERS[sizeCategory] ?? 1.0;

  const subtotal = (baseFare + distanceFare) * sizeMultiplier;

  const fragileCharge = isFragile
    ? Math.round(subtotal * (FARE_CONFIG.fragileMultiplier - 1))
    : 0;

  let totalFare = subtotal + fragileCharge;

  // Apply min/max constraints
  totalFare = Math.max(FARE_CONFIG.minFare, totalFare);
  totalFare = Math.min(FARE_CONFIG.maxFare, totalFare);

  return {
    baseFare,
    distanceFare,
    sizeMultiplier,
    fragileCharge,
    totalFare: Math.round(totalFare),
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get fare estimate for a parcel delivery
 */
export const getFareEstimate = query({
  args: {
    pickupLat: v.number(),
    pickupLng: v.number(),
    dropoffLat: v.number(),
    dropoffLng: v.number(),
    sizeCategory: parcelSizeCategoryValidator,
    fragile: v.boolean(),
  },
  handler: async (_ctx, args) => {
    const distanceKm = calculateDistance(
      args.pickupLat,
      args.pickupLng,
      args.dropoffLat,
      args.dropoffLng
    );

    const fareBreakdown = calculateParcelFare({
      distanceKm,
      sizeCategory: args.sizeCategory,
      isFragile: args.fragile,
    });

    // Estimate delivery time (rough: 3 mins per km + 15 mins base)
    const estimatedMinutes = Math.round(15 + distanceKm * 3);

    return {
      distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
      fare: fareBreakdown,
      estimatedDeliveryMinutes: estimatedMinutes,
      currency: "UGX",
    };
  },
});

/**
 * Get a single parcel by ID
 */
export const get = query({
  args: {
    id: v.id("parcels"),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.id);
    if (!parcel) return null;

    // Get events for timeline
    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcel", (q) => q.eq("parcelId", args.id))
      .collect();

    return {
      ...parcel,
      timeline: events
        .sort((a, b) => a._creationTime - b._creationTime)
        .map((e) => ({
          eventType: e.eventType,
          status: e.status,
          description: e.description,
          timestamp: e._creationTime,
        })),
    };
  },
});

/**
 * Get parcel by display ID
 */
export const getByDisplayId = query({
  args: {
    displayId: v.number(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db
      .query("parcels")
      .withIndex("by_displayId", (q) => q.eq("displayId", args.displayId))
      .first();

    return parcel;
  },
});

/**
 * List parcels for a customer (sender)
 */
export const listByCustomer = query({
  args: {
    clerkId: v.string(),
    status: v.optional(parcelStatusValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const parcelsQuery = ctx.db
      .query("parcels")
      .withIndex("by_senderClerkId", (q) => q.eq("senderClerkId", args.clerkId))
      .order("desc");

    // Note: Convex doesn't support combined index filtering easily,
    // so we filter status in memory for now
    const allParcels = await parcelsQuery.take(limit + 1);

    let filteredParcels = allParcels;
    if (args.status) {
      filteredParcels = allParcels.filter((p) => p.status === args.status);
    }

    const hasMore = filteredParcels.length > limit;
    const parcelsPage = filteredParcels.slice(0, limit);

    return {
      parcels: parcelsPage,
      nextCursor: hasMore
        ? parcelsPage[parcelsPage.length - 1]?._id
        : undefined,
    };
  },
});

/**
 * List all parcels (admin view)
 */
export const listAll = query({
  args: {
    status: v.optional(parcelStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const parcelsQuery = ctx.db.query("parcels").order("desc");

    const parcels = await parcelsQuery.take(limit);

    let filteredParcels = parcels;
    if (args.status) {
      filteredParcels = parcels.filter((p) => p.status === args.status);
    }

    return filteredParcels;
  },
});

/**
 * Get active parcels for a customer
 */
export const getActiveParcels = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const activeStatuses: ParcelStatus[] = [
      "draft",
      "pending",
      "picked_up",
      "in_transit",
    ];

    const parcels = await ctx.db
      .query("parcels")
      .withIndex("by_senderClerkId", (q) => q.eq("senderClerkId", args.clerkId))
      .collect();

    return parcels.filter((p) =>
      activeStatuses.includes(p.status as ParcelStatus)
    );
  },
});

/**
 * Get parcel tracking info
 */
export const getTrackingInfo = query({
  args: {
    parcelId: v.id("parcels"),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) return null;

    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcel", (q) => q.eq("parcelId", args.parcelId))
      .collect();

    return {
      parcelId: parcel._id,
      displayId: parcel.displayId,
      status: parcel.status,
      pickup: {
        name: parcel.pickupName,
        phone: parcel.pickupPhone,
        address: parcel.pickupAddress,
        lat: parcel.pickupLat,
        lng: parcel.pickupLng,
      },
      dropoff: {
        name: parcel.recipientName,
        phone: parcel.recipientPhone,
        address: parcel.dropoffAddress,
        lat: parcel.dropoffLat,
        lng: parcel.dropoffLng,
      },
      rider: parcel.externalRiderId
        ? {
            id: parcel.externalRiderId,
            name: parcel.externalRiderName,
            phone: parcel.externalRiderPhone,
          }
        : null,
      fare: parcel.priceAmount,
      currency: parcel.priceCurrency,
      timeline: events
        .sort((a, b) => a._creationTime - b._creationTime)
        .map((e) => ({
          eventType: e.eventType,
          status: e.status,
          description: e.description,
          timestamp: e._creationTime,
        })),
      createdAt: parcel._creationTime,
      pickedUpAt: parcel.pickedUpAt,
      deliveredAt: parcel.deliveredAt,
    };
  },
});

/**
 * Get parcel statistics (admin)
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allParcels = await ctx.db.query("parcels").collect();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    const todayParcels = allParcels.filter(
      (p) => p._creationTime >= startOfDayMs
    );

    return {
      total: allParcels.length,
      pending: allParcels.filter(
        (p) => p.status === "pending" || p.status === "draft"
      ).length,
      inProgress: allParcels.filter((p) =>
        ["picked_up", "in_transit"].includes(p.status)
      ).length,
      delivered: allParcels.filter((p) => p.status === "delivered").length,
      cancelled: allParcels.filter(
        (p) => p.status === "canceled" || p.status === "failed"
      ).length,
      todayTotal: todayParcels.length,
      todayDelivered: todayParcels.filter((p) => p.status === "delivered")
        .length,
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new parcel delivery request
 */
export const create = mutation({
  args: {
    senderClerkId: v.string(),
    // Pickup details
    pickupName: v.string(),
    pickupPhone: v.string(),
    pickupAddress: v.string(),
    pickupLat: v.optional(v.number()),
    pickupLng: v.optional(v.number()),
    pickupNotes: v.optional(v.string()),
    // Dropoff details
    recipientName: v.string(),
    recipientPhone: v.string(),
    dropoffAddress: v.string(),
    dropoffLat: v.optional(v.number()),
    dropoffLng: v.optional(v.number()),
    dropoffNotes: v.optional(v.string()),
    // Package details
    description: v.string(),
    weight: v.optional(v.number()),
    sizeCategory: parcelSizeCategoryValidator,
    fragile: v.boolean(),
    valueAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Calculate distance and fare if coordinates provided
    let distanceKm: number | undefined;
    let fareAmount: number | undefined;

    if (
      args.pickupLat &&
      args.pickupLng &&
      args.dropoffLat &&
      args.dropoffLng
    ) {
      distanceKm = calculateDistance(
        args.pickupLat,
        args.pickupLng,
        args.dropoffLat,
        args.dropoffLng
      );

      const fareBreakdown = calculateParcelFare({
        distanceKm,
        sizeCategory: args.sizeCategory,
        isFragile: args.fragile,
      });

      fareAmount = fareBreakdown.totalFare;
    }

    // Generate display ID
    const displayId: number = await ctx.runMutation(
      internal.parcels.getNextDisplayId
    );

    // Generate verification codes
    const codes = generateParcelCodes();

    // Calculate geohash for pickup location (simplified)
    const pickupGeohash =
      args.pickupLat && args.pickupLng
        ? `${args.pickupLat.toFixed(3)},${args.pickupLng.toFixed(3)}`
        : undefined;

    const dropoffGeohash =
      args.dropoffLat && args.dropoffLng
        ? `${args.dropoffLat.toFixed(3)},${args.dropoffLng.toFixed(3)}`
        : undefined;

    // Create parcel - status starts as 'pending' (ready for pickup)
    const parcelId = await ctx.db.insert("parcels", {
      displayId,
      senderClerkId: args.senderClerkId,
      // Pickup
      pickupName: args.pickupName,
      pickupPhone: args.pickupPhone,
      pickupAddress: args.pickupAddress,
      pickupLat: args.pickupLat,
      pickupLng: args.pickupLng,
      pickupGeohash,
      pickupNotes: args.pickupNotes,
      // Dropoff
      recipientName: args.recipientName,
      recipientPhone: args.recipientPhone,
      dropoffAddress: args.dropoffAddress,
      dropoffLat: args.dropoffLat,
      dropoffLng: args.dropoffLng,
      dropoffGeohash,
      dropoffNotes: args.dropoffNotes,
      // Package
      description: args.description,
      weight: args.weight,
      sizeCategory: args.sizeCategory,
      fragile: args.fragile,
      valueAmount: args.valueAmount,
      valueCurrency: "UGX",
      // Status - start as pending (awaiting rider assignment)
      status: "pending",
      paymentStatus: "pending",
      // Pricing
      estimatedDistance: distanceKm,
      priceAmount: fareAmount,
      priceCurrency: "UGX",
      // Codes
      pickupCode: codes.pickupCode,
      deliveryCode: codes.deliveryCode,
    });

    // Log creation event
    await ctx.db.insert("parcelEvents", {
      parcelId,
      eventType: "created",
      status: "pending",
      description: "Parcel delivery request created",
      clerkId: args.senderClerkId,
    });

    return {
      parcelId,
      displayId,
      fare: fareAmount,
      currency: "UGX",
      pickupCode: codes.pickupCode,
      deliveryCode: codes.deliveryCode,
    };
  },
});

/**
 * Update parcel status
 */
export const updateStatus = mutation({
  args: {
    parcelId: v.id("parcels"),
    status: parcelStatusValidator,
    actorClerkId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    const previousStatus = parcel.status;

    // Validate status transition
    // Status flow: draft -> pending -> picked_up -> in_transit -> delivered
    // Can be canceled or failed at various stages
    const validTransitions: Record<string, string[]> = {
      draft: ["pending", "canceled"],
      pending: ["picked_up", "canceled", "failed"],
      picked_up: ["in_transit", "canceled", "failed"],
      in_transit: ["delivered", "canceled", "failed"],
      delivered: [], // Terminal state
      canceled: [], // Terminal state
      failed: [], // Terminal state
    };

    const allowed = validTransitions[previousStatus] ?? [];
    if (!allowed.includes(args.status)) {
      throw new Error(
        `Invalid status transition from ${previousStatus} to ${args.status}`
      );
    }

    // Update parcel
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    // Add timestamps for specific statuses
    if (args.status === "picked_up") {
      updates.pickedUpAt = Date.now();
    } else if (args.status === "delivered") {
      updates.deliveredAt = Date.now();
    } else if (args.status === "canceled" || args.status === "failed") {
      updates.canceledAt = Date.now();
      updates.cancelReason = args.reason;
    }

    await ctx.db.patch(args.parcelId, updates);

    // Log event
    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "status_changed",
      status: args.status,
      description:
        args.reason ??
        `Status changed from ${previousStatus} to ${args.status}`,
      clerkId: args.actorClerkId,
    });

    return { success: true, newStatus: args.status };
  },
});

/**
 * Assign rider to parcel
 */
export const assignRider = mutation({
  args: {
    parcelId: v.id("parcels"),
    riderId: v.string(),
    riderName: v.string(),
    riderPhone: v.string(),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    // Can only assign rider to pending parcels
    if (parcel.status !== "pending" && parcel.status !== "draft") {
      throw new Error("Can only assign rider to pending or draft parcels");
    }

    await ctx.db.patch(args.parcelId, {
      externalRiderId: args.riderId,
      externalRiderName: args.riderName,
      externalRiderPhone: args.riderPhone,
      riderAssignedAt: Date.now(),
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "rider_assigned",
      status: parcel.status,
      description: `Rider ${args.riderName} assigned`,
      clerkId: args.actorClerkId,
      metadata: {
        riderId: args.riderId,
        riderName: args.riderName,
        riderPhone: args.riderPhone,
      },
    });

    return { success: true };
  },
});

/**
 * Mark parcel as picked up (rider action)
 */
export const markPickedUp = mutation({
  args: {
    parcelId: v.id("parcels"),
    pickupCode: v.string(),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    if (parcel.status !== "pending") {
      throw new Error("Parcel must be pending to mark as picked up");
    }

    // Verify pickup code
    if (parcel.pickupCode !== args.pickupCode) {
      throw new Error("Invalid pickup code");
    }

    await ctx.db.patch(args.parcelId, {
      status: "picked_up",
      pickedUpAt: Date.now(),
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "picked_up",
      status: "picked_up",
      description: "Parcel picked up from sender",
      clerkId: args.actorClerkId,
    });

    return { success: true };
  },
});

/**
 * Mark parcel as in transit
 */
export const markInTransit = mutation({
  args: {
    parcelId: v.id("parcels"),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    if (parcel.status !== "picked_up") {
      throw new Error("Parcel must be picked up first");
    }

    await ctx.db.patch(args.parcelId, {
      status: "in_transit",
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "in_transit",
      status: "in_transit",
      description: "Parcel is in transit to recipient",
      clerkId: args.actorClerkId,
    });

    return { success: true };
  },
});

/**
 * Mark parcel as delivered (rider action)
 */
export const markDelivered = mutation({
  args: {
    parcelId: v.id("parcels"),
    deliveryCode: v.string(),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    if (parcel.status !== "picked_up" && parcel.status !== "in_transit") {
      throw new Error("Parcel must be picked up or in transit to deliver");
    }

    // Verify delivery code
    if (parcel.deliveryCode !== args.deliveryCode) {
      throw new Error("Invalid delivery code");
    }

    await ctx.db.patch(args.parcelId, {
      status: "delivered",
      deliveredAt: Date.now(),
      paymentStatus: "paid", // Mark as paid on delivery
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "delivered",
      status: "delivered",
      description: "Parcel delivered to recipient",
      clerkId: args.actorClerkId,
    });

    return { success: true };
  },
});

/**
 * Cancel a parcel
 */
export const cancel = mutation({
  args: {
    parcelId: v.id("parcels"),
    reason: v.string(),
    actorClerkId: v.string(),
    isCustomer: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    // Can cancel if not yet delivered
    const cancellableStatuses: ParcelStatus[] = [
      "draft",
      "pending",
      "picked_up",
      "in_transit",
    ];

    if (!cancellableStatuses.includes(parcel.status as ParcelStatus)) {
      throw new Error("Cannot cancel a delivered or already cancelled parcel");
    }

    // If customer is cancelling, they can only cancel pending/draft
    if (
      args.isCustomer &&
      parcel.status !== "pending" &&
      parcel.status !== "draft"
    ) {
      throw new Error(
        "Customers can only cancel parcels before pickup. Contact support for assistance."
      );
    }

    await ctx.db.patch(args.parcelId, {
      status: "canceled",
      canceledAt: Date.now(),
      cancelReason: args.reason,
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "canceled",
      status: "canceled",
      description: `Parcel cancelled: ${args.reason}`,
      clerkId: args.actorClerkId,
    });

    return { success: true };
  },
});

/**
 * Mark parcel as failed
 */
export const markFailed = mutation({
  args: {
    parcelId: v.id("parcels"),
    reason: v.string(),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    // Can fail if in progress
    const failableStatuses: ParcelStatus[] = [
      "pending",
      "picked_up",
      "in_transit",
    ];

    if (!failableStatuses.includes(parcel.status as ParcelStatus)) {
      throw new Error("Cannot mark this parcel as failed");
    }

    await ctx.db.patch(args.parcelId, {
      status: "failed",
      canceledAt: Date.now(),
      cancelReason: args.reason,
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "failed",
      status: "failed",
      description: `Delivery failed: ${args.reason}`,
      clerkId: args.actorClerkId,
    });

    return { success: true };
  },
});

/**
 * Update payment status
 */
export const updatePaymentStatus = mutation({
  args: {
    parcelId: v.id("parcels"),
    paymentStatus: parcelPaymentStatusValidator,
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    await ctx.db.patch(args.parcelId, {
      paymentStatus: args.paymentStatus,
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "payment_updated",
      status: parcel.status,
      description: `Payment status changed to ${args.paymentStatus}`,
      clerkId: args.actorClerkId,
    });

    return { success: true };
  },
});

/**
 * Regenerate verification codes (if lost)
 */
export const regenerateCodes = mutation({
  args: {
    parcelId: v.id("parcels"),
    actorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    // Only allow regeneration for non-completed parcels
    const terminalStatuses: ParcelStatus[] = [
      "delivered",
      "canceled",
      "failed",
    ];
    if (terminalStatuses.includes(parcel.status as ParcelStatus)) {
      throw new Error("Cannot regenerate codes for completed parcels");
    }

    const codes = generateParcelCodes();

    await ctx.db.patch(args.parcelId, {
      pickupCode: codes.pickupCode,
      deliveryCode: codes.deliveryCode,
    });

    await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "codes_regenerated",
      status: parcel.status,
      description: "Verification codes regenerated",
      clerkId: args.actorClerkId,
    });

    return {
      pickupCode: codes.pickupCode,
      deliveryCode: codes.deliveryCode,
    };
  },
});
