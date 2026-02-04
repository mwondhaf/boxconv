/**
 * Order Status Badge Component
 *
 * Displays the current status of an order with appropriate styling
 */

import { cn } from '~/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'canceled'
  | 'refunded'

export interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  preparing: {
    label: 'Preparing',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
  },
  ready_for_pickup: {
    label: 'Ready',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    dot: 'bg-cyan-500',
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  canceled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  refunded: {
    label: 'Refunded',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    dot: 'bg-gray-500',
  },
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

const DOT_SIZE_CLASSES = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrderStatusBadge({
  status,
  size = 'md',
  showDot = true,
  className,
}: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        config.bg,
        config.text,
        SIZE_CLASSES[size],
        className
      )}
    >
      {showDot && (
        <span
          className={cn('rounded-full', config.dot, DOT_SIZE_CLASSES[size])}
        />
      )}
      {config.label}
    </span>
  )
}

// =============================================================================
// FULFILLMENT TYPE BADGE
// =============================================================================

export type FulfillmentType = 'delivery' | 'pickup' | 'self_delivery'

export interface FulfillmentTypeBadgeProps {
  type: FulfillmentType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const FULFILLMENT_CONFIG: Record<
  FulfillmentType,
  { label: string; icon: string; bg: string; text: string }
> = {
  delivery: {
    label: 'Delivery',
    icon: '🚴',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  pickup: {
    label: 'Pickup',
    icon: '🏪',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  self_delivery: {
    label: 'Self Delivery',
    icon: '🚗',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
  },
}

export function FulfillmentTypeBadge({
  type,
  size = 'md',
  className,
}: FulfillmentTypeBadgeProps) {
  const config = FULFILLMENT_CONFIG[type] ?? FULFILLMENT_CONFIG.delivery

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        config.bg,
        config.text,
        SIZE_CLASSES[size],
        className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}

// =============================================================================
// PAYMENT STATUS BADGE
// =============================================================================

export type PaymentStatus = 'awaiting' | 'captured' | 'refunded' | 'canceled'

export interface PaymentStatusBadgeProps {
  status: PaymentStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const PAYMENT_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string }
> = {
  awaiting: {
    label: 'Awaiting Payment',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
  },
  captured: {
    label: 'Paid',
    bg: 'bg-green-50',
    text: 'text-green-700',
  },
  refunded: {
    label: 'Refunded',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
  },
  canceled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
  },
}

export function PaymentStatusBadge({
  status,
  size = 'md',
  className,
}: PaymentStatusBadgeProps) {
  const config = PAYMENT_CONFIG[status] ?? PAYMENT_CONFIG.awaiting

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        config.bg,
        config.text,
        SIZE_CLASSES[size],
        className
      )}
    >
      {config.label}
    </span>
  )
}
