/**
 * Rider Admin Module - Administrative functions for rider management
 *
 * This module handles:
 * - Rider registration (admin-initiated or self-registration approval)
 * - Profile management and updates
 * - Compliance tracking and verification
 * - Approval/suspension workflows
 * - Rider code generation
 * - Stage assignments
 * - Performance queries
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/ability";

// =============================================================================
// VALIDATORS
// =============================================================================

const riderAccountStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("suspended"),
  v.literal("inactive")
);

const vehicleTypeValidator = v.union(
  v.literal("walking"),
  v.literal("bicycle"),
  v.literal("scooter"),
  v.literal("motorbike"),
  v.literal("car"),
  v.literal("van"),
  v.literal("truck")
);

const payoutMethodValidator = v.union(
  v.literal("mobile_money"),
  v.literal("bank"),
  v.literal("cash"),
  v.literal("wallet")
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique rider code (e.g., "RDR-001234")
 */
async function generateRiderCode(
  ctx: { db: any },
  prefix = "RDR"
): Promise<string> {
  // Get current counter or create one
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", "riders"))
    .unique();

  let nextValue: number;
  if (counter) {
    nextValue = counter.value + 1;
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    nextValue = 1;
    await ctx.db.insert("counters", { name: "riders", value: nextValue });
  }

  // Format as RDR-XXXXXX (6 digits, zero-padded)
  return `${prefix}-${String(nextValue).padStart(6, "0")}`;
}

/**
 * Normalize phone number to +256 format (Uganda)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Handle different formats
  if (cleaned.startsWith("+256")) {
    return cleaned;
  } else if (cleaned.startsWith("256")) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith("0")) {
    return `+256${cleaned.slice(1)}`;
  } else if (cleaned.length === 9) {
    // Just the number without prefix
    return `+256${cleaned}`;
  }

  // Return as-is if we can't parse it
  return phone;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List all riders with optional filters
 */
