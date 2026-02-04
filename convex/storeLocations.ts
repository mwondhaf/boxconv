/**
 * Store Location Operations using Geospatial Component
 *
 * This file provides geospatial queries for finding nearby stores,
 * indexing store locations, and managing delivery zones.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { storeLocations } from "./components";

// =============================================================================
// INDEXING OPERATIONS
// =============================================================================

/**
 * Index a store's location in the geospatial index.
 * Should be called when a store is created or its location is updated.
 */
export const indexStore = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    latitude: v.number(),
    longitude: v.number(),
    categoryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await storeLocations.insert(
      ctx,
      args.organizationId,
      {
        latitude: args.latitude,
        longitude: args.longitude,
      },
      {
        categoryId: args.categoryId,
      }
    );

    return { success: true };
  },
});

/**
 * Update a store's location in the geospatial index.
 */
export const updateStoreLocation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    latitude: v.number(),
    longitude: v.number(),
    categoryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Remove existing entry
    try {
      await storeLocations.remove(ctx, args.organizationId);
    } catch {
      // Entry may not exist, continue
    }

    // Insert updated entry
    await storeLocations.insert(
      ctx,
      args.organizationId,
      {
        latitude: args.latitude,
        longitude: args.longitude,
      },
      {
        categoryId: args.categoryId,
      }
    );

    return { success: true };
  },
});

/**
 * Remove a store from the geospatial index.
 */
export const removeStore = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    try {
      await storeLocations.remove(ctx, args.organizationId);
      return { success: true };
    } catch {
      return { success: false, error: "Store not found in index" };
    }
  },
});

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Find stores within a rectangular region.
 * Perfect for "stores in this area" map view.
 */
export const findStoresInArea = query({
  args: {
    west: v.number(), // Min longitude
    south: v.number(), // Min latitude
    east: v.number(), // Max longitude
    north: v.number(), // Max latitude
    categoryId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rectangle = {
      west: args.west,
      south: args.south,
      east: args.east,
      north: args.north,
    };

    const queryResult = await storeLocations.query(ctx, {
      shape: { type: "rectangle", rectangle },
      limit: args.limit ?? 50,
      filter: args.categoryId
        ? (q) => q.eq("categoryId", args.categoryId)
        : undefined,
    });

    // Enrich with store details
    const enrichedStores = await Promise.all(
      queryResult.results.map(async (result) => {
        const store = await ctx.db.get(result.key);
        if (!store) return null;

        return {
          _id: store._id,
          name: store.name,
          slug: store.slug,
          logo: store.logo,
          location: result.coordinates,
          cityOrDistrict: store.cityOrDistrict,
          town: store.town,
          openingTime: store.openingTime,
          closingTime: store.closingTime,
          isBusy: store.isBusy ?? false,
        };
      })
    );

    return enrichedStores.filter((s) => s !== null);
  },
});

/**
 * Find nearest stores to a point using a bounding box approach.
 * Perfect for "stores near me" functionality.
 */
export const findNearestStores = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    maxDistanceKm: v.optional(v.number()),
    categoryId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Convert km to approximate degrees (rough approximation)
    // 1 degree latitude ≈ 111 km
    // 1 degree longitude ≈ 111 km * cos(latitude)
    const maxKm = args.maxDistanceKm ?? 10;
    const latDelta = maxKm / 111;
    const lngDelta = maxKm / (111 * Math.cos(args.latitude * (Math.PI / 180)));

    const rectangle = {
      south: args.latitude - latDelta,
      north: args.latitude + latDelta,
      west: args.longitude - lngDelta,
      east: args.longitude + lngDelta,
    };

    const queryResult = await storeLocations.query(ctx, {
      shape: { type: "rectangle", rectangle },
      limit: (args.limit ?? 20) * 2, // Get more to filter by distance
      filter: args.categoryId
        ? (q) => q.eq("categoryId", args.categoryId)
        : undefined,
    });

    // Enrich with store details and calculate distance
    const enrichedStores = await Promise.all(
      queryResult.results.map(async (result) => {
        const store = await ctx.db.get(result.key);
        if (!store) return null;

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          args.latitude,
          args.longitude,
          result.coordinates.latitude,
          result.coordinates.longitude
        );

        // Filter by actual distance (bounding box is an approximation)
        if (distance > maxKm) return null;

        return {
          _id: store._id,
          name: store.name,
          slug: store.slug,
          logo: store.logo,
          location: result.coordinates,
          distanceKm: Math.round(distance * 100) / 100,
          distanceText: formatDistance(distance),
          cityOrDistrict: store.cityOrDistrict,
          town: store.town,
          street: store.street,
          openingTime: store.openingTime,
          closingTime: store.closingTime,
          phone: store.phone,
          isBusy: store.isBusy ?? false,
        };
      })
    );

    // Filter nulls and sort by distance, then limit
    return enrichedStores
      .filter((s) => s !== null)
      .sort((a, b) => (a?.distanceKm ?? 0) - (b?.distanceKm ?? 0))
      .slice(0, args.limit ?? 20);
  },
});

/**
 * Check if a delivery address is within a store's delivery zone.
 */
export const isWithinDeliveryZone = query({
  args: {
    storeId: v.id("organizations"),
    deliveryLat: v.number(),
    deliveryLng: v.number(),
    maxDeliveryDistanceKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const store = await ctx.db.get(args.storeId);
    if (!store || !store.lat || !store.lng) {
      return { withinZone: false, reason: "Store location not available" };
    }

    const maxDistance = args.maxDeliveryDistanceKm ?? 15; // Default 15km

    const distance = calculateDistance(
      store.lat,
      store.lng,
      args.deliveryLat,
      args.deliveryLng
    );

    return {
      withinZone: distance <= maxDistance,
      distanceKm: Math.round(distance * 100) / 100,
      maxDistanceKm: maxDistance,
      reason:
        distance <= maxDistance
          ? "Within delivery zone"
          : `Too far (${distance.toFixed(1)}km > ${maxDistance}km)`,
    };
  },
});

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Sync all store locations to the geospatial index.
 * Useful for initial setup or rebuilding the index.
 */
export const syncAllStoreLocations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const organizations = await ctx.db.query("organizations").collect();

    let indexed = 0;
    let skipped = 0;

    for (const org of organizations) {
      if (org.lat && org.lng) {
        try {
          // Remove existing entry if any
          try {
            await storeLocations.remove(ctx, org._id);
          } catch {
            // Ignore if not exists
          }

          // Index the store
          await storeLocations.insert(
            ctx,
            org._id,
            {
              latitude: org.lat,
              longitude: org.lng,
            },
            {
              categoryId: org.categoryId?.toString(),
            }
          );
          indexed++;
        } catch (error) {
          console.error(`Failed to index org ${org._id}:`, error);
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    return { indexed, skipped, total: organizations.length };
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate distance between two points using Haversine formula
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

/**
 * Format distance for display
 */
function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}
