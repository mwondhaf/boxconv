/**
 * Delivery fare calculation utilities
 *
 * This module provides functions to calculate delivery fees based on distance,
 * order value, time of day, and other factors.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FareConfig {
  /** Base fare applied to all deliveries (in smallest currency unit) */
  baseFare: number;
  /** Rate per kilometer (in smallest currency unit) */
  perKmRate: number;
  /** Minimum fare - floor for any delivery */
  minimumFare: number;
  /** Maximum fare - cap for any delivery */
  maximumFare?: number;
  /** Surge multiplier (1.0 = no surge, 1.5 = 50% surge) */
  surgeMultiplier?: number;
  /** Free delivery threshold - order value above this gets free delivery */
  freeDeliveryThreshold?: number;
  /** Small order fee for orders below a certain value */
  smallOrderThreshold?: number;
  /** Fee added for small orders */
  smallOrderFee?: number;
  /** Currency code */
  currency: string;
}

export interface FareInput {
  /** Distance in kilometers */
  distanceKm: number;
  /** Order subtotal (before delivery) in smallest currency unit */
  orderSubtotal: number;
  /** Hour of day (0-23) for time-based pricing */
  hourOfDay?: number;
  /** Day of week (0-6, 0 = Sunday) */
  dayOfWeek?: number;
  /** Whether this is an express/priority delivery */
  isExpress?: boolean;
  /** Weight in grams (for heavy item surcharge) */
  weightGrams?: number;
}

