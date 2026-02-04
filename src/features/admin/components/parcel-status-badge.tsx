/**
 * Parcel Status Badge Component
 *
 * Displays parcel status with appropriate colors and icons.
 * Used in parcel tables, detail views, and tracking UI.
 */

import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import {
  Package,
  PackageCheck,
  Truck,
  PackageOpen,
  XCircle,
  Clock,
  CreditCard,
  RefreshCw,
} from 'lucide-react'

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

export type ParcelPaymentStatus = 'pending' | 'paid' | 'refunded'

export type ParcelSizeCategory = 'small' | 'medium' | 'large' | 'extra_large'

// =============================================================================
// CONFIGURATION
// =============================================================================

const STATUS_CONFIG: Record<
  ParcelStatus,
  {
    label: string
    bgColor: string
    textColor: string
    borderColor: string
    icon: typeof Package
  }
> = {
  draft: {
    label: 'Draft',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: Package,
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: Clock,
  },
  picked_up: {
    label: 'Picked Up',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    icon: PackageCheck,
  },
  in_transit: {
    label: 'In Transit',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: PackageOpen,
  },
  canceled: {
    label: 'Cancelled',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: XCircle,
  },
}

const PAYMENT_CONFIG: Record<
  ParcelPaymentStatus,
  {
    label: string
    bgColor: string
    textColor: string
    borderColor: string
    icon: typeof CreditCard
  }
> = {
  pending: {
    label: 'Unpaid',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: Clock,
  },
  paid: {
    label: 'Paid',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: CreditCard,
  },
  refunded: {
    label: 'Refunded',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: RefreshCw,
  },
}

const SIZE_CONFIG: Record<
  ParcelSizeCategory,
  {
    label: string
    shortLabel: string
    description: string
  }
> = {
  small: {
    label: 'Small',
    shortLabel: 'S',
    description: 'Documents, small items',
  },
  medium: {
    label: 'Medium',
    shortLabel: 'M',
    description: 'Up to 5kg',
  },
  large: {
    label: 'Large',
    shortLabel: 'L',
    description: 'Up to 15kg',
  },
  extra_large: {
    label: 'Extra Large',
    shortLabel: 'XL',
    description: '15kg+',
  },
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface ParcelStatusBadgeProps {
  status: ParcelStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ParcelStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: ParcelStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSizes = {
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  )
}

interface ParcelPaymentBadgeProps {
  status: ParcelPaymentStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ParcelPaymentBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: ParcelPaymentBadgeProps) {
  const config = PAYMENT_CONFIG[status] ?? PAYMENT_CONFIG.pending
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSizes = {
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  )
}

interface ParcelSizeBadgeProps {
  size: ParcelSizeCategory
  variant?: 'full' | 'short'
  showDescription?: boolean
  className?: string
}

export function ParcelSizeBadge({
  size,
  variant = 'full',
  showDescription = false,
  className,
}: ParcelSizeBadgeProps) {
  const config = SIZE_CONFIG[size] ?? SIZE_CONFIG.small

  return (
    <Badge
      variant="secondary"
      className={cn('font-medium', className)}
      title={config.description}
    >
      <Package className="size-3 mr-1" />
      {variant === 'full' ? config.label : config.shortLabel}
      {showDescription && (
        <span className="ml-1 text-muted-foreground font-normal">
          ({config.description})
        </span>
      )}
    </Badge>
  )
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export const getStatusLabel = (status: ParcelStatus): string =>
  STATUS_CONFIG[status]?.label ?? status

export const getPaymentLabel = (status: ParcelPaymentStatus): string =>
  PAYMENT_CONFIG[status]?.label ?? status

export const getSizeLabel = (size: ParcelSizeCategory): string =>
  SIZE_CONFIG[size]?.label ?? size

export const getSizeDescription = (size: ParcelSizeCategory): string =>
  SIZE_CONFIG[size]?.description ?? ''
