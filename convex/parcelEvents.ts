/**
 * Parcel Events Module - Audit Logging for Parcel Status Changes
 *
 * This module handles all parcel event tracking:
 * - Status change logging
 * - Event history queries
 * - Timeline generation
 *
 * Events are automatically created by the parcels module,
 * but this module provides additional query capabilities.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all events for a parcel
 */
export const listByParcel = query({
  args: {
    parcelId: v.id("parcels"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcel", (q) => q.eq("parcelId", args.parcelId))
      .collect();

    return events.sort((a, b) => a._creationTime - b._creationTime);
  },
});

/**
 * Get the latest event for a parcel
 */
export const getLatest = query({
  args: {
    parcelId: v.id("parcels"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcel", (q) => q.eq("parcelId", args.parcelId))
      .order("desc")
      .first();

    return events;
  },
});

/**
 * Get parcel timeline (formatted for display)
 */
export const getTimeline = query({
  args: {
    parcelId: v.id("parcels"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcel", (q) => q.eq("parcelId", args.parcelId))
      .collect();

    // Sort chronologically
    const sortedEvents = events.sort(
      (a, b) => a._creationTime - b._creationTime
    );

    // Format for timeline display
    return sortedEvents.map((event) => ({
      id: event._id,
      eventType: event.eventType,
      status: event.status,
      description: event.description ?? getDefaultDescription(event.eventType),
      timestamp: event._creationTime,
      formattedTime: formatTimestamp(event._creationTime),
      actorId: event.clerkId,
      metadata: event.metadata,
    }));
  },
});

/**
 * Get event counts by type for a parcel
 */
export const getEventCounts = query({
  args: {
    parcelId: v.id("parcels"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcel", (q) => q.eq("parcelId", args.parcelId))
      .collect();

    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
    }

    return counts;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Log a parcel event
 * This is primarily called internally by the parcels module,
 * but can also be used for custom events.
 */
export const log = mutation({
  args: {
    parcelId: v.id("parcels"),
    eventType: v.string(),
    status: v.optional(v.string()),
    description: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: args.eventType,
      status: args.status,
      description: args.description,
      clerkId: args.clerkId,
      metadata: args.metadata,
    });

    return eventId;
  },
});

/**
 * Log a note/comment on a parcel
 */
export const addNote = mutation({
  args: {
    parcelId: v.id("parcels"),
    note: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current parcel status
    const parcel = await ctx.db.get(args.parcelId);
    if (!parcel) {
      throw new Error("Parcel not found");
    }

    const eventId = await ctx.db.insert("parcelEvents", {
      parcelId: args.parcelId,
      eventType: "note_added",
      status: parcel.status,
      description: args.note,
      clerkId: args.clerkId,
    });

    return eventId;
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get default description for an event type
 */
function getDefaultDescription(eventType: string): string {
  const descriptions: Record<string, string> = {
    created: "Parcel delivery request created",
    confirmed: "Delivery request confirmed",
    rider_assigned: "Rider assigned to delivery",
    picked_up: "Parcel picked up from sender",
    in_transit: "Parcel is in transit",
    delivered: "Parcel delivered to recipient",
    cancelled: "Delivery cancelled",
    status_changed: "Status updated",
    payment_updated: "Payment status updated",
    codes_regenerated: "Verification codes regenerated",
    note_added: "Note added",
  };

  return descriptions[eventType] ?? "Event recorded";
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  // Within last hour
  if (diffMins < 60) {
    if (diffMins < 1) return "Just now";
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  }

  // Within last 24 hours
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  // Within last 7 days
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  // Older - show full date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

// =============================================================================
// TYPES
// =============================================================================

export type ParcelEventType =
  | "created"
  | "confirmed"
  | "rider_assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "status_changed"
  | "payment_updated"
  | "codes_regenerated"
  | "note_added";

export const PARCEL_EVENT_ICONS: Record<ParcelEventType, string> = {
  created: "📦",
  confirmed: "✅",
  rider_assigned: "🚴",
  picked_up: "📤",
  in_transit: "🚚",
  delivered: "📬",
  cancelled: "❌",
  status_changed: "🔄",
  payment_updated: "💳",
  codes_regenerated: "🔑",
  note_added: "📝",
};

export const PARCEL_EVENT_COLORS: Record<
  ParcelEventType,
  { bg: string; text: string; dot: string }
> = {
  created: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  confirmed: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  rider_assigned: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  picked_up: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  in_transit: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  delivered: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  status_changed: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    dot: "bg-gray-500",
  },
  payment_updated: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  codes_regenerated: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  note_added: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
};
