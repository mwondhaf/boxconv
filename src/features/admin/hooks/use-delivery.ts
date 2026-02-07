import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// Delivery Zone Queries
// =============================================================================

/**
 * List all delivery zones.
 */
export function useDeliveryZones() {
  return useQuery(api.deliveryZones.list, {});
}

/**
 * List only active delivery zones.
 */
export function useActiveDeliveryZones() {
  return useQuery(api.deliveryZones.listActive, {});
}

/**
 * Get a single delivery zone by ID.
 */
export function useDeliveryZone(zoneId: Id<"deliveryZones"> | undefined) {
  return useQuery(api.deliveryZones.get, zoneId ? { id: zoneId } : "skip");
}

/**
 * List delivery zones by city.
 */
export function useDeliveryZonesByCity(city: string | undefined) {
  return useQuery(api.deliveryZones.listByCity, city ? { city } : "skip");
}

// =============================================================================
// Delivery Zone Mutations
// =============================================================================

/**
 * Create a new delivery zone.
 */
export function useCreateDeliveryZone() {
  return useMutation(api.deliveryZones.create);
}

/**
 * Update an existing delivery zone.
 */
export function useUpdateDeliveryZone() {
  return useMutation(api.deliveryZones.update);
}

/**
 * Delete a delivery zone.
 */
export function useDeleteDeliveryZone() {
  return useMutation(api.deliveryZones.remove);
}

/**
 * Toggle delivery zone active status.
 */
export function useToggleDeliveryZoneActive() {
  return useMutation(api.deliveryZones.toggleActive);
}

// =============================================================================
// Pricing Rule Queries
// =============================================================================

/**
 * List all pricing rules with zone info.
 */
export function usePricingRules() {
  return useQuery(api.pricingRules.list, {});
}

/**
 * List only active pricing rules.
 */
export function useActivePricingRules() {
  return useQuery(api.pricingRules.listActive, {});
}

/**
 * Get a single pricing rule by ID.
 */
export function usePricingRule(ruleId: Id<"pricingRules"> | undefined) {
  return useQuery(api.pricingRules.get, ruleId ? { id: ruleId } : "skip");
}

/**
 * List pricing rules for a specific zone.
 */
export function usePricingRulesByZone(zoneId: Id<"deliveryZones"> | undefined) {
  return useQuery(api.pricingRules.listByZone, zoneId ? { zoneId } : "skip");
}

/**
 * List active pricing rules for a zone (includes global rules).
 */
export function useActivePricingRulesByZone(
  zoneId: Id<"deliveryZones"> | undefined
) {
  return useQuery(api.pricingRules.listActiveByZone, { zoneId });
}

// =============================================================================
// Pricing Rule Mutations
// =============================================================================

/**
 * Create a new pricing rule.
 */
export function useCreatePricingRule() {
  return useMutation(api.pricingRules.create);
}

/**
 * Update an existing pricing rule.
 */
export function useUpdatePricingRule() {
  return useMutation(api.pricingRules.update);
}

/**
 * Delete a pricing rule.
 */
export function useDeletePricingRule() {
  return useMutation(api.pricingRules.remove);
}

/**
 * Toggle pricing rule status (active/inactive).
 */
export function useTogglePricingRuleStatus() {
  return useMutation(api.pricingRules.toggleStatus);
}

// =============================================================================
// Delivery Quote Queries
// =============================================================================

/**
 * Get a delivery quote by ID.
 */
export function useDeliveryQuote(quoteId: Id<"deliveryQuotes"> | undefined) {
  return useQuery(api.deliveryQuotes.get, quoteId ? { id: quoteId } : "skip");
}

/**
 * Get delivery quote for an order.
 */
export function useDeliveryQuoteByOrder(orderId: Id<"orders"> | undefined) {
  return useQuery(
    api.deliveryQuotes.getByOrder,
    orderId ? { orderId } : "skip"
  );
}

/**
 * Get delivery quote for a parcel.
 */
export function useDeliveryQuoteByParcel(parcelId: Id<"parcels"> | undefined) {
  return useQuery(
    api.deliveryQuotes.getByParcel,
    parcelId ? { parcelId } : "skip"
  );
}

// =============================================================================
// Delivery Quote Mutations
// =============================================================================

/**
 * Link a quote to an order.
 */
export function useLinkQuoteToOrder() {
  return useMutation(api.deliveryQuotes.linkToOrder);
}

/**
 * Link a quote to a parcel.
 */
export function useLinkQuoteToParcel() {
  return useMutation(api.deliveryQuotes.linkToParcel);
}

// =============================================================================
// Helper Types
// =============================================================================

export type DeliveryZone = NonNullable<ReturnType<typeof useDeliveryZone>>;
export type PricingRule = NonNullable<ReturnType<typeof usePricingRule>>;
export type DeliveryQuote = NonNullable<ReturnType<typeof useDeliveryQuote>>;

// =============================================================================
// Utilities
// =============================================================================

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format currency for display (UGX).
 */
export function formatCurrency(amount: number, currency = "UGX"): string {
  if (currency === "UGX") {
    return `UGX ${amount.toLocaleString()}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format days of week for display.
 */
export function formatDaysOfWeek(days?: number[]): string {
  if (!days || days.length === 0) return "All days";
  if (days.length === 7) return "All days";

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((d) => dayNames[d]).join(", ");
}

/**
 * Format hours range for display.
 */
export function formatHoursRange(start?: number, end?: number): string {
  if (start === undefined && end === undefined) return "All hours";
  const startStr = start !== undefined ? `${start}:00` : "00:00";
  const endStr = end !== undefined ? `${end}:00` : "23:59";
  return `${startStr} - ${endStr}`;
}

/**
 * Calculate estimated delivery fee.
 */
export function calculateDeliveryFee(
  distanceMeters: number,
  config: {
    baseFee: number;
    ratePerKm: number;
    minFee: number;
    surgeMultiplier: number;
  }
): number {
  const distanceKm = distanceMeters / 1000;
  const distanceFee = Math.round(distanceKm * config.ratePerKm);
  const subtotal = config.baseFee + distanceFee;
  const withSurge = Math.round(subtotal * config.surgeMultiplier);
  return Math.max(withSurge, config.minFee);
}
