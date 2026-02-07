/**
 * Stages Module - Rider gathering points / hubs management
 *
 * Stages are physical locations where riders gather and wait for deliveries.
 * They help with:
 * - Efficient rider coordination and assignment
 * - Geographic coverage management
 * - Capacity planning
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/ability";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique stage code (e.g., "STG-KAMPALA-01")
 */
async function generateStageCode(
  ctx: { db: any },
  district?: string
): Promise<string> {
  // Get current counter or create one
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", "stages"))
    .unique();

  let nextValue: number;
  if (counter) {
    nextValue = counter.value + 1;
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    nextValue = 1;
    await ctx.db.insert("counters", { name: "stages", value: nextValue });
  }

  // Format code with district prefix if available
  const prefix = district
    ? `STG-${district.toUpperCase().slice(0, 6)}`
    : "STG";

  return `${prefix}-${String(nextValue).padStart(3, "0")}`;
}

/**
 * Calculate geohash for a coordinate (simplified version)
 */
function calculateGeohash(lat: number, lng: number, precision = 6): string {
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let minLat = -90,
    maxLat = 90;
  let minLng = -180,
    maxLng = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng > mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    even = !even;
    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List all stages with optional filters
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    zoneId: v.optional(v.id("deliveryZones")),
    district: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { isActive, zoneId, district } = args;

    let stages;
    if (isActive !== undefined) {
      stages = await ctx.db
        .query("stages")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    } else if (zoneId) {
      stages = await ctx.db
        .query("stages")
        .withIndex("by_zone", (q) => q.eq("zoneId", zoneId))
        .collect();
    } else if (district) {
      stages = await ctx.db
        .query("stages")
        .withIndex("by_district", (q) => q.eq("district", district))
        .collect();
    } else {
      stages = await ctx.db.query("stages").collect();
    }

    // Get rider counts for each stage
    const stagesWithCounts = await Promise.all(
      stages.map(async (stage) => {
        const activeMemberships = await ctx.db
          .query("riderStageMemberships")
          .withIndex("by_stage_active", (q) =>
            q.eq("stageId", stage._id).eq("isActive", true)
          )
          .collect();

        return {
          ...stage,
          riderCount: activeMemberships.length,
        };
      })
    );

    return stagesWithCounts;
  },
});

/**
 * List only active stages (for dropdowns, etc.)
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const stages = await ctx.db
      .query("stages")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .collect();

    return stages;
  },
});

/**
 * Get a single stage by ID
 */
export const get = query({
  args: { stageId: v.id("stages") },
  handler: async (ctx, args) => {
    const stage = await ctx.db.get(args.stageId);
    if (!stage) return null;

    // Get zone info if assigned
    let zone = null;
    if (stage.zoneId) {
      zone = await ctx.db.get(stage.zoneId);
    }

    // Get active riders at this stage
    const activeMemberships = await ctx.db
      .query("riderStageMemberships")
      .withIndex("by_stage_active", (q) =>
        q.eq("stageId", args.stageId).eq("isActive", true)
      )
      .collect();

    // Get rider details
    const riders = await Promise.all(
      activeMemberships.map(async (membership) => {
        const rider = await ctx.db.get(membership.riderId);
        if (!rider) return null;

        // Get current location
        const location = await ctx.db
          .query("riderLocations")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", rider.clerkId))
          .unique();

        return {
          _id: rider._id,
          riderCode: rider.riderCode,
          name: rider.name,
          phoneNumber: rider.phoneNumber,
          vehicleType: rider.vehicleType,
          accountStatus: rider.accountStatus,
          isPrimary: membership.isPrimary,
          joinedAt: membership.joinedAt,
          currentStatus: location?.status ?? "offline",
          lastOnlineAt: location?.lastUpdatedAt,
        };
      })
    );

    return {
      ...stage,
      zone,
      riderCount: activeMemberships.length,
      riders: riders.filter(Boolean),
    };
  },
});

/**
 * Get stage by code
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const stage = await ctx.db
      .query("stages")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    return stage;
  },
});

/**
 * Get stages near a location
 */
export const listNearby = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radiusKm = args.radiusKm ?? 10;

    // Get all active stages
    const stages = await ctx.db
      .query("stages")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Calculate distance and filter
    const stagesWithDistance = stages
      .map((stage) => {
        const distance = calculateDistance(
          args.lat,
          args.lng,
          stage.lat,
          stage.lng
        );
        return {
          ...stage,
          distanceKm: Math.round(distance * 10) / 10,
        };
      })
      .filter((stage) => stage.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return stagesWithDistance;
  },
});

