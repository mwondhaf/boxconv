import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// =============================================================================
// CONSTANTS
// =============================================================================

const QUOTE_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes
const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

// Default fare config (UGX)
const DEFAULT_CONFIG = {
  baseFee: 3000,
  ratePerKm: 500,
  minFee: 5000,
  surgeMultiplier: 1.0,
};

// =============================================================================
// TYPES
// =============================================================================

interface Coordinate {
  lat: number;
  lng: number;
}

interface MapboxRoute {
  distance: number; // meters
  duration: number; // seconds
}

interface MapboxResponse {
  routes?: MapboxRoute[];
  code?: string;
  message?: string;
}

interface DistanceResult {
  distanceMeters: number;
  durationSeconds?: number;
  source: "mapbox" | "haversine";
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate haversine distance between two points (fallback)
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const dPhi = (lat2 - lat1) * DEG_TO_RAD;
  const dLambda = (lng2 - lng1) * DEG_TO_RAD;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(dLambda / 2) *
      Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Get driving distance from Mapbox API
 */
async function getMapboxDistance(
  origin: Coordinate,
  destination: Coordinate,
  accessToken: string
): Promise<{ ok: true; data: DistanceResult } | { ok: false; error: string }> {
  try {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${accessToken}&overview=false`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return { ok: false, error: `Mapbox API error: ${response.status} - ${errorText}` };
    }

    const data: MapboxResponse = await response.json();

    if (data.code !== "Ok" || !data.routes?.length) {
      return { ok: false, error: data.message ?? "No route found" };
    }

    const route = data.routes[0];
    return {
      ok: true,
      data: {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        source: "mapbox" as const,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to get directions",
    };
  }
}

/**
 * Calculate delivery fee based on distance and pricing rules
 */
function calculateDeliveryFee(
  distanceMeters: number,
  config: {
    baseFee: number;
    ratePerKm: number;
    minFee: number;
    surgeMultiplier: number;
  }
): {
  baseFee: number;
  distanceFee: number;
  deliveryFee: number;
} {
  const distanceKm = distanceMeters / 1000;
  const distanceFee = Math.round(distanceKm * config.ratePerKm);
  const subtotal = config.baseFee + distanceFee;
  const withSurge = Math.round(subtotal * config.surgeMultiplier);
  const deliveryFee = Math.max(withSurge, config.minFee);

  return {
    baseFee: config.baseFee,
    distanceFee,
    deliveryFee,
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a delivery quote by ID
 */
export const get = query({
  args: { id: v.id("deliveryQuotes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get quote for an order
 */
export const getByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveryQuotes")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();
  },
});

/**
 * Get quote for a parcel
 */
export const getByParcel = query({
  args: { parcelId: v.id("parcels") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveryQuotes")
      .withIndex("by_parcel", (q) => q.eq("parcelId", args.parcelId))
      .first();
  },
});

// =============================================================================
// INTERNAL MUTATIONS
// =============================================================================

/**
 * Internal mutation to store a calculated quote
 */
export const storeQuote = internalMutation({
  args: {
    pickupLat: v.number(),
    pickupLng: v.number(),
    dropoffLat: v.number(),
    dropoffLng: v.number(),
    distanceMeters: v.number(),
    distanceSource: v.union(v.literal("mapbox"), v.literal("haversine")),
    estimatedDurationSeconds: v.optional(v.number()),
    baseFee: v.number(),
    ratePerKm: v.number(),
    distanceFee: v.number(),
    surgeMultiplier: v.number(),
    minFee: v.number(),
    deliveryFee: v.number(),
    zoneId: v.optional(v.id("deliveryZones")),
    zoneName: v.optional(v.string()),
    ruleId: v.optional(v.id("pricingRules")),
    ruleName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const quoteId = await ctx.db.insert("deliveryQuotes", {
      pickupLat: args.pickupLat,
      pickupLng: args.pickupLng,
      dropoffLat: args.dropoffLat,
      dropoffLng: args.dropoffLng,
      distanceMeters: args.distanceMeters,
      distanceSource: args.distanceSource,
      estimatedDurationSeconds: args.estimatedDurationSeconds,
      baseFee: args.baseFee,
      ratePerKm: args.ratePerKm,
      distanceFee: args.distanceFee,
      surgeMultiplier: args.surgeMultiplier,
      minFee: args.minFee,
      deliveryFee: args.deliveryFee,
      zoneId: args.zoneId,
      zoneName: args.zoneName,
      ruleId: args.ruleId,
      ruleName: args.ruleName,
      expiresAt: now + QUOTE_VALIDITY_MS,
      createdAt: now,
    });

    return quoteId;
  },
});

// =============================================================================
// ACTIONS (for external API calls)
// =============================================================================

/**
 * Calculate delivery quote using Mapbox for accurate driving distance
 * Falls back to haversine if Mapbox is unavailable
 */
export const calculate = action({
  args: {
    pickupLat: v.number(),
    pickupLng: v.number(),
    dropoffLat: v.number(),
    dropoffLng: v.number(),
  },
  handler: async (ctx, args): Promise<{
    quoteId: Id<"deliveryQuotes">;
    distanceMeters: number;
    distanceKm: number;
    distanceSource: "mapbox" | "haversine";
    estimatedDurationSeconds?: number;
    estimatedDurationMinutes?: number;
    baseFee: number;
    distanceFee: number;
    deliveryFee: number;
    currency: string;
    expiresAt: number;
  }> => {
    const origin: Coordinate = { lat: args.pickupLat, lng: args.pickupLng };
    const destination: Coordinate = { lat: args.dropoffLat, lng: args.dropoffLng };

    // Try to get Mapbox access token from environment
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

    let distanceResult: DistanceResult;

    if (mapboxToken) {
      // Try Mapbox first
      const mapboxResult = await getMapboxDistance(origin, destination, mapboxToken);

      if (mapboxResult.ok) {
        distanceResult = mapboxResult.data;
      } else {
        // Fallback to haversine
        console.warn("Mapbox failed, using haversine:", mapboxResult.error);
        distanceResult = {
          distanceMeters: haversineDistance(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng
          ),
          source: "haversine",
        };
      }
    } else {
      // No Mapbox token, use haversine
      distanceResult = {
        distanceMeters: haversineDistance(
          origin.lat,
          origin.lng,
          destination.lat,
          destination.lng
        ),
        source: "haversine",
      };
    }

    // TODO: Load pricing rules from database based on zone
    // For now, use default config
    const config = DEFAULT_CONFIG;

    // Calculate fees
    const fees = calculateDeliveryFee(distanceResult.distanceMeters, config);

    // Store the quote
    const quoteId = await ctx.runMutation(internal.deliveryQuotes.storeQuote, {
      pickupLat: args.pickupLat,
      pickupLng: args.pickupLng,
      dropoffLat: args.dropoffLat,
      dropoffLng: args.dropoffLng,
      distanceMeters: Math.round(distanceResult.distanceMeters),
      distanceSource: distanceResult.source,
      estimatedDurationSeconds: distanceResult.durationSeconds,
      baseFee: fees.baseFee,
      ratePerKm: config.ratePerKm,
      distanceFee: fees.distanceFee,
      surgeMultiplier: config.surgeMultiplier,
      minFee: config.minFee,
      deliveryFee: fees.deliveryFee,
    });

    const expiresAt = Date.now() + QUOTE_VALIDITY_MS;

    return {
      quoteId,
      distanceMeters: Math.round(distanceResult.distanceMeters),
      distanceKm: Math.round(distanceResult.distanceMeters / 100) / 10, // Round to 1 decimal
      distanceSource: distanceResult.source,
      estimatedDurationSeconds: distanceResult.durationSeconds,
      estimatedDurationMinutes: distanceResult.durationSeconds
        ? Math.ceil(distanceResult.durationSeconds / 60)
        : undefined,
      baseFee: fees.baseFee,
      distanceFee: fees.distanceFee,
      deliveryFee: fees.deliveryFee,
      currency: "UGX",
      expiresAt,
    };
  },
});

/**
 * Quick estimate without storing (for UI preview)
 */
export const estimate = action({
  args: {
    pickupLat: v.number(),
    pickupLng: v.number(),
    dropoffLat: v.number(),
    dropoffLng: v.number(),
  },
  handler: async (_ctx, args): Promise<{
    distanceMeters: number;
    distanceKm: number;
    estimatedFee: number;
    currency: string;
  }> => {
    // Use haversine for quick estimates (no API call)
    const distanceMeters = haversineDistance(
      args.pickupLat,
      args.pickupLng,
      args.dropoffLat,
      args.dropoffLng
    );

    const config = DEFAULT_CONFIG;
    const fees = calculateDeliveryFee(distanceMeters, config);

    return {
      distanceMeters: Math.round(distanceMeters),
      distanceKm: Math.round(distanceMeters / 100) / 10,
      estimatedFee: fees.deliveryFee,
      currency: "UGX",
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Link a quote to an order
 */
export const linkToOrder = mutation({
  args: {
    quoteId: v.id("deliveryQuotes"),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }

    if (quote.expiresAt < Date.now()) {
      throw new Error("Quote has expired");
    }

    if (quote.usedAt) {
      throw new Error("Quote has already been used");
    }

    await ctx.db.patch(args.quoteId, {
      orderId: args.orderId,
      usedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Link a quote to a parcel
 */
export const linkToParcel = mutation({
  args: {
    quoteId: v.id("deliveryQuotes"),
    parcelId: v.id("parcels"),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }

    if (quote.expiresAt < Date.now()) {
      throw new Error("Quote has expired");
    }

    if (quote.usedAt) {
      throw new Error("Quote has already been used");
    }

    await ctx.db.patch(args.quoteId, {
      parcelId: args.parcelId,
      usedAt: Date.now(),
    });

    return { success: true };
  },
});
