"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useConvexMutation } from "@convex-dev/react-query";
import { Loader2, MapPin } from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { api } from "convex/_generated/api";

// =============================================================================
// Types
// =============================================================================

export interface ZoneData {
  _id: Id<"deliveryZones">;
  name: string;
  city: string;
  country: string;
  centerLat: number;
  centerLng: number;
  maxDistanceMeters: number;
  color?: string;
  active: boolean;
}

export interface ZoneFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: ZoneData | null;
  onSuccess?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_DISTANCE_M = 5000;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

// Default colors for zones
const ZONE_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// =============================================================================
// Schema
// =============================================================================

const zoneSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(2, "Country code is required").max(3),
  centerLat: z.coerce.number().min(MIN_LATITUDE).max(MAX_LATITUDE),
  centerLng: z.coerce.number().min(MIN_LONGITUDE).max(MAX_LONGITUDE),
  maxDistanceMeters: z.coerce.number().int().positive(),
  color: z.string().optional(),
  active: z.boolean(),
});

// =============================================================================
// Component
// =============================================================================

export function ZoneFormSheet({
  open,
  onOpenChange,
  zone,
  onSuccess,
}: ZoneFormSheetProps) {
  const isEditing = !!zone;

  const createMutation = useMutation({
    mutationFn: useConvexMutation(api.deliveryZones.create),
  });

  const updateMutation = useMutation({
    mutationFn: useConvexMutation(api.deliveryZones.update),
  });

  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: zone?.name ?? "",
      city: zone?.city ?? "",
      country: zone?.country ?? "UG",
      centerLat: zone?.centerLat ?? 0,
      centerLng: zone?.centerLng ?? 0,
      maxDistanceMeters: zone?.maxDistanceMeters ?? DEFAULT_MAX_DISTANCE_M,
      color: zone?.color ?? ZONE_COLORS[0],
      active: zone?.active ?? true,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = zoneSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      try {
        if (isEditing) {
          await updateMutation.mutateAsync({
            id: zone._id,
            name: value.name,
            city: value.city,
            country: value.country,
            centerLat: value.centerLat,
            centerLng: value.centerLng,
            maxDistanceMeters: value.maxDistanceMeters,
            color: value.color,
            active: value.active,
          });
        } else {
          await createMutation.mutateAsync({
            name: value.name,
            city: value.city,
            country: value.country,
            centerLat: value.centerLat,
            centerLng: value.centerLng,
            maxDistanceMeters: value.maxDistanceMeters,
            color: value.color,
            active: value.active,
          });
        }

        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save zone:", error);
        setServerError(
          error instanceof Error ? error.message : "Failed to save zone"
        );
      }
    },
  });

  // Reset form when zone changes
  React.useEffect(() => {
    if (zone) {
      form.setFieldValue("name", zone.name);
      form.setFieldValue("city", zone.city);
      form.setFieldValue("country", zone.country);
      form.setFieldValue("centerLat", zone.centerLat);
      form.setFieldValue("centerLng", zone.centerLng);
      form.setFieldValue("maxDistanceMeters", zone.maxDistanceMeters);
      form.setFieldValue("color", zone.color ?? ZONE_COLORS[0]);
      form.setFieldValue("active", zone.active);
    } else {
      form.reset();
    }
  }, [zone]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="size-5" />
            {zone ? `Edit ${zone.name}` : "Add Delivery Zone"}
          </SheetTitle>
          <SheetDescription>
            {zone
              ? "Update the delivery zone configuration."
              : "Define a new delivery coverage area."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          id="zone-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <FieldGroup>
                <form.Field
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Zone Name *
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g., Central Kampala"
                          value={field.state.value}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                  name="name"
                />

                <form.Field
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>City *</FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g., Kampala"
                          value={field.state.value}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                  name="city"
                />

                <form.Field
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Country Code *
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          maxLength={3}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(e.target.value.toUpperCase())
                          }
                          placeholder="UG"
                          value={field.state.value}
                        />
                        <FieldDescription>
                          ISO country code (e.g., UG for Uganda)
                        </FieldDescription>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                  name="country"
                />

                <div className="grid grid-cols-2 gap-4">
                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Latitude *
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.3476"
                            step="any"
                            type="number"
                            value={field.state.value}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="centerLat"
                  />

                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Longitude *
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="32.5825"
                            step="any"
                            type="number"
                            value={field.state.value}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="centerLng"
                  />
                </div>

                <form.Field
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    const distanceKm = field.state.value / 1000;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Max Distance (meters) *
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(
                              Number.parseInt(e.target.value, 10) || 0
                            )
                          }
                          placeholder="5000"
                          type="number"
                          value={field.state.value}
                        />
                        <FieldDescription>
                          {distanceKm.toFixed(1)} km max driving distance
                        </FieldDescription>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                  name="maxDistanceMeters"
                />

                <form.Field
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Zone Color</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {ZONE_COLORS.map((color) => (
                          <button
                            className={`size-8 rounded-full border-2 transition-all ${
                              field.state.value === color
                                ? "border-foreground scale-110"
                                : "border-transparent"
                            }`}
                            key={color}
                            onClick={() => field.handleChange(color)}
                            style={{ backgroundColor: color }}
                            type="button"
                          />
                        ))}
                      </div>
                      <FieldDescription>
                        Color used to display this zone on maps
                      </FieldDescription>
                    </Field>
                  )}
                  name="color"
                />

                <form.Field
                  children={(field) => (
                    <Field>
                      <div className="flex items-center justify-between">
                        <div>
                          <FieldLabel htmlFor={field.name}>Active</FieldLabel>
                          <FieldDescription>
                            Inactive zones won't be used for deliveries
                          </FieldDescription>
                        </div>
                        <Switch
                          checked={field.state.value}
                          id={field.name}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked)
                          }
                        />
                      </div>
                    </Field>
                  )}
                  name="active"
                />
              </FieldGroup>

              {serverError && (
                <p className="text-destructive text-sm">{serverError}</p>
              )}
            </div>
          </div>

          <SheetFooter>
            <div className="ml-auto flex gap-2">
              <Button
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    disabled={!canSubmit || isSubmitting || isPending}
                    type="submit"
                  >
                    {isSubmitting || isPending ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : zone ? (
                      "Save Changes"
                    ) : (
                      "Create Zone"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default ZoneFormSheet;
