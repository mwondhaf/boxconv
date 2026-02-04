/**
 * Admin Orders Page
 *
 * Platform-wide view of all orders across all organizations.
 * Provides filtering by status, organization, and date range.
 */

import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/tanstack-react-start'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import {
  OrdersTable,
  type Order,
  type OrderStatus,
  type FulfillmentType,
} from '~/features/vendor/components/orders-table'
import { OrderDetailSheet } from '~/features/vendor/components/order-detail-sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

export const Route = createFileRoute('/_authed/_admin/a/orders')({
  component: AdminOrdersPage,
})

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = OrderStatus | 'all'
type FulfillmentFilter = FulfillmentType | 'all'

// =============================================================================
// COMPONENT
// =============================================================================

function AdminOrdersPage() {
  const { user } = useUser()

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>('all')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all')

  // Selected order for detail sheet
  const [selectedOrderId, setSelectedOrderId] = useState<Id<'orders'> | null>(
    null
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Get all organizations for filter dropdown
  const organizations = useQuery(api.organizations.list, { limit: 100 })

  // Get all orders across organizations
  // Note: In a real app, you'd have a dedicated admin query that fetches across all orgs
  // For now, we'll simulate by using the organization query with the selected org
  const ordersResult = useQuery(
    api.orders.listByOrganization,
    selectedOrgId !== 'all'
      ? {
          organizationId: selectedOrgId as Id<'organizations'>,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 100,
        }
      : 'skip'
  )

  // Get selected order details
  const selectedOrder = useQuery(
    api.orders.get,
    selectedOrderId ? { id: selectedOrderId } : 'skip'
  )

  // Get online riders
  const onlineRiders = useQuery(api.riders.listOnlineRiders, {})

  // Calculate platform-wide stats (would come from a dedicated query in production)
  const stats = {
    totalOrders: ordersResult?.orders?.length ?? 0,
    pending: ordersResult?.orders?.filter((o) => o.status === 'pending').length ?? 0,
    inProgress:
      ordersResult?.orders?.filter((o) =>
        ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(
          o.status
        )
      ).length ?? 0,
    completed:
      ordersResult?.orders?.filter((o) =>
        ['delivered', 'completed'].includes(o.status)
      ).length ?? 0,
    cancelled:
      ordersResult?.orders?.filter((o) =>
        ['cancelled', 'canceled'].includes(o.status)
      ).length ?? 0,
  }

  // Filter orders
  const filteredOrders = ordersResult?.orders?.filter((order) => {
    if (
      fulfillmentFilter !== 'all' &&
      order.fulfillmentType !== fulfillmentFilter
    ) {
      return false
    }
    return true
  }) as Order[] | undefined

  // Handlers
  const handleViewOrder = (order: Order) => {
    setSelectedOrderId(order._id)
    setIsDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
          <p className="text-gray-600">
            Platform-wide view of all orders across vendors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.totalOrders}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Pending</h3>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {stats.pending}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {stats.inProgress}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {stats.completed}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Cancelled</h3>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {stats.cancelled}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          value={selectedOrgId}
          onValueChange={(value) => setSelectedOrgId(value)}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations?.map((org) => (
              <SelectItem key={org._id} value={org._id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
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
          value={fulfillmentFilter}
          onValueChange={(value) =>
            setFulfillmentFilter(value as FulfillmentFilter)
          }
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

      {/* Info Banner */}
      {selectedOrgId === 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Select an organization to view its orders.
            Platform-wide order listing requires selecting a specific vendor.
          </p>
        </div>
      )}

      {/* Orders Table */}
      {selectedOrgId !== 'all' && (
        <div className="bg-white rounded-lg shadow">
          <OrdersTable
            data={filteredOrders ?? []}
            isLoading={ordersResult === undefined}
            onView={handleViewOrder}
            showCustomer={true}
          />
        </div>
      )}

      {/* Order Detail Sheet */}
      <OrderDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        order={selectedOrder as any}
        actorClerkId={user?.id ?? ''}
        onlineRiders={onlineRiders ?? []}
      />
    </div>
  )
}
