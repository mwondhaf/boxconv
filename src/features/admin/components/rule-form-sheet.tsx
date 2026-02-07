"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useConvexMutation, useConvexQuery } from "@convex-dev/react-query";
import { Loader2, Receipt } from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { api } from "convex/_generated/api";

// =============================================================================
// Types
// =============================================================================

export interface RuleData {
  _id: Id<"pricingRules">;
  zoneId?: Id<"deliveryZones">;
  name: string;
  baseFee: number;
  ratePerKm: number;
  minFee: number;
  surgeMultiplier: number;
  daysOfWeek?: number[];
  startHour?: number;
  endHour?: number;
  status: "active" | "inactive";
}

export interface RuleFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RuleData | null;
  onSuccess?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const MIN_HOUR = 0;
const MAX_HOUR = 23;
const MIN_DAY = 0;
const MAX_DAY = 6;
const DEFAULT_RATE_PER_KM = 500;
const DEFAULT_BASE_FEE = 3000;
const DEFAULT_MIN_FEE = 5000;

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// =============================================================================
// Schema
// =============================================================================

const ruleSchema = z.object({
  zoneId: z.string().optional(),
  name: z.string().min(1, "Rule name is required"),
  baseFee: z.coerce.number().int().nonnegative(),
  ratePerKm: z.coerce.number().int().positive(),
  minFee: z.coerce.number().int().nonnegative(),
  surgeMultiplier: z.coerce.number().positive(),
  daysOfWeek: z.array(z.number().int().min(MIN_DAY).max(MAX_DAY)),
  startHour: z.coerce.number().int().min(MIN_HOUR).max(MAX_HOUR).optional(),
  endHour: z.coerce.number().int().min(MIN_HOUR).max(MAX_HOUR).optional(),
  status: z.enum(["active", "inactive"]),
});

// =============================================================================
// Component
// =============================================================================

