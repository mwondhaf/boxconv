/**
 * Order Hooks for Vendor and Admin Order Management
 *
 * Provides React Query hooks for:
 * - Fetching orders (by organization, by customer)
 * - Order status updates
 * - Order statistics
 * - Order actions (confirm, prepare, ready, deliver, cancel)
 */

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// ORDER QUERIES - VENDOR
// =============================================================================

/**
 * List orders for a vendor organization with optional filtering
 */
export function useOrganizationOrders(
  organizationId: Id<"organizations"> | undefined,
  options?: {
    status?: string;
    limit?: number;
  }
) {
  return useQuery(
    api.orders.listByOrganization,
    organizationId
      ? {
          organizationId,
          status: options?.status as any,
          limit: options?.limit,
        }
      : "skip"
  );
}

/**
 * Get pending orders count for vendor dashboard
 */
export function usePendingOrdersCount(
  organizationId: Id<"organizations"> | undefined
) {
  return useQuery(
    api.orders.getPendingOrdersCount,
    organizationId ? { organizationId } : "skip"
  );
}

/**
 * Get today's order summary for vendor dashboard
 */
export function useTodaysSummary(
  organizationId: Id<"organizations"> | undefined
) {
  return useQuery(
    api.orders.getTodaysSummary,
    organizationId ? { organizationId } : "skip"
  );
}

/**
 * Get single order with full details
 */
export function useOrder(orderId: Id<"orders"> | undefined) {
  return useQuery(api.orders.get, orderId ? { id: orderId } : "skip");
}

/**
 * Get order by display ID
 */
export function useOrderByDisplayId(displayId: number | undefined) {
  return useQuery(
    api.orders.getByDisplayId,
    displayId !== undefined ? { displayId } : "skip"
  );
}

/**
 * Get order tracking info
 */
export function useOrderTracking(orderId: Id<"orders"> | undefined) {
  return useQuery(api.orders.getTrackingInfo, orderId ? { orderId } : "skip");
}

// =============================================================================
// ORDER QUERIES - CUSTOMER
// =============================================================================

/**
 * List orders for a customer
 */
export function useCustomerOrders(
  clerkId: string | undefined,
  options?: {
    status?: string;
    limit?: number;
  }
) {
  return useQuery(
    api.orders.listByCustomer,
    clerkId
      ? {
          clerkId,
          status: options?.status as any,
          limit: options?.limit,
        }
      : "skip"
  );
}

/**
 * Get active orders for a customer
 */
export function useActiveOrders(clerkId: string | undefined) {
  return useQuery(api.orders.getActiveOrders, clerkId ? { clerkId } : "skip");
}

// =============================================================================
// ORDER MUTATIONS - STATUS UPDATES
// =============================================================================

/**
 * Confirm an order (vendor accepts)
 */
export function useConfirmOrder() {
  return useMutation(api.orders.confirm);
}

/**
 * Start preparing an order
 */
export function useStartPreparing() {
  return useMutation(api.orders.startPreparing);
}

/**
 * Mark order as ready for pickup/delivery
 */
export function useMarkReady() {
  return useMutation(api.orders.markReady);
}

/**
 * Mark order as delivered
 */
export function useMarkDelivered() {
  return useMutation(api.orders.markDelivered);
}

/**
 * Cancel an order
 */
export function useCancelOrder() {
  return useMutation(api.orders.cancel);
}

/**
 * Generic status update
 */
export function useUpdateOrderStatus() {
  return useMutation(api.orders.updateStatus);
}

/**
 * Assign rider and dispatch order
 */
export function useAssignRiderAndDispatch() {
  return useMutation(api.orders.assignRiderAndDispatch);
}

// =============================================================================
// RIDER QUERIES
// =============================================================================

/**
 * List online riders for vendor to assign
 */
export function useOnlineRiders(storeLocation?: { lat: number; lng: number }) {
  return useQuery(api.riders.listOnlineRiders, {
    storeLat: storeLocation?.lat,
    storeLng: storeLocation?.lng,
  });
}

/**
 * Assign rider to order (vendor action)
 */
export function useAssignRider() {
  return useMutation(api.riders.assignToOrder);
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "canceled"
  | "refunded";

export type FulfillmentType = "delivery" | "pickup" | "self_delivery";

export type PaymentStatus = "awaiting" | "captured" | "refunded" | "canceled";

export type FulfillmentStatus =
  | "not_fulfilled"
  | "fulfilled"
  | "shipped"
  | "returned";

// =============================================================================
// STATUS UTILITIES
// =============================================================================

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  refunded: "Refunded",
};

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  { bg: string; text: string; dot: string }
> = {
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  confirmed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  preparing: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  ready_for_pickup: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  out_for_delivery: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    dot: "bg-cyan-500",
  },
  delivered: {
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  canceled: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  refunded: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    dot: "bg-gray-500",
  },
};

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  self_delivery: "Self Delivery",
};

export const FULFILLMENT_TYPE_ICONS: Record<FulfillmentType, string> = {
  delivery: "🚴",
  pickup: "🏪",
  self_delivery: "🚗",
};

/**
 * Get the next valid status for an order
 */
export function getNextOrderStatuses(
  currentStatus: OrderStatus
): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["out_for_delivery", "delivered", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: ["completed", "refunded"],
    completed: ["refunded"],
    cancelled: [],
    canceled: [],
    refunded: [],
  };

  return transitions[currentStatus] ?? [];
}

/**
 * Check if an order can be cancelled
 */
export function canCancelOrder(status: OrderStatus): boolean {
  const cancellableStatuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
  ];
  return cancellableStatuses.includes(status);
}

/**
 * Check if an order is active (in progress)
 */
export function isOrderActive(status: OrderStatus): boolean {
  const activeStatuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
  ];
  return activeStatuses.includes(status);
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = "UGX"): string {
  if (currency === "UGX") {
    return `UGX ${amount.toLocaleString()}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