/**
 * Get stage statistics
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allStages = await ctx.db.query("stages").collect();

    const stats = {
      total: allStages.length,
      active: 0,
      inactive: 0,
      totalCapacity: 0,
      byDistrict: {} as Record<string, number>,
    };

    for (const stage of allStages) {
      if (stage.isActive) {
        stats.active++;
      } else {
        stats.inactive++;
      }

      if (stage.capacity) {
        stats.totalCapacity += stage.capacity;
      }

      if (stage.district) {
        stats.byDistrict[stage.district] =
          (stats.byDistrict[stage.district] || 0) + 1;
      }
    }

    // Get total rider assignments
    const allMemberships = await ctx.db
      .query("riderStageMemberships")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return {
      ...stats,
      totalAssignedRiders: allMemberships.length,
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new stage
 */
export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    district: v.optional(v.string()),
    description: v.optional(v.string()),
    zoneId: v.optional(v.id("deliveryZones")),
    capacity: v.optional(v.number()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    // Generate stage code
    const code = await generateStageCode(ctx, args.district);

    // Calculate geohash for location-based queries
    const geohash = calculateGeohash(args.lat, args.lng);

    const now = Date.now();

    const stageId = await ctx.db.insert("stages", {
      name: args.name,
      code,
      description: args.description,
      address: args.address,
      district: args.district,
      lat: args.lat,
      lng: args.lng,
      geohash,
      zoneId: args.zoneId,
      capacity: args.capacity,
      isActive: true,
      contactName: args.contactName,
      contactPhone: args.contactPhone,
      createdAt: now,
      updatedAt: now,
    });

    return { stageId, code };
  },
});

/**
 * Update stage details
 */
export const update = mutation({
  args: {
    stageId: v.id("stages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    district: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    zoneId: v.optional(v.id("deliveryZones")),
    capacity: v.optional(v.number()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    const { stageId, ...updates } = args;
    const filteredUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Recalculate geohash if location changed
    if (filteredUpdates.lat !== undefined || filteredUpdates.lng !== undefined) {
      const newLat = filteredUpdates.lat ?? stage.lat;
      const newLng = filteredUpdates.lng ?? stage.lng;
      filteredUpdates.geohash = calculateGeohash(newLat, newLng);
    }

    await ctx.db.patch(stageId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Toggle stage active status
 */
export const toggleActive = mutation({
  args: { stageId: v.id("stages") },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    await ctx.db.patch(args.stageId, {
      isActive: !stage.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !stage.isActive };
  },
});

/**
 * Deactivate a stage (keeps riders but marks as inactive)
 */
export const deactivate = mutation({
  args: { stageId: v.id("stages") },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    await ctx.db.patch(args.stageId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a stage (only if no active riders)
 */
export const remove = mutation({
  args: { stageId: v.id("stages") },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    // Check for active rider assignments
    const activeMemberships = await ctx.db
      .query("riderStageMemberships")
      .withIndex("by_stage_active", (q) =>
        q.eq("stageId", args.stageId).eq("isActive", true)
      )
      .first();

    if (activeMemberships) {
      throw new Error(
        "Cannot delete stage with active riders. Remove all riders first or deactivate the stage instead."
      );
    }

    // Delete all membership records for this stage
    const allMemberships = await ctx.db
      .query("riderStageMemberships")
      .withIndex("by_stage", (q) => q.eq("stageId", args.stageId))
      .collect();

    for (const membership of allMemberships) {
      await ctx.db.delete(membership._id);
    }

    // Delete the stage
    await ctx.db.delete(args.stageId);

    return { success: true };
  },
});

/**
 * Get riders at a stage
 */
export const getRiders = query({
  args: {
    stageId: v.id("stages"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? true;

    let memberships;
    if (activeOnly) {
      memberships = await ctx.db
        .query("riderStageMemberships")
        .withIndex("by_stage_active", (q) =>
          q.eq("stageId", args.stageId).eq("isActive", true)
        )
        .collect();
    } else {
      memberships = await ctx.db
        .query("riderStageMemberships")
        .withIndex("by_stage", (q) => q.eq("stageId", args.stageId))
        .collect();
    }

    const riders = await Promise.all(
      memberships.map(async (membership) => {
        const rider = await ctx.db.get(membership.riderId);
        if (!rider) return null;

        // Get current location/status
        const location = await ctx.db
          .query("riderLocations")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", rider.clerkId))
          .unique();

        return {
          membership: {
            _id: membership._id,
            isActive: membership.isActive,
            isPrimary: membership.isPrimary,
            joinedAt: membership.joinedAt,
            leftAt: membership.leftAt,
          },
          rider: {
            _id: rider._id,
            riderCode: rider.riderCode,
            name: rider.name,
            phoneNumber: rider.phoneNumber,
            vehicleType: rider.vehicleType,
            accountStatus: rider.accountStatus,
            averageRating:
              rider.ratingCount > 0
                ? Math.round((rider.ratingSum / rider.ratingCount) * 10) / 10
                : null,
            completedDeliveries: rider.completedDeliveries,
          },
          currentStatus: location?.status ?? "offline",
          lastOnlineAt: location?.lastUpdatedAt,
        };
      })
    );

    return riders.filter(Boolean);
  },
});

// =============================================================================
// HELPER: Distance calculation
// =============================================================================

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
