"use client";

import { useConvexMutation, useConvexQuery } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  Building2,
  Edit,
  Eye,
  MapPin,
  MoreHorizontal,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import * as React from "react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface Stage {
  _id: Id<"stages">;
  name: string;
  code: string;
  description?: string;
  address: string;
  district?: string;
  lat: number;
  lng: number;
  zoneId?: Id<"deliveryZones">;
  capacity?: number;
  isActive: boolean;
  contactName?: string;
  contactPhone?: string;
  createdAt: number;
  updatedAt: number;
  riderCount?: number;
}

// =============================================================================
// Components
// =============================================================================

function StatsCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value}</div>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Create/Edit Stage Dialog
// =============================================================================

function StageFormDialog({
  stage,
  open,
  onOpenChange,
}: {
  stage?: Stage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!stage;
  const [formData, setFormData] = React.useState({
    name: "",
    address: "",
    lat: "",
    lng: "",
    district: "",
    description: "",
    capacity: "",
    contactName: "",
    contactPhone: "",
    zoneId: "",
  });

  // Load zones for dropdown
  const zones = useConvexQuery(api.deliveryZones.list, {});

  // Reset form when dialog opens/closes or stage changes
  React.useEffect(() => {
    if (open && stage) {
      setFormData({
        name: stage.name,
        address: stage.address,
        lat: String(stage.lat),
        lng: String(stage.lng),
        district: stage.district || "",
        description: stage.description || "",
        capacity: stage.capacity ? String(stage.capacity) : "",
        contactName: stage.contactName || "",
        contactPhone: stage.contactPhone || "",
        zoneId: stage.zoneId || "",
      });
    } else if (open && !stage) {
      setFormData({
        name: "",
        address: "",
        lat: "",
        lng: "",
        district: "",
        description: "",
        capacity: "",
        contactName: "",
        contactPhone: "",
        zoneId: "",
      });
    }
  }, [open, stage]);

  const { mutate: createStage, isPending: isCreating } = useMutation({
    mutationFn: useConvexMutation(api.stages.create),
    onSuccess: (data: { stageId: string; code: string }) => {
      toast.success(`Stage created with code: ${data.code}`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create stage");
    },
  });

  const { mutate: updateStage, isPending: isUpdating } = useMutation({
    mutationFn: useConvexMutation(api.stages.update),
    onSuccess: () => {
      toast.success("Stage updated");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update stage");
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid coordinates");
      return;
    }

    const payload = {
      name: formData.name,
      address: formData.address,
      lat,
      lng,
      district: formData.district || undefined,
      description: formData.description || undefined,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      contactName: formData.contactName || undefined,
      contactPhone: formData.contactPhone || undefined,
      zoneId: formData.zoneId
        ? (formData.zoneId as Id<"deliveryZones">)
        : undefined,
    };

    if (isEditing && stage) {
      updateStage({ stageId: stage._id, ...payload });
    } else {
      createStage(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Stage" : "Create New Stage"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the stage details below."
              : "Add a new rider gathering point / hub."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="name">Stage Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Kampala Central Stage"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address"
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="lat">Latitude *</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) =>
                    setFormData({ ...formData, lat: e.target.value })
                  }
                  placeholder="0.3476"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lng">Longitude *</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) =>
                    setFormData({ ...formData, lng: e.target.value })
                  }
                  placeholder="32.5825"
                  required
                />
              </div>
            </div>

            {/* District & Zone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) =>
                    setFormData({ ...formData, district: e.target.value })
                  }
                  placeholder="e.g. Kampala"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zoneId">Delivery Zone</Label>
                <Select
                  value={formData.zoneId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, zoneId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No zone</SelectItem>
                    {zones?.map((zone) => (
                      <SelectItem key={zone._id} value={zone._id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Capacity & Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="capacity">Max Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  placeholder="Max riders"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                  placeholder="Supervisor name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
                placeholder="+256..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional details about this stage..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Stage"
                  : "Create Stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Stage Details Dialog
// =============================================================================

function StageDetailsDialog({
  stageId,
  open,
  onOpenChange,
}: {
  stageId: Id<"stages"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const stage = useConvexQuery(api.stages.get, stageId ? { stageId } : "skip");

  if (!stageId || !stage) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {stage.name}
                <Badge variant={stage.isActive ? "default" : "secondary"}>
                  {stage.isActive ? "Active" : "Inactive"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {stage.code} • {stage.address}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stage Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">District</Label>
              <p>{stage.district || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Zone</Label>
              <p>{stage.zone?.name || "Not assigned"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Capacity</Label>
              <p>{stage.capacity || "Unlimited"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Current Riders
              </Label>
              <p>{stage.riderCount || 0}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Coordinates
              </Label>
              <p className="font-mono text-sm">
                {stage.lat.toFixed(6)}, {stage.lng.toFixed(6)}
              </p>
            </div>
          </div>

          {/* Contact */}
          {(stage.contactName || stage.contactPhone) && (
            <div className="rounded-lg border p-3">
              <Label className="text-muted-foreground text-xs">
                Stage Contact
              </Label>
              <p className="font-medium">{stage.contactName || "No name"}</p>
              {stage.contactPhone && (
                <p className="text-muted-foreground text-sm">
                  {stage.contactPhone}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {stage.description && (
            <div>
              <Label className="text-muted-foreground text-xs">Description</Label>
              <p className="text-sm">{stage.description}</p>
            </div>
          )}

          {/* Riders List */}
          {stage.riders && stage.riders.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-xs">
                Assigned Riders ({stage.riders.length})
              </Label>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {stage.riders.map((rider: any) => (
                  <div
                    key={rider._id}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <div>
                      <p className="font-medium text-sm">{rider.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {rider.riderCode} • {rider.vehicleType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rider.isPrimary && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      <div
                        className={`size-2 rounded-full ${
                          rider.currentStatus === "online"
                            ? "bg-green-500"
                            : rider.currentStatus === "busy"
                              ? "bg-yellow-500"
                              : "bg-gray-400"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Delete Confirmation Dialog
// =============================================================================

function DeleteStageDialog({
  stage,
  open,
  onOpenChange,
}: {
  stage: Stage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate: deleteStage, isPending } = useMutation({
    mutationFn: useConvexMutation(api.stages.remove),
    onSuccess: () => {
      toast.success("Stage deleted");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete stage");
    },
  });

  if (!stage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Stage</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{stage.name}"? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteStage({ stageId: stage._id })}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Stage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Stages Table
// =============================================================================

function StagesTable({
  stages,
  onViewDetails,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  stages: Stage[];
  onViewDetails: (stageId: Id<"stages">) => void;
  onEdit: (stage: Stage) => void;
  onToggleActive: (stageId: Id<"stages">) => void;
  onDelete: (stage: Stage) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stage</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Riders</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stages.map((stage) => (
          <TableRow key={stage._id} className={!stage.isActive ? "opacity-60" : ""}>
            <TableCell>
              <div>
                <p className="font-medium">{stage.name}</p>
                <p className="text-muted-foreground text-sm">{stage.address}</p>
              </div>
            </TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {stage.code}
              </code>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4 text-muted-foreground" />
                <span className="text-sm">{stage.district || "No district"}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <Users className="size-4 text-muted-foreground" />
                <span>
                  {stage.riderCount || 0}
                  {stage.capacity && ` / ${stage.capacity}`}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={stage.isActive ? "default" : "secondary"}>
                {stage.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onViewDetails(stage._id)}>
                    <Eye className="mr-2 size-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(stage)}>
                    <Edit className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onToggleActive(stage._id)}>
                    {stage.isActive ? (
                      <>
                        <ToggleLeft className="mr-2 size-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <ToggleRight className="mr-2 size-4" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(stage)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AdminStagesPage() {
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingStage, setEditingStage] = React.useState<Stage | null>(null);
  const [detailsStageId, setDetailsStageId] = React.useState<Id<"stages"> | null>(null);
  const [deletingStage, setDeletingStage] = React.useState<Stage | null>(null);

  // Queries
  const stats = useConvexQuery(api.stages.getStats, {});
  const stagesData = useConvexQuery(api.stages.list, {
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  // Mutations
  const { mutate: toggleActive } = useMutation({
    mutationFn: useConvexMutation(api.stages.toggleActive),
    onSuccess: (data: { success: boolean; isActive: boolean }) => {
      toast.success(data.isActive ? "Stage activated" : "Stage deactivated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to toggle stage status");
    },
  });

  const isLoading = stagesData === undefined;

  const handleEdit = (stage: Stage) => {
    setEditingStage(stage);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingStage(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Stages</h1>
          <p className="text-muted-foreground">
            Manage rider gathering points and hubs
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Stage
        </Button>
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Stages"
            value={stats.total}
            icon={<Building2 className="size-4 text-muted-foreground" />}
          />
          <StatsCard
            title="Active Stages"
            value={stats.active}
            icon={<Building2 className="size-4 text-green-600" />}
          />
          <StatsCard
            title="Total Capacity"
            value={stats.totalCapacity || "Unlimited"}
            icon={<Users className="size-4 text-muted-foreground" />}
          />
          <StatsCard
            title="Assigned Riders"
            value={stats.totalAssignedRiders}
            icon={<Users className="size-4 text-blue-600" />}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as "all" | "active" | "inactive")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stages Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Stages
            {stagesData && (
              <Badge variant="secondary" className="ml-2">
                {stagesData.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Rider gathering points for efficient delivery coordination
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : stagesData && stagesData.length > 0 ? (
            <StagesTable
              stages={stagesData as Stage[]}
              onViewDetails={(id) => setDetailsStageId(id)}
              onEdit={handleEdit}
              onToggleActive={(id) => toggleActive({ stageId: id })}
              onDelete={setDeletingStage}
            />
          ) : (
            <div className="py-12 text-center">
              <Building2 className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No stages found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="mr-2 size-4" />
                Add First Stage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <StageFormDialog
        stage={editingStage}
        open={formOpen}
        onOpenChange={handleCloseForm}
      />
      <StageDetailsDialog
        stageId={detailsStageId}
        open={!!detailsStageId}
        onOpenChange={(open) => !open && setDetailsStageId(null)}
      />
      <DeleteStageDialog
        stage={deletingStage}
        open={!!deletingStage}
        onOpenChange={(open) => !open && setDeletingStage(null)}
      />
    </div>
  );
}

export default AdminStagesPage;
