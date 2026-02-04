/**
 * Admin Parcels Page
 *
 * Platform-wide view of all P2P parcel deliveries.
 * Provides filtering by status, viewing details, and managing parcels.
 */

import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  CheckCircle,
  Clock,
  Download,
  Package,
  RefreshCw,
  TrendingUp,
  Truck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ParcelDetailSheet } from "~/features/admin/components/parcel-detail-sheet";
import {
  type Parcel,
  type ParcelStatus,
  ParcelsTable,
} from "~/features/admin/components/parcels-table";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/_authed/_admin/a/parcels")({
  component: AdminParcelsPage,
});

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = ParcelStatus | "all";

// =============================================================================
// COMPONENT
// =============================================================================

function AdminParcelsPage() {
  const { user } = useUser();

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Selected parcel for detail sheet
  const [selectedParcelId, setSelectedParcelId] =
    useState<Id<"parcels"> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Get all parcels
  const parcels = useQuery(api.parcels.listAll, {
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
  });

  // Get parcel statistics
  const stats = useQuery(api.parcels.getStats, {});

  // Get selected parcel details
  const selectedParcel = useQuery(
    api.parcels.get,
    selectedParcelId ? { id: selectedParcelId } : "skip"
  );

  // Get online riders for assignment
  const onlineRiders = useQuery(api.riders.listOnlineRiders, {});

  // Filter parcels by status (additional client-side filtering if needed)
  const filteredParcels = parcels ?? [];

  // Handlers
  const handleViewParcel = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id);
    setIsDetailOpen(true);
  };

  const handleConfirmParcel = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id);
    setIsDetailOpen(true);
  };

  const handleCancelParcel = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id);
    setIsDetailOpen(true);
  };

  const handleAssignRider = (parcel: Parcel) => {
    setSelectedParcelId(parcel._id);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl text-foreground">
            <Package className="size-6" />
            Parcel Deliveries
          </h1>
          <p className="text-muted-foreground">
            Manage P2P parcel delivery requests across the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button size="sm" variant="outline">
            <Download className="mr-2 size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Pending</CardTitle>
            <Clock className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-yellow-600">
              {stats?.pending ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">In Progress</CardTitle>
            <Truck className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-blue-600">
              {stats?.inProgress ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Delivered</CardTitle>
            <CheckCircle className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">
              {stats?.delivered ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Cancelled</CardTitle>
            <XCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">
              {stats?.cancelled ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Today</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats?.todayTotal ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Today Delivered
            </CardTitle>
            <CheckCircle className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">
              {stats?.todayDelivered ?? 0}
            </div>
          </CardContent>
        </Card>
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
            <SelectItem value="rider_assigned">Rider Assigned</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parcels Table */}
      <div className="rounded-lg bg-card shadow">
        <ParcelsTable
          data={filteredParcels as Parcel[]}
          isLoading={parcels === undefined}
          onAssignRider={handleAssignRider}
          onCancel={handleCancelParcel}
          onConfirm={handleConfirmParcel}
          onView={handleViewParcel}
        />
      </div>

      {/* Parcel Detail Sheet */}
      <ParcelDetailSheet
        actorClerkId={user?.id ?? ""}
        onlineRiders={
          onlineRiders?.map((r) => ({
            clerkId: r.clerkId,
            name: `Rider ${r.clerkId.slice(-4)}`, // Use last 4 chars of clerkId as identifier
            phone: "", // Phone not available from listOnlineRiders
            distance: r.distanceKm,
          })) ?? []
        }
        onOpenChange={setIsDetailOpen}
        open={isDetailOpen}
        parcel={selectedParcel as any}
      />
    </div>
  );
}