export interface FareBreakdown {
  /** Base fare component */
  baseFare: number;
  /** Distance-based component */
  distanceFare: number;
  /** Surge pricing component (if any) */
  surgeFare: number;
  /** Small order fee (if applicable) */
  smallOrderFee: number;
  /** Express delivery fee (if applicable) */
  expressFee: number;
  /** Heavy item surcharge (if applicable) */
  heavyItemFee: number;
  /** Discount applied (negative value) */
  discount: number;
  /** Total delivery fare */
  total: number;
  /** Currency code */
  currency: string;
  /** Whether free delivery was applied */
  isFreeDelivery: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION (UGX - Ugandan Shilling)
// =============================================================================

export const DEFAULT_FARE_CONFIG: FareConfig = {
  baseFare: 2000, // UGX 2,000 base
  perKmRate: 500, // UGX 500 per km
  minimumFare: 3000, // UGX 3,000 minimum
  maximumFare: 50_000, // UGX 50,000 maximum
  surgeMultiplier: 1.0, // No surge by default
  freeDeliveryThreshold: 100_000, // Free delivery for orders over UGX 100,000
  smallOrderThreshold: 15_000, // Small order fee for orders under UGX 15,000
  smallOrderFee: 1500, // UGX 1,500 small order fee
  currency: "UGX",
};

// =============================================================================
// FARE CALCULATION
// =============================================================================

/**
 * Calculate delivery fare based on distance and other factors
 *
 * @param input - Fare calculation input
 * @param config - Fare configuration (uses defaults if not provided)
 * @returns Fare breakdown with all components
 */
export function calculateFare(
  input: FareInput,
  config: FareConfig = DEFAULT_FARE_CONFIG
): FareBreakdown {
  const {
    distanceKm,
    orderSubtotal,
    hourOfDay,
    isExpress = false,
    weightGrams = 0,
  } = input;

  // Initialize breakdown
  const breakdown: FareBreakdown = {
    baseFare: config.baseFare,
    distanceFare: 0,
    surgeFare: 0,
    smallOrderFee: 0,
    expressFee: 0,
    heavyItemFee: 0,
    discount: 0,
    total: 0,
    currency: config.currency,
    isFreeDelivery: false,
  };

  // Check for free delivery threshold
  if (
    config.freeDeliveryThreshold &&
    orderSubtotal >= config.freeDeliveryThreshold
  ) {
    breakdown.isFreeDelivery = true;
    breakdown.total = 0;
    return breakdown;
  }

  // Calculate distance fare
  breakdown.distanceFare = Math.round(distanceKm * config.perKmRate);

  // Calculate surge fare based on time of day
  const surgeMultiplier = getSurgeMultiplier(hourOfDay, config.surgeMultiplier);
  if (surgeMultiplier > 1.0) {
    const baseTotal = breakdown.baseFare + breakdown.distanceFare;
    breakdown.surgeFare = Math.round(baseTotal * (surgeMultiplier - 1));
  }

  // Apply small order fee
  if (
    config.smallOrderThreshold &&
    config.smallOrderFee &&
    orderSubtotal < config.smallOrderThreshold
  ) {
    breakdown.smallOrderFee = config.smallOrderFee;
  }

  // Apply express fee (50% surcharge)
  if (isExpress) {
    const baseTotal = breakdown.baseFare + breakdown.distanceFare;
    breakdown.expressFee = Math.round(baseTotal * 0.5);
  }

  // Apply heavy item fee (for items over 10kg)
  if (weightGrams > 10_000) {
    // UGX 200 per kg over 10kg
    const excessKg = (weightGrams - 10_000) / 1000;
    breakdown.heavyItemFee = Math.round(excessKg * 200);
  }

  // Calculate total
  let total =
    breakdown.baseFare +
    breakdown.distanceFare +
    breakdown.surgeFare +
    breakdown.smallOrderFee +
    breakdown.expressFee +
    breakdown.heavyItemFee +
    breakdown.discount;

  // Apply minimum fare
  total = Math.max(total, config.minimumFare);

  // Apply maximum fare cap
  if (config.maximumFare) {
    total = Math.min(total, config.maximumFare);
  }

  breakdown.total = total;

  return breakdown;
}

/**
 * Get surge multiplier based on time of day
 *
 * Peak hours (higher surge):
 * - Morning rush: 7-9 AM (1.3x)
 * - Lunch rush: 12-2 PM (1.2x)
 * - Evening rush: 5-8 PM (1.4x)
 * - Late night: 10 PM - 5 AM (1.5x)
 *
 * @param hourOfDay - Hour of day (0-23)
 * @param baseSurge - Base surge multiplier from config
 * @returns Effective surge multiplier
 */
function getSurgeMultiplier(hourOfDay?: number, baseSurge = 1.0): number {
  if (hourOfDay === undefined) {
    return baseSurge;
  }

  let timeSurge = 1.0;

  // Late night surge (10 PM - 5 AM)
  if (hourOfDay >= 22 || hourOfDay < 5) {
    timeSurge = 1.5;
  }
  // Morning rush (7-9 AM)
  else if (hourOfDay >= 7 && hourOfDay < 9) {
    timeSurge = 1.3;
  }
  // Lunch rush (12-2 PM)
  else if (hourOfDay >= 12 && hourOfDay < 14) {
    timeSurge = 1.2;
  }
  // Evening rush (5-8 PM)
  else if (hourOfDay >= 17 && hourOfDay < 20) {
    timeSurge = 1.4;
  }

  // Combine time-based surge with configured surge
  return Math.max(timeSurge, baseSurge);
}

/**
 * Estimate delivery time based on distance
 *
 * @param distanceKm - Distance in kilometers
 * @param isExpress - Whether this is express delivery
 * @returns Estimated delivery time in minutes
 */
export function estimateDeliveryTime(
  distanceKm: number,
  isExpress = false
): { minMinutes: number; maxMinutes: number } {
  // Base preparation time
  const prepTime = isExpress ? 5 : 15;

  // Average speed assumptions
  // Normal: 20 km/h average (traffic, stops, etc.)
  // Express: 30 km/h average (priority routing)
  const avgSpeedKmH = isExpress ? 30 : 20;

  const travelMinutes = (distanceKm / avgSpeedKmH) * 60;

  // Add buffer time
  const minMinutes = Math.round(prepTime + travelMinutes);
  const maxMinutes = Math.round(prepTime + travelMinutes * 1.5);

  return { minMinutes, maxMinutes };
}

/**
 * Format fare for display
 *
 * @param amount - Amount in smallest currency unit
 * @param currency - Currency code
 * @returns Formatted string
 */
export function formatFare(amount: number, currency = "UGX"): string {
  // For UGX, we don't use decimals
  if (currency === "UGX") {
    return `UGX ${amount.toLocaleString()}`;
  }

  // For other currencies, assume 2 decimal places
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

/**
 * Calculate fare for a P2P parcel delivery
 *
 * @param distanceKm - Distance in kilometers
 * @param sizeCategory - Parcel size category
 * @param isFragile - Whether the parcel is fragile
 * @param declaredValue - Declared value of contents
 * @returns Fare breakdown
 */
export function calculateParcelFare(
  distanceKm: number,
  sizeCategory: "small" | "medium" | "large" | "xlarge",
  isFragile = false,
  declaredValue = 0
): FareBreakdown {
  // Size-based multipliers
  const sizeMultipliers: Record<string, number> = {
    small: 1.0,
    medium: 1.3,
    large: 1.6,
    xlarge: 2.0,
  };

  const sizeMultiplier = sizeMultipliers[sizeCategory] ?? 1.0;

  // Parcel-specific config (higher base, different rates)
  const parcelConfig: FareConfig = {
    baseFare: Math.round(3000 * sizeMultiplier), // Base varies by size
    perKmRate: Math.round(600 * sizeMultiplier), // Per-km varies by size
    minimumFare: Math.round(4000 * sizeMultiplier),
    maximumFare: 100_000,
    currency: "UGX",
  };

  const breakdown = calculateFare(
    {
      distanceKm,
      orderSubtotal: 0, // No order subtotal for parcels
      isExpress: false,
    },
    parcelConfig
  );

  // Add fragile handling fee (flat 2000 UGX)
  if (isFragile) {
    breakdown.total += 2000;
  }

  // Add insurance fee based on declared value (1% of value, minimum 1000)
  if (declaredValue > 0) {
    const insuranceFee = Math.max(1000, Math.round(declaredValue * 0.01));
    breakdown.total += insuranceFee;
  }

  return breakdown;
}

/**
 * Get delivery zones and their fare adjustments
 *
 * @param geohashPrefix - Geohash prefix for the delivery area
 * @returns Zone-specific fare adjustments
 */
export function getZoneFareAdjustment(_geohashPrefix: string): {
  name: string;
  multiplier: number;
  additionalFee: number;
} {
  // Default zone
  const defaultZone = {
    name: "Standard",
    multiplier: 1.0,
    additionalFee: 0,
  };

  // This would typically be loaded from a database
  // For now, return default zone
  // In production, you'd have a table of zones with their geohash prefixes

  return defaultZone;
}
