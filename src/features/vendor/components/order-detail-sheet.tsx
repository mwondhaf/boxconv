/**
 * Vendor Order Detail Sheet
 *
 * Displays full order details and provides actions for vendors to:
 * - Confirm/reject orders
 * - Update order status
 * - Assign riders
 * - View order timeline
 */

import { useMutation } from "convex/react";
import { useState } from "react";
import type {
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
} from "~/components/orders/order-status-badge";
import {
  FulfillmentTypeBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "~/components/orders/order-status-badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// TYPES
// =============================================================================

export interface OrderDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    _id: Id<"orders">;
    displayId: number;
    status: OrderStatus;
    fulfillmentStatus?: string;
    paymentStatus?: PaymentStatus;
    fulfillmentType?: FulfillmentType;
    total: number;
    taxTotal: number;
    discountTotal: number;
    deliveryTotal: number;
    currencyCode: string;
    customerClerkId: string;
    riderId?: string;
    riderName?: string;
    riderPhone?: string;
    _creationTime: number;
    items?: Array<{
      title: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
    itemCount?: number;
    deliveryAddress?: {
      name?: string;
      phone?: string;
      address?: string;
    } | null;
    organization?: {
      name?: string;
    } | null;
    timeline?: Array<{
      eventType: string;
      status?: string;
      reason?: string;
      timestamp: number;
    }>;
  } | null;
  actorClerkId: string;
  onlineRiders?: Array<{
    clerkId: string;
    distanceKm?: number;
  }>;
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");

  const confirmOrder = useMutation(api.orders.confirm);
  const startPreparing = useMutation(api.orders.startPreparing);
  const markReady = useMutation(api.orders.markReady);
  const assignRider = useMutation(api.riders.assignToOrder);
  const cancelOrder = useMutation(api.orders.cancel);

  if (!order) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmOrder({
        orderId: order._id,
        actorClerkId,
      });
    } catch (error) {
      console.error("Failed to confirm order:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleStartPreparing = async () => {
    try {
      await startPreparing({
        orderId: order._id,
        actorClerkId,
      });
    } catch (error) {
      console.error("Failed to start preparing:", error);
    }
  };

  const handleMarkReady = async () => {
    try {
      await markReady({
        orderId: order._id,
        actorClerkId,
      });
    } catch (error) {
      console.error("Failed to mark ready:", error);
    }
  };

  const handleAssignRider = async () => {
    if (!riderName) return;
    try {
      await assignRider({
        orderId: order._id,
        riderId: selectedRiderId || `manual-${Date.now()}`,
        riderName,
        riderPhone: riderPhone || undefined,
        actorClerkId,
      });
      setSelectedRiderId("");
      setRiderName("");
      setRiderPhone("");
    } catch (error) {
      console.error("Failed to assign rider:", error);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) return;
    setIsCancelling(true);
    try {
      await cancelOrder({
        orderId: order._id,
        actorClerkId,
        reason: cancelReason,
        isCustomer: false,
      });
      setShowCancelForm(false);
      setCancelReason("");
    } catch (error) {
      console.error("Failed to cancel order:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (order.currencyCode === "UGX") {
      return `UGX ${amount.toLocaleString()}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: order.currencyCode,
    }).format(amount);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const canConfirm = order.status === "pending";
  const canPrepare = order.status === "confirmed";
  const canMarkReady = order.status === "preparing";
  const canAssignRider =
    order.status === "ready_for_pickup" &&
    order.fulfillmentType === "delivery" &&
    !order.riderId;
  const canCancel = ["pending", "confirmed", "preparing"].includes(
    order.status
  );

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Order #{order.displayId}
            <OrderStatusBadge size="sm" status={order.status} />
          </SheetTitle>
          <SheetDescription>
            Created {formatTime(order._creationTime)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {order.fulfillmentType && (
              <FulfillmentTypeBadge size="sm" type={order.fulfillmentType} />
            )}
            {order.paymentStatus && (
              <PaymentStatusBadge size="sm" status={order.paymentStatus} />
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {canConfirm && (
              <Button
                className="w-full"
                disabled={isConfirming}
                onClick={handleConfirm}
              >
                {isConfirming ? "Confirming..." : "Confirm Order"}
              </Button>
            )}

            {canPrepare && (
              <Button className="w-full" onClick={handleStartPreparing}>
                Start Preparing
              </Button>
            )}

            {canMarkReady && (
              <Button className="w-full" onClick={handleMarkReady}>
                Mark as Ready
              </Button>
            )}

            {canAssignRider && (
              <div className="space-y-2 rounded-lg border p-3">
                <h4 className="font-medium text-sm">Assign Rider</h4>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="Rider Name *"
                  type="text"
                  value={riderName}
                />
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="Rider Phone"
                  type="text"
                  value={riderPhone}
                />
                {onlineRiders.length > 0 && (
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    onChange={(e) => setSelectedRiderId(e.target.value)}
                    value={selectedRiderId}
                  >
                    <option value="">Select online rider...</option>
                    {onlineRiders.map((rider) => (
                      <option key={rider.clerkId} value={rider.clerkId}>
                        {rider.clerkId}{" "}
                        {rider.distanceKm ? `(${rider.distanceKm}km away)` : ""}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  className="w-full"
                  disabled={!riderName}
                  onClick={handleAssignRider}
                  size="sm"
                >
                  Assign & Dispatch
                </Button>
              </div>
            )}

            {order.riderId && (
              <div className="rounded-lg bg-cyan-50 p-3">
                <h4 className="font-medium text-cyan-800 text-sm">
                  Rider Assigned
                </h4>
                <p className="text-cyan-700 text-sm">
                  {order.riderName}
                  {order.riderPhone && ` • ${order.riderPhone}`}
                </p>
              </div>
            )}

            {canCancel && !showCancelForm && (
              <Button
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setShowCancelForm(true)}
                variant="outline"
              >
                Cancel Order
              </Button>
            )}

            {showCancelForm && (
              <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <h4 className="font-medium text-red-800 text-sm">
                  Cancel Order
                </h4>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation *"
                  rows={2}
                  value={cancelReason}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelReason("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!cancelReason || isCancelling}
                    onClick={handleCancel}
                    size="sm"
                    variant="destructive"
                  >
                    {isCancelling ? "Cancelling..." : "Confirm Cancel"}
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
                <h3 className="mb-2 font-medium text-gray-500 text-sm">
                  Delivery To
                </h3>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium">{order.deliveryAddress.name}</p>
                  {order.deliveryAddress.phone && (
                    <p className="text-gray-600 text-sm">
                      {order.deliveryAddress.phone}
                    </p>
                  )}
                  {order.deliveryAddress.address && (
                    <p className="mt-1 text-gray-600 text-sm">
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
            <h3 className="mb-2 font-medium text-gray-500 text-sm">
              Order Items ({order.itemCount ?? order.items?.length ?? 0})
            </h3>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div
                  className="flex items-start justify-between border-b py-2 last:border-0"
                  key={index}
                >
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-gray-500 text-xs">
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
                <h3 className="mb-3 font-medium text-gray-500 text-sm">
                  Order Timeline
                </h3>
                <div className="space-y-3">
                  {order.timeline.map((event, index) => (
                    <div className="flex gap-3 text-sm" key={index}>
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {event.eventType.replace(/_/g, " ")}
                          {event.status &&
                            ` → ${event.status.replace(/_/g, " ")}`}
                        </p>
                        {event.reason && (
                          <p className="text-gray-500 text-xs">
                            {event.reason}
                          </p>
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
  );
}
