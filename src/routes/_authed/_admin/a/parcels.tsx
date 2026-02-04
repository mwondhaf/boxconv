/**
 * Admin Parcels Page
 *
 * Platform-wide view of all P2P parcel deliveries.
 * Provides filtering by status, viewing details, and managing parcels.
 */

import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/tanstack-react-start'
import {
  Package,
  RefreshCw,
  Download,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
} from 'lucide-react'

import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

import {
  ParcelsTable,
  type Parcel,
  type ParcelStatus,
} from '~/features/admin/components/parcels-table'
import { ParcelDetailSheet } from '~/features/admin/components/parcel-detail-sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

export const Route = createFileRoute('/_authed/_admin/a/parcels')({
  component: AdminParcelsPage,
})

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = ParcelStatus | 'all'

// =============================================================================
// COMPONENT
// =============================================================================

function AdminParcelsPage() {
  const { user } = useUser()

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Selected parcel for detail sheet
  const [selectedParcelId, setSelectedParcelId] = useState<Id<'parcels'> | null>(
    null
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Get all parcels
  const parcels = useQuery(api.parcels.listAll, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 100,
  })

  // Get parcel statistics
  const stats = useQuery(api.parcels.getStats, {})

  // Get selected parcel details
  const selectedParcel = useQuery(
    api.parcels.get,
    selectedParcelId ? { id: selectedParcelId } : 'skip'
  )

  // Get online riders for assignment
  const onlineRiders = useQuery(api.riders.listOnlineRiders, {})

  // Filter parcels by status (additional client-side filtering if needed)
  const filteredParcels = parcels ?? []

  // Handlers
  const handleViewParcel = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id)
    setIsDetailOpen(true)
  }

  const handleConfirmParcel = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id)
    setIsDetailOpen(true)
  }

  const handleCancelParcel = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id)
    setIsDetailOpen(true)
  }

  const handleAssignRider = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id)
    setIsDetailOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="size-6" />
            Parcel Deliveries
          </h1>
          <p className="text-muted-foreground">
            Manage P2P parcel delivery requests across the platform.
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pending ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Truck className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.inProgress ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.delivered ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.cancelled ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayTotal ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today Delivered
            </CardTitle>
            <CheckCircle className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.todayDelivered ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
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
            <SelectItem value="rider_assigned">Rider Assigned</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parcels Table */}
      <div className="bg-card rounded-lg shadow">
        <ParcelsTable
          data={filteredParcels as Parcel[]}
          isLoading={parcels === undefined}
          onView={handleViewParcel}
          onConfirm={handleConfirmParcel}
          onCancel={handleCancelParcel}
          onAssignRider={handleAssignRider}
        />
      </div>

      {/* Parcel Detail Sheet */}
      <ParcelDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        parcel={selectedParcel as any}
        actorClerkId={user?.id ?? ''}
        onlineRiders={
          onlineRiders?.map((r) => ({
            clerkId: r.clerkId,
            name: `Rider ${r.clerkId.slice(-4)}`, // Use last 4 chars of clerkId as identifier
            phone: '', // Phone not available from listOnlineRiders
            distance: r.distanceKm,
          })) ?? []
        }
      />
    </div>
  )
}
