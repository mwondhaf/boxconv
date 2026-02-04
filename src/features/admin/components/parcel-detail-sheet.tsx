/**
 * Parcel Detail Sheet Component
 *
 * Displays detailed information about a parcel delivery.
 * Used in admin parcels page for viewing and managing individual parcels.
 */

import {
  AlertTriangle,
  Clock,
  Copy,
  CreditCard,
  FileText,
  MapPin,
  Navigation,
  Package,
  Phone,
  Scale,
  Shield,
  Truck,
  User,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  canCancelParcel,
  formatCurrency,
  formatDistance,
  formatRelativeTime,
  getNextParcelStatuses,
  useAddParcelNote,
  useAssignRiderToParcel,
  useCancelParcel,
  useRegenerateParcelCodes,
  useUpdateParcelStatus,
} from "../hooks/use-parcels";
import {
  ParcelPaymentBadge,
  type ParcelPaymentStatus,
  ParcelSizeBadge,
  type ParcelSizeCategory,
  type ParcelStatus,
  ParcelStatusBadge,
} from "./parcel-status-badge";

// =============================================================================
// TYPES
// =============================================================================

export interface ParcelDetailData {
  _id: Id<"parcels">;
  _creationTime: number;
  displayId: number;
  senderClerkId: string;
  // Pickup
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupNotes?: string;
  // Dropoff
  recipientName: string;
  recipientPhone: string;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  dropoffNotes?: string;
  // Package
  description: string;
  weight?: number;
  sizeCategory: ParcelSizeCategory;
  fragile: boolean;
  valueAmount?: number;
  valueCurrency: string;
  // Status
  status: ParcelStatus;
  paymentStatus: ParcelPaymentStatus;
  // Rider
  externalRiderId?: string;
  externalRiderName?: string;
  externalRiderPhone?: string;
  riderAssignedAt?: number;
  // Pricing
  estimatedDistance?: number;
  priceAmount?: number;
  priceCurrency: string;
  // Codes
  pickupCode?: string;
  deliveryCode?: string;
  // Timestamps
  pickedUpAt?: number;
  deliveredAt?: number;
  canceledAt?: number;
  cancelReason?: string;
  // Timeline
  timeline?: Array<{
    eventType: string;
    status?: string;
    description?: string;
    timestamp: number;
  }>;
}

export interface OnlineRider {
  clerkId: string;
  name: string;
  phone: string;
  distance?: number;
}

