"use client";

import { useConvexMutation, useConvexQuery } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  Bike,
  Car,
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Search,
  Star,
  Truck,
  User,
  UserCheck,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type AccountStatus = "pending" | "active" | "suspended" | "inactive";
type VehicleType =
  | "walking"
  | "bicycle"
  | "scooter"
  | "motorbike"
  | "car"
  | "van"
  | "truck";

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLORS: Record<AccountStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-800",
};

const STATUS_ICONS: Record<AccountStatus, React.ReactNode> = {
  pending: <Clock className="size-3" />,
  active: <CheckCircle className="size-3" />,
  suspended: <XCircle className="size-3" />,
  inactive: <AlertCircle className="size-3" />,
};

const VEHICLE_ICONS: Record<VehicleType, React.ReactNode> = {
  walking: <User className="size-4" />,
  bicycle: <Bike className="size-4" />,
  scooter: <Bike className="size-4" />,
  motorbike: <Bike className="size-4" />,
  car: <Car className="size-4" />,
  van: <Truck className="size-4" />,
  truck: <Truck className="size-4" />,
};

const VEHICLE_LABELS: Record<VehicleType, string> = {
  walking: "Walking",
  bicycle: "Bicycle",
  scooter: "Scooter",
  motorbike: "Motorbike",
  car: "Car",
  van: "Van",
  truck: "Truck",
};

// =============================================================================
// Components
// =============================================================================

function RiderStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge
      variant="secondary"
      className={`${STATUS_COLORS[status]} flex items-center gap-1`}
    >
      {STATUS_ICONS[status]}
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

