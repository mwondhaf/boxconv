/**
 * Parcels Table Component
 *
 * Displays a table of parcel deliveries with sorting, filtering, and actions.
 * Used in admin parcels page for managing P2P deliveries.
 */

'use client'

import * as React from 'react'
import {
  Package,
  MapPin,

  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  ArrowUpDown,
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

import {
  ParcelStatusBadge,
  ParcelPaymentBadge,
  ParcelSizeBadge,
  type ParcelStatus,
  type ParcelPaymentStatus,
  type ParcelSizeCategory,
} from './parcel-status-badge'
import {
  formatCurrency,
  formatRelativeTime,
  formatDistance,
} from '../hooks/use-parcels'

import type { Id } from '../../../../convex/_generated/dataModel'

// =============================================================================
// TYPES
// =============================================================================

export interface Parcel {
  _id: Id<'parcels'>
  _creationTime: number
  displayId: number
  senderClerkId: string
  // Pickup
  pickupName: string
  pickupPhone: string
  pickupAddress: string
  // Dropoff
  recipientName: string
  recipientPhone: string
  dropoffAddress: string
  // Package
  description: string
  sizeCategory: ParcelSizeCategory
  fragile: boolean
  // Status - matches schema: draft, pending, picked_up, in_transit, delivered, canceled, failed
  status: ParcelStatus
  paymentStatus: ParcelPaymentStatus
  // Rider
  externalRiderName?: string
  // Pricing
  estimatedDistance?: number
  priceAmount?: number
  priceCurrency: string
  // Timestamps
  pickedUpAt?: number
  deliveredAt?: number
}

export interface ParcelsTableProps {
  data: Parcel[]
  isLoading?: boolean
  onView?: (parcel: Parcel) => void
  onConfirm?: (parcel: Parcel) => void
  onCancel?: (parcel: Parcel) => void
  onAssignRider?: (parcel: Parcel) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ParcelsTable({
  data,
  isLoading = false,
  onView,
  onConfirm,
  onCancel,
  onAssignRider,
}: ParcelsTableProps) {
  const [sortField, setSortField] = React.useState<string>('_creationTime')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')

  // Sort data
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue: any = a[sortField as keyof Parcel]
      let bValue: any = b[sortField as keyof Parcel]

      // Handle undefined values
      if (aValue === undefined) aValue = ''
      if (bValue === undefined) bValue = ''

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Handle strings
      const comparison = String(aValue).localeCompare(String(bValue))
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortableHeader = ({
    field,
    children,
  }: {
    field: string
    children: React.ReactNode
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No parcels found</h3>
        <p className="text-sm text-muted-foreground">
          Parcel deliveries will appear here when customers create them.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">
              <SortableHeader field="displayId">ID</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="status">Status</SortableHeader>
            </TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>Dropoff</TableHead>
            <TableHead>
              <SortableHeader field="sizeCategory">Package</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="priceAmount">Fare</SortableHeader>
            </TableHead>
            <TableHead>Rider</TableHead>
            <TableHead>
              <SortableHeader field="_creationTime">Created</SortableHeader>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((parcel) => (
            <TableRow
              key={parcel._id}
              className={cn(
                'cursor-pointer hover:bg-muted/50',
                (parcel.status === 'canceled' || parcel.status === 'failed') && 'opacity-60'
              )}
              onClick={() => onView?.(parcel)}
            >
              <TableCell className="font-medium">
                #{parcel.displayId}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <ParcelStatusBadge status={parcel.status as ParcelStatus} size="sm" />
                  <ParcelPaymentBadge
                    status={parcel.paymentStatus as ParcelPaymentStatus}
                    size="sm"
                    showIcon={false}
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <MapPin className="size-3 text-blue-500" />
                    {parcel.pickupName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {parcel.pickupAddress}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <MapPin className="size-3 text-green-500" />
                    {parcel.recipientName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {parcel.dropoffAddress}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <ParcelSizeBadge size={parcel.sizeCategory as ParcelSizeCategory} variant="short" />
                  {parcel.fragile && (
                    <span className="text-xs text-destructive block">
                      ⚠️ Fragile
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {parcel.priceAmount
                      ? formatCurrency(parcel.priceAmount, parcel.priceCurrency)
                      : '—'}
                  </div>
                  {parcel.estimatedDistance && (
                    <div className="text-xs text-muted-foreground">
                      {formatDistance(parcel.estimatedDistance)}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {parcel.externalRiderName ? (
                  <div className="flex items-center gap-1 text-sm">
                    <Truck className="size-3" />
                    {parcel.externalRiderName}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Not assigned
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {formatRelativeTime(parcel._creationTime)}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onView?.(parcel)}>
                      <Eye className="mr-2 size-4" />
                      View Details
                    </DropdownMenuItem>
                    {(parcel.status === 'draft' || parcel.status === 'pending') && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onConfirm?.(parcel)
                        }}
                      >
                        <CheckCircle className="mr-2 size-4" />
                        {parcel.status === 'draft' ? 'Confirm' : 'View Details'}
                      </DropdownMenuItem>
                    )}
                    {(parcel.status === 'draft' || parcel.status === 'pending') && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onAssignRider?.(parcel)
                        }}
                      >
                        <Truck className="mr-2 size-4" />
                        Assign Rider
                      </DropdownMenuItem>
                    )}
                    {!['delivered', 'canceled', 'failed'].includes(parcel.status) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCancel?.(parcel)
                          }}
                        >
                          <XCircle className="mr-2 size-4" />
                          Cancel
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { ParcelStatus, ParcelPaymentStatus, ParcelSizeCategory }
