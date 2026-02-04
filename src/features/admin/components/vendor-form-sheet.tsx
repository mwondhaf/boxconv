"use client";

import { useForm } from "@tanstack/react-form";
import { Building2, Clock, Mail, MapPin, Phone, Tag } from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useOrganizationCategoriesFlat,
  useUpdateOrganizationBusinessData,
} from "../hooks/use-organizations";

// =============================================================================
// Types
// =============================================================================

export interface VendorBusinessData {
  clerkOrgId: string;
  name: string;
  slug: string;
  imageUrl?: string;
  // Business data from Convex
  email?: string;
  phone?: string;
  country?: string;
  cityOrDistrict?: string;
  town?: string;
  street?: string;
  categoryId?: Id<"organizationCategories">;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
  isBusy?: boolean;
}

export interface VendorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorBusinessData | null;
  onSuccess?: () => void;
}

// =============================================================================
// Schema
// =============================================================================

const vendorSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  cityOrDistrict: z.string().optional(),
  town: z.string().optional(),
  street: z.string().optional(),
  categoryId: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  timezone: z.string().optional(),
  isBusy: z.boolean().optional(),
});

// =============================================================================
// Component
// =============================================================================

export function VendorFormSheet({
  open,
  onOpenChange,
  vendor,
  onSuccess,
}: VendorFormSheetProps) {
  const categories = useOrganizationCategoriesFlat();
  const updateBusinessData = useUpdateOrganizationBusinessData();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: vendor?.email ?? "",
      phone: vendor?.phone ?? "",
      country: vendor?.country ?? "UG",
      cityOrDistrict: vendor?.cityOrDistrict ?? "",
      town: vendor?.town ?? "",
      street: vendor?.street ?? "",
      categoryId: vendor?.categoryId?.toString() ?? "",
      openingTime: vendor?.openingTime ?? "08:00",
      closingTime: vendor?.closingTime ?? "22:00",
      timezone: vendor?.timezone ?? "Africa/Kampala",
      isBusy: vendor?.isBusy ?? false,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = vendorSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      if (!vendor?.clerkOrgId) return;

      setServerError(null);
      try {
        await updateBusinessData({
          clerkOrgId: vendor.clerkOrgId,
          email: value.email || undefined,
          phone: value.phone || undefined,
          country: value.country || undefined,
          cityOrDistrict: value.cityOrDistrict || undefined,
          town: value.town || undefined,
          street: value.street || undefined,
          categoryId: value.categoryId
            ? (value.categoryId as Id<"organizationCategories">)
            : undefined,
          openingTime: value.openingTime || undefined,
          closingTime: value.closingTime || undefined,
          timezone: value.timezone || undefined,
          isBusy: value.isBusy,
        });
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to update vendor:", error);
        setServerError(
          error instanceof Error ? error.message : "Failed to update vendor"
        );
      }
    },
  });

  // Reset form when vendor changes
  React.useEffect(() => {
    if (vendor) {
      form.setFieldValue("email", vendor.email ?? "");
      form.setFieldValue("phone", vendor.phone ?? "");
      form.setFieldValue("country", vendor.country ?? "UG");
      form.setFieldValue("cityOrDistrict", vendor.cityOrDistrict ?? "");
      form.setFieldValue("town", vendor.town ?? "");
      form.setFieldValue("street", vendor.street ?? "");
      form.setFieldValue("categoryId", vendor.categoryId?.toString() ?? "");
      form.setFieldValue("openingTime", vendor.openingTime ?? "08:00");
      form.setFieldValue("closingTime", vendor.closingTime ?? "22:00");
      form.setFieldValue("timezone", vendor.timezone ?? "Africa/Kampala");
      form.setFieldValue("isBusy", vendor.isBusy ?? false);
    }
  }, [vendor]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            {vendor ? `Edit ${vendor.name}` : "Vendor Details"}
          </SheetTitle>
          <SheetDescription>
            Update the vendor's business information, location, and operating
            hours.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          id="vendor-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Store Status */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <Building2 className="size-4" />
                  Store Status
                </h3>
                <form.Field
                  children={(field) => (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div>
                        <Label className="font-medium" htmlFor="isBusy">
                          Pause Orders
                        </Label>
                        <p className="text-muted-foreground text-xs">
                          Customers won't be able to place orders
                        </p>
                      </div>
                      <Switch
                        checked={field.state.value}
                        id="isBusy"
                        onCheckedChange={field.handleChange}
                      />
                    </div>
                  )}
                  name="isBusy"
                />
              </div>

              <Separator />

              {/* Category */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <Tag className="size-4" />
                  Category
                </h3>
                <form.Field
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Business Category</Label>
                      <Select
                        onValueChange={(val) =>
                          field.handleChange(val === "none" ? "" : val)
                        }
                        value={field.state.value || "none"}
                      >
                        <SelectTrigger id="categoryId">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories?.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  name="categoryId"
                />
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <Phone className="size-4" />
                  Contact Information
                </h3>
                <div className="grid gap-3">
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label
                          className="flex items-center gap-2"
                          htmlFor="email"
                        >
                          <Mail className="size-3" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="store@example.com"
                          type="email"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="email"
                  />
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label
                          className="flex items-center gap-2"
                          htmlFor="phone"
                        >
                          <Phone className="size-3" />
                          Phone
                        </Label>
                        <Input
                          id="phone"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="+256 700 123456"
                          type="tel"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="phone"
                  />
                </div>
              </div>

              <Separator />

              {/* Location */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <MapPin className="size-4" />
                  Location
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="UG"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="country"
                  />
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="cityOrDistrict">City / District</Label>
                        <Input
                          id="cityOrDistrict"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Kampala"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="cityOrDistrict"
                  />
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="town">Town / Area</Label>
                        <Input
                          id="town"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Kololo"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="town"
                  />
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Plot 123, Main Street"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="street"
                  />
                </div>
              </div>

              <Separator />

              {/* Operating Hours */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  <Clock className="size-4" />
                  Operating Hours
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="openingTime">Opening Time</Label>
                        <Input
                          id="openingTime"
                          onChange={(e) => field.handleChange(e.target.value)}
                          type="time"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="openingTime"
                  />
                  <form.Field
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="closingTime">Closing Time</Label>
                        <Input
                          id="closingTime"
                          onChange={(e) => field.handleChange(e.target.value)}
                          type="time"
                          value={field.state.value}
                        />
                      </div>
                    )}
                    name="closingTime"
                  />
                </div>
                <form.Field
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Africa/Kampala"
                        value={field.state.value}
                      />
                      <p className="text-muted-foreground text-xs">
                        IANA format (e.g., Africa/Kampala, Europe/London)
                      </p>
                    </div>
                  )}
                  name="timezone"
                />
              </div>

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
                children={([canSubmit, isSubmitting]) => (
                  <Button disabled={!canSubmit || isSubmitting} type="submit">
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              />
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
