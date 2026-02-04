/**
 * Parcel Hooks for Admin Parcel Management
 *
 * Provides React Query hooks for:
 * - Fetching parcels (all, by customer, by status)
 * - Parcel status updates
 * - Parcel statistics
 * - Parcel actions (confirm, assign rider, cancel)
 */

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

// =============================================================================
// PARCEL QUERIES
// =============================================================================

/**
 * List all parcels (admin view)
 */
export function useParcels(options?: { status?: ParcelStatus; limit?: number }) {
  return useQuery(api.parcels.listAll, {
    status: options?.status,
    limit: options?.limit,
  })
}

/**
 * Get single parcel with full details
 */
export function useParcel(parcelId: Id<'parcels'> | undefined) {
  return useQuery(api.parcels.get, parcelId ? { id: parcelId } : 'skip')
}

/**
 * Get parcel by display ID
 */
export function useParcelByDisplayId(displayId: number | undefined) {
  return useQuery(
    api.parcels.getByDisplayId,
    displayId !== undefined ? { displayId } : 'skip'
  )
}

/**
 * List parcels for a specific customer
 */
export function useCustomerParcels(
  clerkId: string | undefined,
  options?: { status?: ParcelStatus; limit?: number }
) {
  return useQuery(
    api.parcels.listByCustomer,
    clerkId
      ? {
          clerkId,
          status: options?.status,
          limit: options?.limit,
        }
      : 'skip'
  )
}

/**
 * Get active parcels for a customer
 */
export function useActiveParcels(clerkId: string | undefined) {
  return useQuery(
    api.parcels.getActiveParcels,
    clerkId ? { clerkId } : 'skip'
  )
}

/**
 * Get parcel tracking info
 */
export function useParcelTracking(parcelId: Id<'parcels'> | undefined) {
  return useQuery(
    api.parcels.getTrackingInfo,
    parcelId ? { parcelId } : 'skip'
  )
}

/**
 * Get parcel statistics
 */
export function useParcelStats() {
  return useQuery(api.parcels.getStats, {})
}

/**
 * Get fare estimate for a parcel delivery
 */
export function useFareEstimate(params: {
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
  sizeCategory?: ParcelSizeCategory
  fragile?: boolean
}) {
  const hasAllParams =
    params.pickupLat !== undefined &&
    params.pickupLng !== undefined &&
    params.dropoffLat !== undefined &&
    params.dropoffLng !== undefined &&
    params.sizeCategory !== undefined &&
    params.fragile !== undefined

  return useQuery(
    api.parcels.getFareEstimate,
    hasAllParams
      ? {
          pickupLat: params.pickupLat!,
          pickupLng: params.pickupLng!,
          dropoffLat: params.dropoffLat!,
          dropoffLng: params.dropoffLng!,
          sizeCategory: params.sizeCategory!,
          fragile: params.fragile!,
        }
      : 'skip'
  )
}

// =============================================================================
// PARCEL EVENT QUERIES
// =============================================================================

/**
 * Get parcel events/timeline
 */
export function useParcelEvents(parcelId: Id<'parcels'> | undefined) {
  return useQuery(
    api.parcelEvents.listByParcel,
    parcelId ? { parcelId } : 'skip'
  )
}

/**
 * Get parcel timeline (formatted for display)
 */
export function useParcelTimeline(parcelId: Id<'parcels'> | undefined) {
  return useQuery(
    api.parcelEvents.getTimeline,
    parcelId ? { parcelId } : 'skip'
  )
}

// =============================================================================
// PARCEL MUTATIONS
// =============================================================================

/**
 * Create a new parcel
 */
export function useCreateParcel() {
  return useMutation(api.parcels.create)
}

/**
 * Update parcel status
 */
export function useUpdateParcelStatus() {
  return useMutation(api.parcels.updateStatus)
}

/**
 * Mark parcel as failed
 */
export function useMarkParcelFailed() {
  return useMutation(api.parcels.markFailed)
}

/**
 * Assign rider to parcel
 */