function RiderOnlineStatus({
  status,
  lastOnlineAt,
}: {
  status: "online" | "offline" | "busy";
  lastOnlineAt?: number;
}) {
  const isRecent =
    lastOnlineAt && Date.now() - lastOnlineAt < 10 * 60 * 1000; // 10 minutes
  const color =
    status === "online" && isRecent
      ? "bg-green-500"
      : status === "busy"
        ? "bg-yellow-500"
        : "bg-gray-400";

  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-2 rounded-full ${color}`} />
      <span className="text-muted-foreground text-xs capitalize">{status}</span>
    </div>
  );
}

function RatingDisplay({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-muted-foreground text-sm">No ratings</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <Star className="size-4 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

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
// Rider Registration Dialog
// =============================================================================

function RegisterRiderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = React.useState({
    clerkId: "",
    name: "",
    phoneNumber: "",
    email: "",
    vehicleType: "motorbike" as VehicleType,
    nationalId: "",
    drivingPermitNumber: "",
    vehiclePlate: "",
    vehicleMake: "",
    vehicleColor: "",
    district: "",
    homeAddress: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
    mobileMoneyNumber: "",
    mobileMoneyProvider: "",
    notes: "",
  });

  const { mutate: registerRider, isPending } = useMutation({
    mutationFn: useConvexMutation(api.riderAdmin.register),
    onSuccess: (data: { riderId: string; riderCode: string }) => {
      toast.success(`Rider registered with code: ${data.riderCode}`);
      onOpenChange(false);
      setFormData({
        clerkId: "",
        name: "",
        phoneNumber: "",
        email: "",
        vehicleType: "motorbike",
        nationalId: "",
        drivingPermitNumber: "",
        vehiclePlate: "",
        vehicleMake: "",
        vehicleColor: "",
        district: "",
        homeAddress: "",
        nextOfKinName: "",
        nextOfKinPhone: "",
        mobileMoneyNumber: "",
        mobileMoneyProvider: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to register rider");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerRider({
      clerkId: formData.clerkId,
      name: formData.name,
      phoneNumber: formData.phoneNumber,
      email: formData.email || undefined,
      vehicleType: formData.vehicleType,
      nationalId: formData.nationalId || undefined,
      drivingPermitNumber: formData.drivingPermitNumber || undefined,
      vehiclePlate: formData.vehiclePlate || undefined,
      vehicleMake: formData.vehicleMake || undefined,
      vehicleColor: formData.vehicleColor || undefined,
      district: formData.district || undefined,
      homeAddress: formData.homeAddress || undefined,
      nextOfKinName: formData.nextOfKinName || undefined,
      nextOfKinPhone: formData.nextOfKinPhone || undefined,
      mobileMoneyNumber: formData.mobileMoneyNumber || undefined,
      mobileMoneyProvider: formData.mobileMoneyProvider || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Rider</DialogTitle>
          <DialogDescription>
            Add a new rider to the platform. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Identity Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Identity</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="clerkId">Clerk User ID *</Label>
                  <Input
                    id="clerkId"
                    value={formData.clerkId}
                    onChange={(e) =>
                      setFormData({ ...formData, clerkId: e.target.value })
                    }
                    placeholder="user_..."
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    placeholder="+256..."
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Vehicle</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="vehicleType">Vehicle Type *</Label>
                  <Select
                    value={formData.vehicleType}
                    onValueChange={(value: VehicleType) =>
                      setFormData({ ...formData, vehicleType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VEHICLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {VEHICLE_ICONS[value as VehicleType]}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vehiclePlate">Vehicle Plate</Label>
                  <Input
                    id="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={(e) =>
                      setFormData({ ...formData, vehiclePlate: e.target.value })
                    }
                    placeholder="UAB 123X"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="vehicleMake">Vehicle Make</Label>
                  <Input
                    id="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleMake: e.target.value })
                    }
                    placeholder="e.g. Bajaj"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vehicleColor">Vehicle Color</Label>
                  <Input
                    id="vehicleColor"
                    value={formData.vehicleColor}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleColor: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Compliance Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Compliance</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nationalId">National ID (NIN)</Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) =>
                      setFormData({ ...formData, nationalId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="drivingPermitNumber">
                    Driving Permit Number
                  </Label>
                  <Input
                    id="drivingPermitNumber"
                    value={formData.drivingPermitNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        drivingPermitNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Location</h4>
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
                  <Label htmlFor="homeAddress">Home Address</Label>
                  <Input
                    id="homeAddress"
                    value={formData.homeAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, homeAddress: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nextOfKinName">Next of Kin Name</Label>
                  <Input
                    id="nextOfKinName"
                    value={formData.nextOfKinName}
                    onChange={(e) =>
                      setFormData({ ...formData, nextOfKinName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nextOfKinPhone">Next of Kin Phone</Label>
                  <Input
                    id="nextOfKinPhone"
                    value={formData.nextOfKinPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nextOfKinPhone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Payout Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Payout</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mobileMoneyNumber">Mobile Money Number</Label>
                  <Input
                    id="mobileMoneyNumber"
                    value={formData.mobileMoneyNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mobileMoneyNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mobileMoneyProvider">Provider</Label>
                  <Select
                    value={formData.mobileMoneyProvider}
                    onValueChange={(value) =>
                      setFormData({ ...formData, mobileMoneyProvider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                      <SelectItem value="Airtel">Airtel Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes about this rider..."
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
              {isPending ? "Registering..." : "Register Rider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Rider Details Dialog
// =============================================================================

function RiderDetailsDialog({
  riderId,
  open,
  onOpenChange,
}: {
  riderId: Id<"riders"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rider = useConvexQuery(
    api.riderAdmin.get,
    riderId ? { riderId } : "skip"
  );

  if (!riderId || !rider) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {rider.name}
                <RiderStatusBadge status={rider.accountStatus as AccountStatus} />
              </DialogTitle>
              <DialogDescription>
                {rider.riderCode} • {rider.phoneNumber}
              </DialogDescription>
            </div>
            {rider.currentLocation && (
              <RiderOnlineStatus
                status={rider.currentLocation.status as "online" | "offline" | "busy"}
                lastOnlineAt={rider.currentLocation.lastUpdatedAt}
              />
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p>{rider.email || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">District</Label>
                <p>{rider.district || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  Home Address
                </Label>
                <p>{rider.homeAddress || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  Current Stage
                </Label>
                <p>{rider.stage?.name || "Not assigned"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Emergency Contact
              </Label>
              <div className="rounded-lg border p-3">
                <p className="font-medium">
                  {rider.nextOfKinName || "Not provided"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {rider.nextOfKinPhone || "No phone"}
                </p>
              </div>
            </div>
            {rider.notes && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Notes</Label>
                <p className="whitespace-pre-wrap text-sm">{rider.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">
                  Vehicle Type
                </Label>
                <div className="flex items-center gap-2">
                  {VEHICLE_ICONS[rider.vehicleType as VehicleType]}
                  <span className="capitalize">{rider.vehicleType}</span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  License Plate
                </Label>
                <p>{rider.vehiclePlate || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Make</Label>
                <p>{rider.vehicleMake || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Model</Label>
                <p>{rider.vehicleModel || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Color</Label>
                <p>{rider.vehicleColor || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Year</Label>
                <p>{rider.vehicleYear || "Not provided"}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">
                  National ID (NIN)
                </Label>
                <p>{rider.nationalId || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  Driving Permit
                </Label>
                <p>{rider.drivingPermitNumber || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">TIN</Label>
                <p>{rider.tin || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  Helmet Verified
                </Label>
                <Badge variant={rider.helmetVerified ? "default" : "secondary"}>
                  {rider.helmetVerified ? "Verified" : "Not Verified"}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Insurance</Label>
                <p>{rider.insuranceNumber || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  Insurance Expiry
                </Label>
                <p>
                  {rider.insuranceExpiry
                    ? new Date(rider.insuranceExpiry).toLocaleDateString()
                    : "Not provided"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Star className="size-6 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-2xl">
                      {rider.averageRating?.toFixed(1) || "N/A"}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({rider.ratingCount} reviews)
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {rider.completedDeliveries}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {rider.canceledDeliveries} canceled
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  UGX {rider.totalEarnings?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Action Dialogs
// =============================================================================

function SuspendRiderDialog({
  riderId,
  riderName,
  open,
  onOpenChange,
}: {
  riderId: Id<"riders"> | null;
  riderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = React.useState("");

  const { mutate: suspendRider, isPending } = useMutation({
    mutationFn: useConvexMutation(api.riderAdmin.suspend),
    onSuccess: () => {
      toast.success("Rider suspended");
      onOpenChange(false);
      setReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to suspend rider");
    },
  });

  if (!riderId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Rider</DialogTitle>
          <DialogDescription>
            Are you sure you want to suspend {riderName}? They will not be able
            to accept deliveries.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for suspension..."
            required
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => suspendRider({ riderId, reason })}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? "Suspending..." : "Suspend Rider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Riders Table
// =============================================================================

function RidersTable({
  riders,
  onViewDetails,
  onApprove,
  onSuspend,
  onReactivate,
}: {
  riders: any[];
  onViewDetails: (riderId: Id<"riders">) => void;
  onApprove: (riderId: Id<"riders">) => void;
  onSuspend: (riderId: Id<"riders">, name: string) => void;
  onReactivate: (riderId: Id<"riders">) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rider</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Deliveries</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {riders.map((rider) => (
          <TableRow key={rider._id}>
            <TableCell>
              <div>
                <p className="font-medium">{rider.name}</p>
                <p className="text-muted-foreground text-sm">
                  {rider.phoneNumber}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {rider.riderCode}
              </code>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                {VEHICLE_ICONS[rider.vehicleType as VehicleType]}
                <span className="text-sm capitalize">{rider.vehicleType}</span>
              </div>
            </TableCell>
            <TableCell>
              <RiderStatusBadge status={rider.accountStatus as AccountStatus} />
            </TableCell>
            <TableCell>
              <RatingDisplay rating={rider.averageRating} />
            </TableCell>
            <TableCell>{rider.completedDeliveries}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onViewDetails(rider._id)}>
                    <Eye className="mr-2 size-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {rider.accountStatus === "pending" && (
                    <DropdownMenuItem onClick={() => onApprove(rider._id)}>
                      <UserCheck className="mr-2 size-4" />
                      Approve
                    </DropdownMenuItem>
                  )}
                  {rider.accountStatus === "active" && (
                    <DropdownMenuItem
                      onClick={() => onSuspend(rider._id, rider.name)}
                      className="text-destructive"
                    >
                      <UserX className="mr-2 size-4" />
                      Suspend
                    </DropdownMenuItem>
                  )}
                  {(rider.accountStatus === "suspended" ||
                    rider.accountStatus === "inactive") && (
                    <DropdownMenuItem onClick={() => onReactivate(rider._id)}>
                      <RefreshCw className="mr-2 size-4" />
                      Reactivate
                    </DropdownMenuItem>
                  )}
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

export function AdminRidersPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AccountStatus | "all">(
    "all"
  );
  const [vehicleFilter, setVehicleFilter] = React.useState<VehicleType | "all">(
    "all"
  );

  // Dialogs
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [detailsRiderId, setDetailsRiderId] =
    React.useState<Id<"riders"> | null>(null);
  const [suspendRider, setSuspendRider] = React.useState<{
    id: Id<"riders">;
    name: string;
  } | null>(null);

  // Queries
  const stats = useConvexQuery(api.riderAdmin.getStats, {});
  const ridersData = useConvexQuery(api.riderAdmin.list, {
    accountStatus: statusFilter !== "all" ? statusFilter : undefined,
    vehicleType: vehicleFilter !== "all" ? vehicleFilter : undefined,
  });
  const searchResults = useConvexQuery(
    api.riderAdmin.search,
    searchTerm.length >= 2 ? { searchTerm } : "skip"
  );

  // Mutations
  const { mutate: approveRider } = useMutation({
    mutationFn: useConvexMutation(api.riderAdmin.approve),
    onSuccess: () => toast.success("Rider approved"),
    onError: (error) => toast.error(error.message || "Failed to approve rider"),
  });

  const { mutate: reactivateRider } = useMutation({
    mutationFn: useConvexMutation(api.riderAdmin.reactivate),
    onSuccess: () => toast.success("Rider reactivated"),
    onError: (error) =>
      toast.error(error.message || "Failed to reactivate rider"),
  });

  const riders = searchTerm.length >= 2 ? searchResults : ridersData?.items;
  const isLoading = riders === undefined;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Riders</h1>
          <p className="text-muted-foreground">
            Manage delivery riders and their profiles
          </p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>
          <UserPlus className="mr-2 size-4" />
          Register Rider
        </Button>
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Riders"
            value={stats.total}
            icon={<User className="size-4 text-muted-foreground" />}
          />
          <StatsCard
            title="Active"
            value={stats.active}
            icon={<UserCheck className="size-4 text-green-600" />}
          />
          <StatsCard
            title="Pending Approval"
            value={stats.pending}
            icon={<Clock className="size-4 text-yellow-600" />}
          />
          <StatsCard
            title="Currently Online"
            value={stats.currentlyOnline}
            icon={<BadgeCheck className="size-4 text-blue-600" />}
          />
          <StatsCard
            title="Total Deliveries"
            value={stats.totalCompletedDeliveries.toLocaleString()}
            icon={<Truck className="size-4 text-muted-foreground" />}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search riders by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as AccountStatus | "all")}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={vehicleFilter}
              onValueChange={(v) => setVehicleFilter(v as VehicleType | "all")}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {Object.entries(VEHICLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Riders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Riders
            {riders && (
              <Badge variant="secondary" className="ml-2">
                {riders.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : riders && riders.length > 0 ? (
            <RidersTable
              riders={riders}
              onViewDetails={(id) => setDetailsRiderId(id)}
              onApprove={(id) => approveRider({ riderId: id })}
              onSuspend={(id, name) => setSuspendRider({ id, name })}
              onReactivate={(id) => reactivateRider({ riderId: id })}
            />
          ) : (
            <div className="py-12 text-center">
              <User className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No riders found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setRegisterOpen(true)}
              >
                <UserPlus className="mr-2 size-4" />
                Register First Rider
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RegisterRiderDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <RiderDetailsDialog
        riderId={detailsRiderId}
        open={!!detailsRiderId}
        onOpenChange={(open) => !open && setDetailsRiderId(null)}
      />
      <SuspendRiderDialog
        riderId={suspendRider?.id ?? null}
        riderName={suspendRider?.name ?? ""}
        open={!!suspendRider}
        onOpenChange={(open) => !open && setSuspendRider(null)}
      />
    </div>
  );
}

export default AdminRidersPage;
