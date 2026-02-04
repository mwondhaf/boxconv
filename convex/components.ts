/**
 * Convex Components Setup
 *
 * This file initializes and exports all installed Convex components
 * for use throughout the application.
 */

import { Crons } from "@convex-dev/crons";
import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { GeospatialIndex } from "@convex-dev/geospatial";
import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// =============================================================================
// GEOSPATIAL INDEX
// =============================================================================

/**
 * Geospatial index for location-based queries.
 * Used for:
 * - Finding nearby stores for customers
 * - Rider location tracking and assignment
 * - Delivery zone queries
 */
export const storeLocations = new GeospatialIndex<
  Id<"organizations">,
  { categoryId?: string; isOpen?: boolean }
>(components.geospatial);

// =============================================================================
// RATE LIMITER
// =============================================================================

/**
 * Rate limiter for protecting API endpoints.
 * Prevents abuse and ensures fair usage.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Order creation - prevent spam orders
  createOrder: {
    kind: "token bucket",
    rate: 10, // 10 orders per minute max
    period: MINUTE,
    capacity: 5, // Allow burst of 5
  },

  // Cart operations - generous but limited
  cartOperations: {
    kind: "token bucket",
    rate: 60, // 60 operations per minute
    period: MINUTE,
    capacity: 10,
  },

  // Address creation - prevent abuse
  createAddress: {
    kind: "fixed window",
    rate: 10, // 10 addresses per hour
    period: HOUR,
  },

  // Failed login attempts - security
  failedLogin: {
    kind: "token bucket",
    rate: 5, // 5 attempts per 15 minutes
    period: 15 * MINUTE,
    capacity: 5,
  },

  // SMS/OTP sending - prevent abuse
  sendOtp: {
    kind: "fixed window",
    rate: 5, // 5 OTPs per hour per phone
    period: HOUR,
  },

  // Push notifications - prevent spam
  sendNotification: {
    kind: "token bucket",
    rate: 100, // 100 per minute
    period: MINUTE,
    capacity: 20,
  },

  // Vendor variant creation
  createVariant: {
    kind: "fixed window",
    rate: 50, // 50 variants per hour
    period: HOUR,
  },

  // Store search - prevent scraping
  storeSearch: {
    kind: "token bucket",
    rate: 30, // 30 searches per minute
    period: MINUTE,
    capacity: 10,
  },

  // Generic API calls - catch-all
  apiCall: {
    kind: "token bucket",
    rate: 100,
    period: MINUTE,
    capacity: 20,
  },
});

// =============================================================================
// WORKFLOW MANAGER
// =============================================================================

/**
 * Workflow manager for durable, long-running processes.
 * Used for:
 * - Order processing workflows
 * - Payment processing
 * - Delivery assignment
 */
export const workflow = new WorkflowManager(components.workflow);

// =============================================================================
// CRONS (Scheduled Jobs)
// =============================================================================

/**
 * Cron scheduler for recurring tasks.
 * Used for:
 * - Cart expiration cleanup
 * - Daily reports
 * - Scheduled promotions
 */
export const crons = new Crons(components.crons);

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

/**
 * Expo push notifications for mobile app.
 * Used for:
 * - Order status updates
 * - Delivery notifications
 * - Promotional messages
 *
 * Note: The PushNotifications component uses string IDs for users.
 * We'll use clerkId as the user identifier.
 */
export const pushNotifications = new PushNotifications(
  components.pushNotifications
);

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
  | "cancelled"
  | "refunded";

export type NotificationType =
  | "order_confirmed"
  | "order_preparing"
  | "order_ready"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "new_order" // For vendors
  | "delivery_assigned" // For riders
  | "promotion";