export function useAssignRiderToParcel() {
  return useMutation(api.parcels.assignRider)
}

/**
 * Mark parcel as picked up
 */
export function useMarkParcelPickedUp() {
  return useMutation(api.parcels.markPickedUp)
}

/**
 * Mark parcel as in transit
 */
export function useMarkParcelInTransit() {
  return useMutation(api.parcels.markInTransit)
}

/**
 * Mark parcel as delivered
 */
export function useMarkParcelDelivered() {
  return useMutation(api.parcels.markDelivered)
}

/**
 * Cancel a parcel
 */
export function useCancelParcel() {
  return useMutation(api.parcels.cancel)
}

/**
 * Update payment status
 */
export function useUpdateParcelPayment() {
  return useMutation(api.parcels.updatePaymentStatus)
}

/**
 * Regenerate verification codes
 */
export function useRegenerateParcelCodes() {
  return useMutation(api.parcels.regenerateCodes)
}

/**
 * Add note to parcel
 */
export function useAddParcelNote() {
  return useMutation(api.parcelEvents.addNote)
}

// =============================================================================
// TYPES
// =============================================================================

export type ParcelStatus =
  | 'draft'
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'canceled'
  | 'failed'

export type ParcelSizeCategory = 'small' | 'medium' | 'large' | 'extra_large'

export type ParcelPaymentStatus = 'pending' | 'paid' | 'refunded'

// =============================================================================
// STATUS UTILITIES
// =============================================================================

export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  canceled: 'Cancelled',
  failed: 'Failed',
}

export const PARCEL_STATUS_COLORS: Record<
  ParcelStatus,
  { bg: string; text: string; dot: string }
> = {
  draft: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    dot: 'bg-gray-500',
  },
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
  picked_up: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
  },
  in_transit: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    dot: 'bg-cyan-500',
  },
  delivered: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  canceled: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  failed: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
}

export const PARCEL_SIZE_LABELS: Record<ParcelSizeCategory, string> = {
  small: 'Small (Documents)',
  medium: 'Medium (up to 5kg)',
  large: 'Large (up to 15kg)',
  extra_large: 'Extra Large (15kg+)',
}

export const PARCEL_SIZE_ICONS: Record<ParcelSizeCategory, string> = {
  small: '📄',
  medium: '📦',
  large: '📦📦',
  extra_large: '🏋️',
}

export const PAYMENT_STATUS_LABELS: Record<ParcelPaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  refunded: 'Refunded',
}

export const PAYMENT_STATUS_COLORS: Record<
  ParcelPaymentStatus,
  { bg: string; text: string }
> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  paid: { bg: 'bg-green-100', text: 'text-green-800' },
  refunded: { bg: 'bg-gray-100', text: 'text-gray-800' },
}

/**
 * Get the next valid status for a parcel
 */
export function getNextParcelStatuses(
  currentStatus: ParcelStatus
): ParcelStatus[] {
  const transitions: Record<ParcelStatus, ParcelStatus[]> = {
    draft: ['pending', 'canceled'],
    pending: ['picked_up', 'canceled', 'failed'],
    picked_up: ['in_transit', 'canceled', 'failed'],
    in_transit: ['delivered', 'canceled', 'failed'],
    delivered: [],
    canceled: [],
    failed: [],
  }

  return transitions[currentStatus] ?? []
}

/**
 * Check if a parcel can be cancelled
 */
export function canCancelParcel(status: ParcelStatus): boolean {
  const cancellableStatuses: ParcelStatus[] = [
    'draft',
    'pending',
    'picked_up',
    'in_transit',
  ]
  return cancellableStatuses.includes(status)
}

/**
 * Check if a parcel is active (in progress)
 */
export function isParcelActive(status: ParcelStatus): boolean {
  const activeStatuses: ParcelStatus[] = [
    'draft',
    'pending',
    'picked_up',
    'in_transit',
  ]
  return activeStatuses.includes(status)
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = 'UGX'
): string {
  if (currency === 'UGX') {
    return `UGX ${amount.toLocaleString()}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format distance
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}
