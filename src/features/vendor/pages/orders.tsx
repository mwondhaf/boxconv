/**
 * Vendor Orders Page
 *
 * Displays orders for the vendor's organization with:
 * - Order statistics (pending, preparing, completed, etc.)
 * - Filtering by status and fulfillment type
 * - Order list using the reusable OrdersTable component
 * - Order detail sheet for management
 */

import { useOrganization, useUser } from "@clerk/tanstack-react-start";
import { useMutation, useQuery } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useCan } from "~/shared/stores/ability-store";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { OrderDetailSheet } from "../components/order-detail-sheet";
import {
  type FulfillmentType,
  type Order,
  type OrderStatus,
  OrdersTable,
} from "../components/orders-table";

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = OrderStatus | "all";
type FulfillmentFilter = FulfillmentType | "all";

// =============================================================================
// COMPONENT
// =============================================================================

export function VendorOrdersPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const canManageOrder = useCan("manage", "Order");

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>("all");

  // Selected order for detail sheet
  const [selectedOrderId, setSelectedOrderId] = useState<Id<"orders"> | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Get organization from Convex
  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  // Get orders for this organization
  const ordersResult = useQuery(
    api.orders.listByOrganization,
    convexOrg?._id
      ? {
          organizationId: convexOrg._id,
          status: statusFilter !== "all" ? statusFilter : undefined,
          limit: 100,
        }
      : "skip"
  );

  // Get today's summary for stats
  const todaysSummary = useQuery(
    api.orders.getTodaysSummary,
    convexOrg?._id ? { organizationId: convexOrg._id } : "skip"
  );

  // Get selected order details
  const selectedOrder = useQuery(
    api.orders.get,
    selectedOrderId ? { id: selectedOrderId } : "skip"
  );

  // Get online riders for assignment
  const onlineRiders = useQuery(api.riders.listOnlineRiders, {
    storeLat: convexOrg?.lat,
    storeLng: convexOrg?.lng,
  });

  // Mutations
  const confirmOrder = useMutation(api.orders.confirm);
  const startPreparing = useMutation(api.orders.startPreparing);
  const markReady = useMutation(api.orders.markReady);

  // Filter orders client-side for fulfillment type
  const filteredOrders = ordersResult?.orders?.filter((order) => {
    if (
      fulfillmentFilter !== "all" &&
      order.fulfillmentType !== fulfillmentFilter
    ) {
      return false;
    }
    return true;
  }) as Order[] | undefined;

  // Handlers
  const handleViewOrder = (order: Order) => {
    setSelectedOrderId(order._id);
    setIsDetailOpen(true);
  };

  const handleConfirmOrder = async (order: Order) => {
    if (!user?.id) return;
    try {
      await confirmOrder({ orderId: order._id, actorClerkId: user.id });
    } catch (error) {
      console.error("Failed to confirm order:", error);
    }
  };

  const handleStartPreparing = async (order: Order) => {
    if (!user?.id) return;
    try {
      await startPreparing({ orderId: order._id, actorClerkId: user.id });
    } catch (error) {
      console.error("Failed to start preparing:", error);
    }
  };

  const handleMarkReady = async (order: Order) => {
    if (!user?.id) return;
    try {
      await markReady({ orderId: order._id, actorClerkId: user.id });
    } catch (error) {
      console.error("Failed to mark ready:", error);
    }
  };

  const handleCancelOrder = (order: Order) => {
    // Open detail sheet for cancel flow (which has the cancel form)
    setSelectedOrderId(order._id);
    setIsDetailOpen(true);
  };

  const formatCurrency = (amount: number, currency = "UGX") => {
    if (currency === "UGX") {
      return `UGX ${amount.toLocaleString()}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  if (!organization) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Please select an organization</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">Orders</h1>
          <p className="text-gray-600">View and manage your customer orders.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button size="sm" variant="outline">
            Export
          </Button>
        </div>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">Today's Orders</h3>
          <p className="mt-1 font-bold text-2xl text-gray-900">
            {todaysSummary?.totalOrders ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">Pending</h3>
          <p className="mt-1 font-bold text-2xl text-yellow-600">
            {todaysSummary?.pending ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">Preparing</h3>
          <p className="mt-1 font-bold text-2xl text-blue-600">
            {todaysSummary?.preparing ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">Completed</h3>
          <p className="mt-1 font-bold text-2xl text-green-600">
            {todaysSummary?.completed ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">Revenue</h3>
          <p className="mt-1 font-bold text-2xl text-gray-900">
            {formatCurrency(todaysSummary?.revenue ?? 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          value={statusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready_for_pickup">Ready</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            setFulfillmentFilter(value as FulfillmentFilter)
          }
          value={fulfillmentFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fulfillment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
            <SelectItem value="self_delivery">Self Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg bg-white shadow">
        <OrdersTable
          data={filteredOrders ?? []}
          isLoading={ordersResult === undefined}
          onCancel={canManageOrder ? handleCancelOrder : undefined}
          onConfirm={canManageOrder ? handleConfirmOrder : undefined}
          onMarkReady={canManageOrder ? handleMarkReady : undefined}
          onStartPreparing={canManageOrder ? handleStartPreparing : undefined}
          onView={handleViewOrder}
          showCustomer={true}
        />
      </div>

      {/* Order Detail Sheet */}
      <OrderDetailSheet
        actorClerkId={user?.id ?? ""}
        onlineRiders={onlineRiders ?? []}
        onOpenChange={setIsDetailOpen}
        open={isDetailOpen}
        order={selectedOrder as any}
      />
    </div>
  );
}