export const list = query({
  args: {
    accountStatus: v.optional(riderAccountStatusValidator),
    vehicleType: v.optional(vehicleTypeValidator),
    district: v.optional(v.string()),
    stageId: v.optional(v.id("stages")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Apply filters based on available indexes
    let riders;
    const { accountStatus, vehicleType, district, stageId } = args;

    if (accountStatus) {
      riders = await ctx.db
        .query("riders")
        .withIndex("by_accountStatus", (q) =>
          q.eq("accountStatus", accountStatus)
        )
        .order("desc")
        .take(limit + 1);
    } else if (vehicleType) {
      riders = await ctx.db
        .query("riders")
        .withIndex("by_vehicleType", (q) =>
          q.eq("vehicleType", vehicleType)
        )
        .order("desc")
        .take(limit + 1);
    } else if (district) {
      riders = await ctx.db
        .query("riders")
        .withIndex("by_district", (q) => q.eq("district", district))
        .order("desc")
        .take(limit + 1);
    } else if (stageId) {
      riders = await ctx.db
        .query("riders")
        .withIndex("by_currentStage", (q) =>
          q.eq("currentStageId", stageId)
        )
        .order("desc")
        .take(limit + 1);
    } else {
      riders = await ctx.db
        .query("riders")
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = riders.length > limit;
    const items = hasMore ? riders.slice(0, limit) : riders;

    // Calculate average rating for each rider
    const ridersWithRating = items.map((rider: any) => ({
      ...rider,
      averageRating:
        rider.ratingCount > 0
          ? Math.round((rider.ratingSum / rider.ratingCount) * 10) / 10
          : null,
    }));

    return {
      items: ridersWithRating,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : null,
    };
  },
});

/**
 * Get a single rider by ID
 */
export const get = query({
  args: { riderId: v.id("riders") },
  handler: async (ctx, args) => {
    const rider = await ctx.db.get(args.riderId);
    if (!rider) return null;

    // Get current stage info if assigned
    let stage = null;
    if (rider.currentStageId) {
      stage = await ctx.db.get(rider.currentStageId);
    }

    // Get recent location
    const location = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", rider.clerkId))
      .unique();

    return {
      ...rider,
      averageRating:
        rider.ratingCount > 0
          ? Math.round((rider.ratingSum / rider.ratingCount) * 10) / 10
          : null,
      stage,
      currentLocation: location
        ? {
            lat: location.lat,
            lng: location.lng,
            status: location.status,
            lastUpdatedAt: location.lastUpdatedAt,
          }
        : null,
    };
  },
});

/**
 * Get rider by Clerk ID
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const rider = await ctx.db
      .query("riders")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!rider) return null;

    return {
      ...rider,
      averageRating:
        rider.ratingCount > 0
          ? Math.round((rider.ratingSum / rider.ratingCount) * 10) / 10
          : null,
    };
  },
});

/**
 * Search riders by name
 */
export const search = query({
  args: {
    searchTerm: v.string(),
    accountStatus: v.optional(riderAccountStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let query = ctx.db
      .query("riders")
      .withSearchIndex("search_riders", (q: any) => {
        let search = q.search("name", args.searchTerm);
        if (args.accountStatus) {
          search = search.eq("accountStatus", args.accountStatus);
        }
        return search;
      });

    const riders = await query.take(limit);

    return riders.map((rider: any) => ({
      ...rider,
      averageRating:
        rider.ratingCount > 0
          ? Math.round((rider.ratingSum / rider.ratingCount) * 10) / 10
          : null,
    }));
  },
});

/**
 * Get riders pending approval
 */
export const listPendingApproval = query({
  args: {},
  handler: async (ctx) => {
    const riders = await ctx.db
      .query("riders")
      .withIndex("by_accountStatus", (q: any) => q.eq("accountStatus", "pending"))
      .order("asc") // Oldest first (FIFO)
      .collect();

    return riders.map((rider: any) => ({
      ...rider,
      averageRating: null, // New riders have no ratings
    }));
  },
});

/**
 * Get rider statistics summary
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allRiders = await ctx.db.query("riders").collect();

    const stats = {
      total: allRiders.length,
      pending: 0,
      active: 0,
      suspended: 0,
      inactive: 0,
      byVehicleType: {} as Record<string, number>,
      totalCompletedDeliveries: 0,
      totalEarnings: 0,
    };

    for (const rider of allRiders) {
      // Count by status
      stats[rider.accountStatus as keyof typeof stats]++;

      // Count by vehicle type
      stats.byVehicleType[rider.vehicleType] =
        (stats.byVehicleType[rider.vehicleType] || 0) + 1;

      // Sum metrics
      stats.totalCompletedDeliveries += rider.completedDeliveries || 0;
      stats.totalEarnings += rider.totalEarnings || 0;
    }

    // Get online riders count
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const onlineRiders = await ctx.db
      .query("riderLocations")
      .withIndex("by_status", (q: any) => q.eq("status", "online"))
      .collect();

    const activeOnline = onlineRiders.filter(
      (r: any) => r.lastUpdatedAt > tenMinutesAgo
    ).length;

    return {
      ...stats,
      currentlyOnline: activeOnline,
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Register a new rider (admin-initiated)
 */
export const register = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    vehicleType: vehicleTypeValidator,
    // Optional fields
    nationalId: v.optional(v.string()),
    drivingPermitNumber: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    vehicleModel: v.optional(v.string()),
    vehicleColor: v.optional(v.string()),
    district: v.optional(v.string()),
    subCounty: v.optional(v.string()),
    homeAddress: v.optional(v.string()),
    nextOfKinName: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),
    preferredPayoutMethod: v.optional(payoutMethodValidator),
    mobileMoneyNumber: v.optional(v.string()),
    mobileMoneyProvider: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require platform admin
    await requirePlatformAdmin(ctx);

    // Check if rider already exists
    const existing = await ctx.db
      .query("riders")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      throw new Error("Rider with this Clerk ID already exists");
    }

    // Check phone number uniqueness
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);
    const existingPhone = await ctx.db
      .query("riders")
      .withIndex("by_phoneNumber", (q: any) => q.eq("phoneNumber", normalizedPhone))
      .unique();

    if (existingPhone) {
      throw new Error("Rider with this phone number already exists");
    }

    // Generate rider code
    const riderCode = await generateRiderCode(ctx);

    const now = Date.now();

    const riderId = await ctx.db.insert("riders", {
      // Core Identity
      clerkId: args.clerkId,
      riderCode,
      name: args.name,
      accountStatus: "pending",

      // Contact
      phoneNumber: normalizedPhone,
      email: args.email,
      nextOfKinName: args.nextOfKinName,
      nextOfKinPhone: args.nextOfKinPhone
        ? normalizePhoneNumber(args.nextOfKinPhone)
        : undefined,

      // Compliance
      nationalId: args.nationalId,
      drivingPermitNumber: args.drivingPermitNumber,
      helmetVerified: false,

      // Vehicle
      vehicleType: args.vehicleType,
      vehiclePlate: args.vehiclePlate,
      vehicleMake: args.vehicleMake,
      vehicleModel: args.vehicleModel,
      vehicleColor: args.vehicleColor,

      // Location
      district: args.district,
      subCounty: args.subCounty,
      homeAddress: args.homeAddress,

      // Payout
      preferredPayoutMethod: args.preferredPayoutMethod ?? "mobile_money",
      mobileMoneyNumber: args.mobileMoneyNumber
        ? normalizePhoneNumber(args.mobileMoneyNumber)
        : undefined,
      mobileMoneyProvider: args.mobileMoneyProvider,

      // Performance (initialize to zero)
      ratingSum: 0,
      ratingCount: 0,
      completedDeliveries: 0,
      canceledDeliveries: 0,
      totalEarnings: 0,

      // Notes
      notes: args.notes,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    });

    return { riderId, riderCode };
  },
});