export interface ParcelDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcel: ParcelDetailData | null | undefined;
  actorClerkId: string;
  onlineRiders?: OnlineRider[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ParcelDetailSheet({
  open,
  onOpenChange,
  parcel,
  actorClerkId,
  onlineRiders = [],
}: ParcelDetailSheetProps) {
  // State
  const [selectedRiderId, setSelectedRiderId] = React.useState<string>("");
  const [cancelReason, setCancelReason] = React.useState("");
  const [showCancelForm, setShowCancelForm] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");

  // Mutations
  const assignRider = useAssignRiderToParcel();
  const cancelParcel = useCancelParcel();
  const updateStatus = useUpdateParcelStatus();
  const addNote = useAddParcelNote();
  const regenerateCodes = useRegenerateParcelCodes();

  // Reset state when parcel changes
  React.useEffect(() => {
    setSelectedRiderId("");
    setCancelReason("");
    setShowCancelForm(false);
    setNoteText("");
  }, [parcel?._id]);

  if (!parcel) {
    return (
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  // Handlers
  const handleAssignRider = async () => {
    if (!selectedRiderId) return;

    const rider = onlineRiders.find((r) => r.clerkId === selectedRiderId);
    if (!rider) return;

    try {
      await assignRider({
        parcelId: parcel._id,
        riderId: rider.clerkId,
        riderName: rider.name,
        riderPhone: rider.phone,
        actorClerkId,
      });
      toast.success(`Rider ${rider.name} assigned`);
      setSelectedRiderId("");
    } catch (error) {
      toast.error("Failed to assign rider");
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      await cancelParcel({
        parcelId: parcel._id,
        reason: cancelReason,
        actorClerkId,
        isCustomer: false,
      });
      toast.success("Parcel cancelled");
      setShowCancelForm(false);
      setCancelReason("");
    } catch (error) {
      toast.error("Failed to cancel parcel");
    }
  };

  const handleStatusUpdate = async (newStatus: ParcelStatus) => {
    try {
      await updateStatus({
        parcelId: parcel._id,
        status: newStatus,
        actorClerkId,
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    try {
      await addNote({
        parcelId: parcel._id,
        note: noteText,
        clerkId: actorClerkId,
      });
      toast.success("Note added");
      setNoteText("");
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      await regenerateCodes({
        parcelId: parcel._id,
        actorClerkId,
      });
      toast.success("Verification codes regenerated");
    } catch (error) {
      toast.error("Failed to regenerate codes");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const nextStatuses = getNextParcelStatuses(parcel.status);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Parcel #{parcel.displayId}
          </SheetTitle>
          <SheetDescription>
            Created {formatRelativeTime(parcel._creationTime)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Overview */}
          <div className="flex flex-wrap gap-2">
            <ParcelStatusBadge size="lg" status={parcel.status} />
            <ParcelPaymentBadge size="lg" status={parcel.paymentStatus} />
            <ParcelSizeBadge size={parcel.sizeCategory} />
            {parcel.fragile && (
              <Badge className="gap-1" variant="destructive">
                <AlertTriangle className="size-3" />
                Fragile
              </Badge>
            )}
          </div>

          {/* Pricing */}
          {parcel.priceAmount && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="size-4" />
                  Delivery Fare
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-2xl">
                    {formatCurrency(parcel.priceAmount, parcel.priceCurrency)}
                  </span>
                  {parcel.estimatedDistance && (
                    <span className="text-muted-foreground text-sm">
                      • {formatDistance(parcel.estimatedDistance)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pickup Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-blue-500" />
                Pickup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span className="font-medium">{parcel.pickupName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <a
                  className="text-primary hover:underline"
                  href={`tel:${parcel.pickupPhone}`}
                >
                  {parcel.pickupPhone}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 size-4 text-muted-foreground" />
                <span className="text-sm">{parcel.pickupAddress}</span>
              </div>
              {parcel.pickupNotes && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <FileText className="mt-0.5 size-4" />
                  <span className="text-sm italic">{parcel.pickupNotes}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dropoff Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-green-500" />
                Dropoff
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span className="font-medium">{parcel.recipientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <a
                  className="text-primary hover:underline"
                  href={`tel:${parcel.recipientPhone}`}
                >
                  {parcel.recipientPhone}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 size-4 text-muted-foreground" />
                <span className="text-sm">{parcel.dropoffAddress}</span>
              </div>
              {parcel.dropoffNotes && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <FileText className="mt-0.5 size-4" />
                  <span className="text-sm italic">{parcel.dropoffNotes}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Package Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{parcel.description}</p>
              <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
                {parcel.weight && (
                  <div className="flex items-center gap-1">
                    <Scale className="size-4" />
                    {parcel.weight}kg
                  </div>
                )}
                {parcel.valueAmount && (
                  <div className="flex items-center gap-1">
                    <Shield className="size-4" />
                    Value:{" "}
                    {formatCurrency(parcel.valueAmount, parcel.valueCurrency)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Codes */}
          {(parcel.pickupCode || parcel.deliveryCode) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Shield className="size-4" />
                    Verification Codes
                  </span>
                  <Button
                    disabled={["delivered", "cancelled"].includes(
                      parcel.status
                    )}
                    onClick={handleRegenerateCodes}
                    size="sm"
                    variant="ghost"
                  >
                    Regenerate
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {parcel.pickupCode && (
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        Pickup Code
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="font-bold font-mono text-lg">
                          {parcel.pickupCode}
                        </code>
                        <Button
                          className="size-6"
                          onClick={() =>
                            copyToClipboard(parcel.pickupCode!, "Pickup code")
                          }
                          size="icon"
                          variant="ghost"
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {parcel.deliveryCode && (
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        Delivery Code
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="font-bold font-mono text-lg">
                          {parcel.deliveryCode}
                        </code>
                        <Button
                          className="size-6"
                          onClick={() =>
                            copyToClipboard(
                              parcel.deliveryCode!,
                              "Delivery code"
                            )
                          }
                          size="icon"
                          variant="ghost"
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rider Info */}
          {parcel.externalRiderName && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="size-4" />
                  Assigned Rider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium">
                    {parcel.externalRiderName}
                  </span>
                </div>
                {parcel.externalRiderPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <a
                      className="text-primary hover:underline"
                      href={`tel:${parcel.externalRiderPhone}`}
                    >
                      {parcel.externalRiderPhone}
                    </a>
                  </div>
                )}
                {parcel.riderAssignedAt && (
                  <p className="text-muted-foreground text-xs">
                    Assigned {formatRelativeTime(parcel.riderAssignedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {parcel.timeline && parcel.timeline.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parcel.timeline.map((event, index) => (
                    <div className="flex gap-3" key={index}>
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "size-2 rounded-full",
                            index === parcel.timeline!.length - 1
                              ? "bg-primary"
                              : "bg-muted-foreground/30"
                          )}
                        />
                        {index < parcel.timeline!.length - 1 && (
                          <div className="h-full w-px bg-muted-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="font-medium text-sm capitalize">
                          {event.eventType.replace(/_/g, " ")}
                        </p>
                        {event.description && (
                          <p className="text-muted-foreground text-xs">
                            {event.description}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {formatRelativeTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="font-semibold">Actions</h3>

            {/* Assign Rider */}
            {(parcel.status === "draft" || parcel.status === "pending") && (
              <div className="space-y-2">
                <Label>Assign Rider</Label>
                <div className="flex gap-2">
                  <Select
                    onValueChange={setSelectedRiderId}
                    value={selectedRiderId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {onlineRiders.length === 0 ? (
                        <SelectItem disabled value="_none">
                          No riders available
                        </SelectItem>
                      ) : (
                        onlineRiders.map((rider) => (
                          <SelectItem key={rider.clerkId} value={rider.clerkId}>
                            {rider.name}
                            {rider.distance &&
                              ` (${formatDistance(rider.distance)})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!selectedRiderId}
                    onClick={handleAssignRider}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Status Updates */}
            {nextStatuses.length > 0 &&
              !["canceled", "failed", "delivered"].includes(parcel.status) && (
                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses
                      .filter((s) => s !== "canceled" && s !== "failed")
                      .map((status) => (
                        <Button
                          key={status}
                          onClick={() => handleStatusUpdate(status)}
                          size="sm"
                          variant="outline"
                        >
                          {status.replace(/_/g, " ")}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

            {/* Add Note */}
            <div className="space-y-2">
              <Label>Add Note</Label>
              <div className="flex gap-2">
                <Textarea
                  className="min-h-[60px]"
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  value={noteText}
                />
              </div>
              <Button
                disabled={!noteText.trim()}
                onClick={handleAddNote}
                size="sm"
                variant="outline"
              >
                Add Note
              </Button>
            </div>

            {/* Cancel */}
            {canCancelParcel(parcel.status) && (
              <div className="space-y-2">
                {showCancelForm ? (
                  <>
                    <Label>Cancellation Reason</Label>
                    <Textarea
                      className="min-h-[80px]"
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Provide a reason for cancellation..."
                      value={cancelReason}
                    />
                    <div className="flex gap-2">
                      <Button
                        disabled={!cancelReason.trim()}
                        onClick={handleCancel}
                        variant="destructive"
                      >
                        Confirm Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setShowCancelForm(false);
                          setCancelReason("");
                        }}
                        variant="outline"
                      >
                        Back
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => setShowCancelForm(true)}
                    variant="destructive"
                  >
                    Cancel Parcel
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
