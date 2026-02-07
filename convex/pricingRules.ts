import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/ability";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List all pricing rules
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db.query("pricingRules").order("asc").collect();

    // Enrich with zone information
    const enrichedRules = await Promise.all(
      rules.map(async (rule) => {
        let zone = null;
        if (rule.zoneId) {
          zone = await ctx.db.get(rule.zoneId);
        }
        return {
          ...rule,
          zoneName: zone?.name ?? null,
          zoneCity: zone?.city ?? null,
        };
      })
    );

    return enrichedRules;
  },
});

/**
 * List active pricing rules
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db
      .query("pricingRules")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return rules;
  },
});

/**
 * Get a single pricing rule by ID
 */
export const get = query({
  args: { id: v.id("pricingRules") },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id);
    if (!rule) return null;

    let zone = null;
    if (rule.zoneId) {
      zone = await ctx.db.get(rule.zoneId);
    }

    return {
      ...rule,
      zoneName: zone?.name ?? null,
      zoneCity: zone?.city ?? null,
    };
  },
});

/**
 * List pricing rules for a specific zone
 */
export const listByZone = query({
  args: { zoneId: v.id("deliveryZones") },
  handler: async (ctx, args) => {
    const rules = await ctx.db
      .query("pricingRules")
      .withIndex("by_zone", (q) => q.eq("zoneId", args.zoneId))
      .collect();

    return rules;
  },
});

/**
 * List active pricing rules for a specific zone
 */
export const listActiveByZone = query({
  args: { zoneId: v.optional(v.id("deliveryZones")) },
  handler: async (ctx, args) => {
    if (args.zoneId) {
      // Get rules for specific zone + global rules (no zone)
      const zoneRules = await ctx.db
        .query("pricingRules")
        .withIndex("by_zone_and_status", (q) =>
          q.eq("zoneId", args.zoneId).eq("status", "active")
        )
        .collect();

      const globalRules = await ctx.db
        .query("pricingRules")
        .withIndex("by_zone_and_status", (q) =>
          q.eq("zoneId", undefined).eq("status", "active")
        )
        .collect();

      return [...zoneRules, ...globalRules];
    }

    // If no zone specified, return all active rules
    return await ctx.db
      .query("pricingRules")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// =============================================================================
// MUTATIONS (Admin only)
// =============================================================================

/**
 * Create a new pricing rule
 */
export const create = mutation({
  args: {
    zoneId: v.optional(v.id("deliveryZones")),
    name: v.string(),
    baseFee: v.number(),
    ratePerKm: v.number(),
    minFee: v.number(),
    surgeMultiplier: v.optional(v.number()),
    daysOfWeek: v.optional(v.array(v.number())),
    startHour: v.optional(v.number()),
    endHour: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    // Only platform admins can create pricing rules
    await requirePlatformAdmin(ctx);

    // Validate zone exists if specified
    if (args.zoneId) {
      const zone = await ctx.db.get(args.zoneId);
      if (!zone) {
        throw new Error("Delivery zone not found");
      }
    }

    // Validate hours
    if (args.startHour !== undefined && (args.startHour < 0 || args.startHour > 23)) {
      throw new Error("Start hour must be between 0 and 23");
    }
    if (args.endHour !== undefined && (args.endHour < 0 || args.endHour > 23)) {
      throw new Error("End hour must be between 0 and 23");
    }

    // Validate days of week
    if (args.daysOfWeek) {
      for (const day of args.daysOfWeek) {
        if (day < 0 || day > 6) {
          throw new Error("Days of week must be between 0 (Sunday) and 6 (Saturday)");
        }
      }
    }

    const now = Date.now();
    const ruleId = await ctx.db.insert("pricingRules", {
      zoneId: args.zoneId,
      name: args.name,
      baseFee: args.baseFee,
      ratePerKm: args.ratePerKm,
      minFee: args.minFee,
      surgeMultiplier: args.surgeMultiplier ?? 1.0,
      daysOfWeek: args.daysOfWeek,
      startHour: args.startHour,
      endHour: args.endHour,
      status: args.status ?? "active",
      createdAt: now,
      updatedAt: now,
    });

    return ruleId;
  },
});

/**
 * Update an existing pricing rule
 */
export const update = mutation({
  args: {
    id: v.id("pricingRules"),
    zoneId: v.optional(v.id("deliveryZones")),
    name: v.optional(v.string()),
    baseFee: v.optional(v.number()),
    ratePerKm: v.optional(v.number()),
    minFee: v.optional(v.number()),
    surgeMultiplier: v.optional(v.number()),
    daysOfWeek: v.optional(v.array(v.number())),
    startHour: v.optional(v.number()),
    endHour: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    // Only platform admins can update pricing rules
    await requirePlatformAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Pricing rule not found");
    }

    // Validate zone exists if specified
    if (args.zoneId) {
      const zone = await ctx.db.get(args.zoneId);
      if (!zone) {
        throw new Error("Delivery zone not found");
      }
    }

    // Validate hours
    if (args.startHour !== undefined && (args.startHour < 0 || args.startHour > 23)) {
      throw new Error("Start hour must be between 0 and 23");
    }
    if (args.endHour !== undefined && (args.endHour < 0 || args.endHour > 23)) {
      throw new Error("End hour must be between 0 and 23");
    }

    // Validate days of week
    if (args.daysOfWeek) {
      for (const day of args.daysOfWeek) {
        if (day < 0 || day > 6) {
          throw new Error("Days of week must be between 0 (Sunday) and 6 (Saturday)");
        }
      }
    }

    const { id, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};

    // Only include defined values
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(args.id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete a pricing rule
 */
export const remove = mutation({
  args: { id: v.id("pricingRules") },
  handler: async (ctx, args) => {
    // Only platform admins can delete pricing rules
    await requirePlatformAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Pricing rule not found");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Toggle rule status (active/inactive)
 */
export const toggleStatus = mutation({
  args: { id: v.id("pricingRules") },
  handler: async (ctx, args) => {
    // Only platform admins can toggle rule status
    await requirePlatformAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Pricing rule not found");
    }

    const newStatus = existing.status === "active" ? "inactive" : "active";

    await ctx.db.patch(args.id, {
      status: newStatus,
      updatedAt: Date.now(),
    });

    return { status: newStatus };
  },
});
