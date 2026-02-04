'use client'

import * as React from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Building2, Clock, Mail, MapPin, Phone, Tag } from 'lucide-react'

import { useOrganizationCategoriesFlat, useUpdateOrganizationBusinessData } from '../hooks/use-organizations'
import type { Id } from '../../../../convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import { Switch } from '~/components/ui/switch'

// =============================================================================
// Types
// =============================================================================

export interface VendorBusinessData {
  clerkOrgId: string
  name: string
  slug: string
  imageUrl?: string
  // Business data from Convex
  email?: string
  phone?: string
  country?: string
  cityOrDistrict?: string
  town?: string
  street?: string
  categoryId?: Id<'organizationCategories'>
  openingTime?: string
  closingTime?: string
  timezone?: string
  isBusy?: boolean
}

export interface VendorFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor: VendorBusinessData | null
  onSuccess?: () => void
}

// =============================================================================
// Schema
// =============================================================================

const vendorSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
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
})

// =============================================================================
// Component
// =============================================================================

export function VendorFormSheet({
  open,
  onOpenChange,
  vendor,
  onSuccess,
}: VendorFormSheetProps) {
  const categories = useOrganizationCategoriesFlat()
  const updateBusinessData = useUpdateOrganizationBusinessData()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: vendor?.email ?? '',
      phone: vendor?.phone ?? '',
      country: vendor?.country ?? 'UG',
      cityOrDistrict: vendor?.cityOrDistrict ?? '',
      town: vendor?.town ?? '',
      street: vendor?.street ?? '',
      categoryId: vendor?.categoryId?.toString() ?? '',
      openingTime: vendor?.openingTime ?? '08:00',
      closingTime: vendor?.closingTime ?? '22:00',
      timezone: vendor?.timezone ?? 'Africa/Kampala',
      isBusy: vendor?.isBusy ?? false,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = vendorSchema.safeParse(value)
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(', ')
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      if (!vendor?.clerkOrgId) return

      setServerError(null)
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
            ? (value.categoryId as Id<'organizationCategories'>)
            : undefined,
          openingTime: value.openingTime || undefined,
          closingTime: value.closingTime || undefined,
          timezone: value.timezone || undefined,
          isBusy: value.isBusy,
        })
        onSuccess?.()
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to update vendor:', error)
        setServerError(
          error instanceof Error ? error.message : 'Failed to update vendor'
        )
      }
    },
  })

  // Reset form when vendor changes
  React.useEffect(() => {
    if (vendor) {
      form.setFieldValue('email', vendor.email ?? '')
      form.setFieldValue('phone', vendor.phone ?? '')
      form.setFieldValue('country', vendor.country ?? 'UG')
      form.setFieldValue('cityOrDistrict', vendor.cityOrDistrict ?? '')
      form.setFieldValue('town', vendor.town ?? '')
      form.setFieldValue('street', vendor.street ?? '')
      form.setFieldValue('categoryId', vendor.categoryId?.toString() ?? '')
      form.setFieldValue('openingTime', vendor.openingTime ?? '08:00')
      form.setFieldValue('closingTime', vendor.closingTime ?? '22:00')
      form.setFieldValue('timezone', vendor.timezone ?? 'Africa/Kampala')
      form.setFieldValue('isBusy', vendor.isBusy ?? false)
    }
  }, [vendor])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            {vendor ? `Edit ${vendor.name}` : 'Vendor Details'}
          </SheetTitle>
          <SheetDescription>
            Update the vendor's business information, location, and operating
            hours.
          </SheetDescription>
        </SheetHeader>

        <form
          id="vendor-form"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Store Status */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="size-4" />
                  Store Status
                </h3>
                <form.Field
                  name="isBusy"
                  children={(field) => (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <Label htmlFor="isBusy" className="font-medium">
                          Pause Orders
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Customers won't be able to place orders
                        </p>
                      </div>
                      <Switch
                        id="isBusy"
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                      />
                    </div>
                  )}
                />
              </div>

              <Separator />

              {/* Category */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Tag className="size-4" />
                  Category
                </h3>
                <form.Field
                  name="categoryId"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Business Category</Label>
                      <Select
                        value={field.state.value || 'none'}
                        onValueChange={(val) => field.handleChange(val === 'none' ? '' : val)}
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
                />
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Phone className="size-4" />
                  Contact Information
                </h3>
                <div className="grid gap-3">
                  <form.Field
                    name="email"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="size-3" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="store@example.com"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="phone"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <Phone className="size-3" />
                          Phone
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+256 700 123456"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Location */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="size-4" />
                  Location
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form.Field
                    name="country"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          placeholder="UG"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="cityOrDistrict"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="cityOrDistrict">City / District</Label>
                        <Input
                          id="cityOrDistrict"
                          placeholder="Kampala"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="town"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="town">Town / Area</Label>
                        <Input
                          id="town"
                          placeholder="Kololo"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="street"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          placeholder="Plot 123, Main Street"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Operating Hours */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="size-4" />
                  Operating Hours
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form.Field
                    name="openingTime"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="openingTime">Opening Time</Label>
                        <Input
                          id="openingTime"
                          type="time"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="closingTime"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="closingTime">Closing Time</Label>
                        <Input
                          id="closingTime"
                          type="time"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  />
                </div>
                <form.Field
                  name="timezone"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        placeholder="Africa/Kampala"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        IANA format (e.g., Africa/Kampala, Europe/London)
                      </p>
                    </div>
                  )}
                />
              </div>

              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </div>
          </div>

          <SheetFooter>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              />
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
