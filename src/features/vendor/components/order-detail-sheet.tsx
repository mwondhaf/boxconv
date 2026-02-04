/**
 * Vendor Order Detail Sheet
 *
 * Displays full order details and provides actions for vendors to:
 * - Confirm/reject orders
 * - Update order status
 * - Assign riders
 * - View order timeline
 */

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import {
  OrderStatusBadge,
  FulfillmentTypeBadge,
  PaymentStatusBadge,
} from '~/components/orders/order-status-badge'
import type { OrderStatus, FulfillmentType, PaymentStatus } from '~/components/orders/order-status-badge'

// =============================================================================
// TYPES
// =============================================================================

export interface OrderDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: {
    _id: Id<'orders'>
    displayId: number
    status: OrderStatus
    fulfillmentStatus?: string
    paymentStatus?: PaymentStatus
    fulfillmentType?: FulfillmentType
    total: number
    taxTotal: number
    discountTotal: number
    deliveryTotal: number
    currencyCode: string
    customerClerkId: string
    riderId?: string
    riderName?: string
    riderPhone?: string
    _creationTime: number
    items?: Array<{
      title: string
      quantity: number
      unitPrice: number
      subtotal: number
    }>
    itemCount?: number
    deliveryAddress?: {
      name?: string
      phone?: string
      address?: string
    } | null
    organization?: {
      name?: string
    } | null
    timeline?: Array<{
      eventType: string
      status?: string
      reason?: string
      timestamp: number
    }>
  } | null
  actorClerkId: string
  onlineRiders?: Array<{
    clerkId: string
    distanceKm?: number
  }>
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrderDetailSheet({
  open,
  onOpenChange,
  order,
  actorClerkId,
  onlineRiders = [],
}: OrderDetailSheetProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [riderName, setRiderName] = useState('')
  const [riderPhone, setRiderPhone] = useState('')

  const confirmOrder = useMutation(api.orders.confirm)
  const startPreparing = useMutation(api.orders.startPreparing)
  const markReady = useMutation(api.orders.markReady)
  const assignRider = useMutation(api.riders.assignToOrder)
  const cancelOrder = useMutation(api.orders.cancel)

  if (!order) return null

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await confirmOrder({
        orderId: order._id,
        actorClerkId,
      })
    } catch (error) {
      console.error('Failed to confirm order:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleStartPreparing = async () => {
    try {
      await startPreparing({
        orderId: order._id,
        actorClerkId,
      })
    } catch (error) {
      console.error('Failed to start preparing:', error)
    }
  }

  const handleMarkReady = async () => {
    try {
      await markReady({
        orderId: order._id,
        actorClerkId,
      })
    } catch (error) {
      console.error('Failed to mark ready:', error)
    }
  }

  const handleAssignRider = async () => {
    if (!riderName) return
    try {
      await assignRider({
        orderId: order._id,
        riderId: selectedRiderId || `manual-${Date.now()}`,
        riderName,
        riderPhone: riderPhone || undefined,
        actorClerkId,
      })
      setSelectedRiderId('')
      setRiderName('')
      setRiderPhone('')
    } catch (error) {
      console.error('Failed to assign rider:', error)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason) return
    setIsCancelling(true)
    try {
      await cancelOrder({
        orderId: order._id,
        actorClerkId,
        reason: cancelReason,
        isCustomer: false,
      })
      setShowCancelForm(false)
      setCancelReason('')
    } catch (error) {
      console.error('Failed to cancel order:', error)
    } finally {
      setIsCancelling(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (order.currencyCode === 'UGX') {
      return `UGX ${amount.toLocaleString()}`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currencyCode,
    }).format(amount)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const canConfirm = order.status === 'pending'
  const canPrepare = order.status === 'confirmed'
  const canMarkReady = order.status === 'preparing'
  const canAssignRider =
    order.status === 'ready_for_pickup' &&
    order.fulfillmentType === 'delivery' &&
    !order.riderId
  const canCancel = ['pending', 'confirmed', 'preparing'].includes(order.status)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Order #{order.displayId}
            <OrderStatusBadge status={order.status} size="sm" />
          </SheetTitle>
          <SheetDescription>
            Created {formatTime(order._creationTime)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {order.fulfillmentType && (
              <FulfillmentTypeBadge type={order.fulfillmentType} size="sm" />
            )}
            {order.paymentStatus && (
              <PaymentStatusBadge status={order.paymentStatus} size="sm" />
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {canConfirm && (
              <Button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="w-full"
              >
                {isConfirming ? 'Confirming...' : 'Confirm Order'}
              </Button>
            )}

            {canPrepare && (
              <Button onClick={handleStartPreparing} className="w-full">
                Start Preparing
              </Button>
            )}

            {canMarkReady && (
              <Button onClick={handleMarkReady} className="w-full">
                Mark as Ready
              </Button>
            )}

            {canAssignRider && (
              <div className="space-y-2 p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Assign Rider</h4>
                <input
                  type="text"
                  placeholder="Rider Name *"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                <input
                  type="text"
                  placeholder="Rider Phone"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                {onlineRiders.length > 0 && (
                  <select
                    value={selectedRiderId}
                    onChange={(e) => setSelectedRiderId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select online rider...</option>
                    {onlineRiders.map((rider) => (
                      <option key={rider.clerkId} value={rider.clerkId}>
                        {rider.clerkId}{' '}
                        {rider.distanceKm ? `(${rider.distanceKm}km away)` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  onClick={handleAssignRider}
                  disabled={!riderName}
                  size="sm"
                  className="w-full"
                >
                  Assign & Dispatch
                </Button>
              </div>
            )}

            {order.riderId && (
              <div className="p-3 bg-cyan-50 rounded-lg">
                <h4 className="font-medium text-sm text-cyan-800">
                  Rider Assigned
                </h4>
                <p className="text-sm text-cyan-700">
                  {order.riderName}
                  {order.riderPhone && ` • ${order.riderPhone}`}
                </p>
              </div>
            )}

            {canCancel && !showCancelForm && (
              <Button
                variant="outline"
                onClick={() => setShowCancelForm(true)}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Cancel Order
              </Button>
            )}

            {showCancelForm && (
              <div className="space-y-2 p-3 border border-red-200 rounded-lg bg-red-50">
                <h4 className="font-medium text-sm text-red-800">
                  Cancel Order
                </h4>
                <textarea
                  placeholder="Reason for cancellation *"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCancelForm(false)
                      setCancelReason('')
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={!cancelReason || isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <>
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-2">
                  Delivery To
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium">{order.deliveryAddress.name}</p>
                  {order.deliveryAddress.phone && (
                    <p className="text-sm text-gray-600">
                      {order.deliveryAddress.phone}
                    </p>
                  )}
                  {order.deliveryAddress.address && (
                    <p className="text-sm text-gray-600 mt-1">
                      {order.deliveryAddress.address}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Order Items */}
          <div>
            <h3 className="font-medium text-sm text-gray-500 mb-2">
              Order Items ({order.itemCount ?? order.items?.length ?? 0})
            </h3>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-sm">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>
                {formatCurrency(
                  order.total -
                    order.taxTotal +
                    order.discountTotal -
                    order.deliveryTotal
                )}
              </span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-green-600">
                  -{formatCurrency(order.discountTotal)}
                </span>
              </div>
            )}
            {order.deliveryTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery</span>
                <span>{formatCurrency(order.deliveryTotal)}</span>
              </div>
            )}
            {order.taxTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>{formatCurrency(order.taxTotal)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-3">
                  Order Timeline
                </h3>
                <div className="space-y-3">
                  {order.timeline.map((event, index) => (
                    <div key={index} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {event.eventType.replace(/_/g, ' ')}
                          {event.status && ` → ${event.status.replace(/_/g, ' ')}`}
                        </p>
                        {event.reason && (
                          <p className="text-gray-500 text-xs">{event.reason}</p>
                        )}
                        <p className="text-gray-400 text-xs">
                          {formatTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