export function RuleFormSheet({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: RuleFormSheetProps) {
  const isEditing = !!rule;

  // Fetch zones for the dropdown
  const zones = useConvexQuery(api.deliveryZones.list, {});

  const createMutation = useMutation({
    mutationFn: useConvexMutation(api.pricingRules.create),
  });

  const updateMutation = useMutation({
    mutationFn: useConvexMutation(api.pricingRules.update),
  });

  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      zoneId: rule?.zoneId ?? "",
      name: rule?.name ?? "",
      baseFee: rule?.baseFee ?? DEFAULT_BASE_FEE,
      ratePerKm: rule?.ratePerKm ?? DEFAULT_RATE_PER_KM,
      minFee: rule?.minFee ?? DEFAULT_MIN_FEE,
      surgeMultiplier: rule?.surgeMultiplier ?? 1.0,
      daysOfWeek: rule?.daysOfWeek ?? [],
      startHour: rule?.startHour,
      endHour: rule?.endHour,
      status: rule?.status ?? ("active" as const),
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = ruleSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      try {
        const zoneId = value.zoneId || undefined;
        const daysOfWeek =
          value.daysOfWeek.length > 0 ? value.daysOfWeek : undefined;

        if (isEditing) {
          await updateMutation.mutateAsync({
            id: rule._id,
            zoneId: zoneId as Id<"deliveryZones"> | undefined,
            name: value.name,
            baseFee: value.baseFee,
            ratePerKm: value.ratePerKm,
            minFee: value.minFee,
            surgeMultiplier: value.surgeMultiplier,
            daysOfWeek,
            startHour: value.startHour,
            endHour: value.endHour,
            status: value.status,
          });
        } else {
          await createMutation.mutateAsync({
            zoneId: zoneId as Id<"deliveryZones"> | undefined,
            name: value.name,
            baseFee: value.baseFee,
            ratePerKm: value.ratePerKm,
            minFee: value.minFee,
            surgeMultiplier: value.surgeMultiplier,
            daysOfWeek,
            startHour: value.startHour,
            endHour: value.endHour,
            status: value.status,
          });
        }

        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save pricing rule:", error);
        setServerError(
          error instanceof Error ? error.message : "Failed to save pricing rule"
        );
      }
    },
  });

  // Reset form when rule changes
  React.useEffect(() => {
    if (rule) {
      form.setFieldValue("zoneId", rule.zoneId ?? "");
      form.setFieldValue("name", rule.name);
      form.setFieldValue("baseFee", rule.baseFee);
      form.setFieldValue("ratePerKm", rule.ratePerKm);
      form.setFieldValue("minFee", rule.minFee);
      form.setFieldValue("surgeMultiplier", rule.surgeMultiplier);
      form.setFieldValue("daysOfWeek", rule.daysOfWeek ?? []);
      form.setFieldValue("startHour", rule.startHour);
      form.setFieldValue("endHour", rule.endHour);
      form.setFieldValue("status", rule.status);
    } else {
      form.reset();
    }
  }, [rule]);

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
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            {rule ? `Edit ${rule.name}` : "Add Pricing Rule"}
          </SheetTitle>
          <SheetDescription>
            {rule
              ? "Update the pricing rule configuration."
              : "Create a new pricing rule for deliveries."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          id="rule-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <FieldGroup>
                <form.Field
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Zone</FieldLabel>
                      <Select
                        onValueChange={(value) =>
                          field.handleChange(value === "all" ? "" : value)
                        }
                        value={field.state.value || "all"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All zones" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All zones (global)</SelectItem>
                          {zones?.map((zone) => (
                            <SelectItem key={zone._id} value={zone._id}>
                              {zone.name} ({zone.city})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Leave as "All zones" for global rules
                      </FieldDescription>
                    </Field>
                  )}
                  name="zoneId"
                />

                <form.Field
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Rule Name *
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="e.g., Standard Rate"
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

                <div className="grid grid-cols-2 gap-4">
                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Base Fee (UGX)
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
                            placeholder="3000"
                            type="number"
                            value={field.state.value}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="baseFee"
                  />

                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Rate per km (UGX)
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
                            placeholder="500"
                            type="number"
                            value={field.state.value}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="ratePerKm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Min Fee (UGX)
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
                          <FieldDescription>Minimum delivery fee</FieldDescription>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="minFee"
                  />

                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Surge Multiplier
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(
                                Number.parseFloat(e.target.value) || 1.0
                              )
                            }
                            placeholder="1.0"
                            step="0.1"
                            type="number"
                            value={field.state.value}
                          />
                          <FieldDescription>1.0 = no surge</FieldDescription>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="surgeMultiplier"
                  />
                </div>

                <form.Field
                  children={(field) => (
                    <Field>
                      <FieldLabel>Days of Week</FieldLabel>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {DAYS.map((day) => {
                          const isSelected = field.state.value?.includes(
                            day.value
                          );
                          return (
                            <div
                              className="flex items-center space-x-2"
                              key={day.value}
                            >
                              <Checkbox
                                checked={isSelected}
                                id={`day-${day.value}`}
                                onCheckedChange={(checked) => {
                                  const current = field.state.value ?? [];
                                  if (checked) {
                                    field.handleChange([...current, day.value]);
                                  } else {
                                    field.handleChange(
                                      current.filter(
                                        (d: number) => d !== day.value
                                      )
                                    );
                                  }
                                }}
                              />
                              <label
                                className="cursor-pointer font-normal text-sm"
                                htmlFor={`day-${day.value}`}
                              >
                                {day.label}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <FieldDescription>
                        Leave empty for all days
                      </FieldDescription>
                    </Field>
                  )}
                  name="daysOfWeek"
                />

                <div className="grid grid-cols-2 gap-4">
                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Start Hour (0-23)
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            max={MAX_HOUR}
                            min={MIN_HOUR}
                            onBlur={field.handleBlur}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.handleChange(
                                val === ""
                                  ? undefined
                                  : Number.parseInt(val, 10)
                              );
                            }}
                            placeholder="Any"
                            type="number"
                            value={field.state.value ?? ""}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="startHour"
                  />

                  <form.Field
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            End Hour (0-23)
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            max={MAX_HOUR}
                            min={MIN_HOUR}
                            onBlur={field.handleBlur}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.handleChange(
                                val === ""
                                  ? undefined
                                  : Number.parseInt(val, 10)
                              );
                            }}
                            placeholder="Any"
                            type="number"
                            value={field.state.value ?? ""}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                    name="endHour"
                  />
                </div>

                <form.Field
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                      <Select
                        onValueChange={(value) =>
                          field.handleChange(value as "active" | "inactive")
                        }
                        value={field.state.value}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Inactive rules won't be used for pricing
                      </FieldDescription>
                    </Field>
                  )}
                  name="status"
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
                    ) : rule ? (
                      "Save Changes"
                    ) : (
                      "Create Rule"
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

export default RuleFormSheet;