/**
 * Update rider profile
 */
export const updateProfile = mutation({
  args: {
    riderId: v.id("riders"),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    nextOfKinName: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),
    homeAddress: v.optional(v.string()),
    district: v.optional(v.string()),
    subCounty: v.optional(v.string()),
    parish: v.optional(v.string()),
    village: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    const { riderId, ...updates } = args;
    const filteredUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === "phoneNumber" || key === "nextOfKinPhone") {
          filteredUpdates[key] = normalizePhoneNumber(value);
        } else {
          filteredUpdates[key] = value;
        }
      }
    }

    // Check phone uniqueness if changing
    if (
      filteredUpdates.phoneNumber &&
      filteredUpdates.phoneNumber !== rider.phoneNumber
    ) {
      const existingPhone = await ctx.db
        .query("riders")
        .withIndex("by_phoneNumber", (q: any) =>
          q.eq("phoneNumber", filteredUpdates.phoneNumber)
        )
        .unique();

      if (existingPhone) {
        throw new Error("Phone number already in use by another rider");
      }
    }

    await ctx.db.patch(riderId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update rider vehicle information
 */
export const updateVehicle = mutation({
  args: {
    riderId: v.id("riders"),
    vehicleType: v.optional(vehicleTypeValidator),
    vehiclePlate: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    vehicleModel: v.optional(v.string()),
    vehicleColor: v.optional(v.string()),
    vehicleYear: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    const { riderId, ...updates } = args;
    const filteredUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(riderId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update rider compliance documents
 */
export const updateCompliance = mutation({
  args: {
    riderId: v.id("riders"),
    nationalId: v.optional(v.string()),
    drivingPermitNumber: v.optional(v.string()),
    drivingPermitExpiry: v.optional(v.number()),
    tin: v.optional(v.string()),
    insuranceNumber: v.optional(v.string()),
    insuranceExpiry: v.optional(v.number()),
    helmetVerified: v.optional(v.boolean()),
    nationalIdPhotoR2Key: v.optional(v.string()),
    drivingPermitPhotoR2Key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    const { riderId, ...updates } = args;
    const filteredUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(riderId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update rider payout preferences
 */
export const updatePayoutPreferences = mutation({
  args: {
    riderId: v.id("riders"),
    preferredPayoutMethod: v.optional(payoutMethodValidator),
    mobileMoneyProvider: v.optional(v.string()),
    mobileMoneyNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    const { riderId, ...updates } = args;
    const filteredUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === "mobileMoneyNumber") {
          filteredUpdates[key] = normalizePhoneNumber(value);
        } else {
          filteredUpdates[key] = value;
        }
      }
    }

    await ctx.db.patch(riderId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Approve a pending rider
 */
export const approve = mutation({
  args: {
    riderId: v.id("riders"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    if (rider.accountStatus !== "pending") {
      throw new Error(
        `Cannot approve rider with status "${rider.accountStatus}". Only pending riders can be approved.`
      );
    }

    const now = Date.now();

    await ctx.db.patch(args.riderId, {
      accountStatus: "active",
      approvedAt: now,
      approvedBy: userId,
      notes: args.notes ?? rider.notes,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Suspend a rider
 */
export const suspend = mutation({
  args: {
    riderId: v.id("riders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    if (rider.accountStatus === "suspended") {
      throw new Error("Rider is already suspended");
    }

    const now = Date.now();

    await ctx.db.patch(args.riderId, {
      accountStatus: "suspended",
      suspendedAt: now,
      suspendedBy: userId,
      suspensionReason: args.reason,
      updatedAt: now,
    });

    // Also set rider offline if they have a location record
    const location = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", rider.clerkId))
      .unique();

    if (location) {
      await ctx.db.patch(location._id, {
        status: "offline",
        lastUpdatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Reactivate a suspended rider
 */
export const reactivate = mutation({
  args: {
    riderId: v.id("riders"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    if (rider.accountStatus !== "suspended" && rider.accountStatus !== "inactive") {
      throw new Error(
        `Cannot reactivate rider with status "${rider.accountStatus}".`
      );
    }

    const now = Date.now();

    await ctx.db.patch(args.riderId, {
      accountStatus: "active",
      suspendedAt: undefined,
      suspendedBy: undefined,
      suspensionReason: undefined,
      notes: args.notes ?? rider.notes,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Deactivate a rider (soft delete)
 */
export const deactivate = mutation({
  args: {
    riderId: v.id("riders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.riderId, {
      accountStatus: "inactive",
      notes: args.reason
        ? `${rider.notes ? rider.notes + "\n" : ""}Deactivated: ${args.reason}`
        : rider.notes,
      updatedAt: now,
    });

    // Also set rider offline
    const location = await ctx.db
      .query("riderLocations")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", rider.clerkId))
      .unique();

    if (location) {
      await ctx.db.patch(location._id, {
        status: "offline",
        lastUpdatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Assign rider to a stage
 */
export const assignToStage = mutation({
  args: {
    riderId: v.id("riders"),
    stageId: v.id("stages"),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    if (!stage.isActive) {
      throw new Error("Cannot assign rider to inactive stage");
    }

    const now = Date.now();
    const isPrimary = args.isPrimary ?? true;

    // Check if already assigned to this stage
    const existingMembership = await ctx.db
      .query("riderStageMemberships")
      .withIndex("by_rider", (q: any) => q.eq("riderId", args.riderId))
      .filter((q: any) => q.eq(q.field("stageId"), args.stageId))
      .first();

    if (existingMembership && existingMembership.isActive) {
      throw new Error("Rider is already assigned to this stage");
    }

    // If setting as primary, unset other primary assignments
    if (isPrimary) {
      const currentPrimary = await ctx.db
        .query("riderStageMemberships")
        .withIndex("by_rider_active", (q: any) =>
          q.eq("riderId", args.riderId).eq("isActive", true)
        )
        .filter((q: any) => q.eq(q.field("isPrimary"), true))
        .first();

      if (currentPrimary) {
        await ctx.db.patch(currentPrimary._id, { isPrimary: false });
      }
    }

    // Create or reactivate membership
    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, {
        isActive: true,
        isPrimary,
        joinedAt: now,
        leftAt: undefined,
        assignedBy: userId,
      });
    } else {
      await ctx.db.insert("riderStageMemberships", {
        riderId: args.riderId,
        stageId: args.stageId,
        isActive: true,
        isPrimary,
        joinedAt: now,
        assignedBy: userId,
      });
    }

    // Update rider's current stage if primary
    if (isPrimary) {
      await ctx.db.patch(args.riderId, {
        currentStageId: args.stageId,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Remove rider from a stage
 */
export const removeFromStage = mutation({
  args: {
    riderId: v.id("riders"),
    stageId: v.id("stages"),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const membership = await ctx.db
      .query("riderStageMemberships")
      .withIndex("by_rider", (q: any) => q.eq("riderId", args.riderId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("stageId"), args.stageId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!membership) {
      throw new Error("Rider is not assigned to this stage");
    }

    const now = Date.now();

    await ctx.db.patch(membership._id, {
      isActive: false,
      leftAt: now,
    });

    // If this was the rider's current stage, clear it
    const rider = await ctx.db.get(args.riderId);
    if (rider && rider.currentStageId === args.stageId) {
      // Try to find another active primary stage
      const nextPrimary = await ctx.db
        .query("riderStageMemberships")
        .withIndex("by_rider_active", (q: any) =>
          q.eq("riderId", args.riderId).eq("isActive", true)
        )
        .filter((q: any) => q.eq(q.field("isPrimary"), true))
        .first();

      await ctx.db.patch(args.riderId, {
        currentStageId: nextPrimary?.stageId ?? undefined,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Get rider's stage assignments
 */
export const getRiderStages = query({
  args: { riderId: v.id("riders") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("riderStageMemberships")
      .withIndex("by_rider", (q: any) => q.eq("riderId", args.riderId))
      .collect();

    const stagesWithInfo = await Promise.all(
      memberships.map(async (membership: any) => {
        const stage = await ctx.db.get(membership.stageId);
        return {
          ...membership,
          stage,
        };
      })
    );

    return stagesWithInfo;
  },
});

/**
 * Add admin notes to rider
 */
export const addNotes = mutation({
  args: {
    riderId: v.id("riders"),
    notes: v.string(),
    append: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const rider = await ctx.db.get(args.riderId);
    if (!rider) {
      throw new Error("Rider not found");
    }

    const newNotes =
      args.append && rider.notes
        ? `${rider.notes}\n${new Date().toISOString()}: ${args.notes}`
        : args.notes;

    await ctx.db.patch(args.riderId, {
      notes: newNotes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
