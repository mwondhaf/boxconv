import { createFileRoute } from '@tanstack/react-router'
import { useOrganization } from '@clerk/tanstack-react-start'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Save, MapPin, Phone, Mail, Building2, Globe } from 'lucide-react'
import * as React from 'react'

import { useOrganizationByClerkId, useUpdateOrganizationBusinessData } from '~/features/admin'
import {
  OperatingHoursForm,
  parseBusinessHours,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
} from '~/features/vendor/components/operating-hours-form'

import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'

export const Route = createFileRoute('/_authed/_vendor/v/settings')({
  component: VendorSettingsPage,
})

// =============================================================================
// Schema
// =============================================================================

const settingsSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  country: z.string().optional(),
  cityOrDistrict: z.string().optional(),
  town: z.string().optional(),
  street: z.string().optional(),
  timezone: z.string().optional(),
  isBusy: z.boolean().optional(),
})

// =============================================================================
// Component
// =============================================================================

function VendorSettingsPage() {
  const { organization: clerkOrg, isLoaded: clerkLoaded } = useOrganization()
  const convexOrg = useOrganizationByClerkId(clerkOrg?.id)
  const updateBusinessData = useUpdateOrganizationBusinessData()

  const [businessHours, setBusinessHours] = React.useState<BusinessHours>(
    DEFAULT_BUSINESS_HOURS
  )
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Initialize business hours from Convex data
  React.useEffect(() => {
    if (convexOrg?.businessHours) {
      setBusinessHours(parseBusinessHours(convexOrg.businessHours))
    }
  }, [convexOrg?.businessHours])

  const form = useForm({
    defaultValues: {
      email: convexOrg?.email ?? '',
      phone: convexOrg?.phone ?? '',
      country: convexOrg?.country ?? 'UG',
      cityOrDistrict: convexOrg?.cityOrDistrict ?? '',
      town: convexOrg?.town ?? '',
      street: convexOrg?.street ?? '',
      timezone: convexOrg?.timezone ?? 'Africa/Kampala',
      isBusy: convexOrg?.isBusy ?? false,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = settingsSchema.safeParse(value)
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(', ')
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      if (!clerkOrg?.id) return

      setSaveStatus('saving')
      try {
        await updateBusinessData({
          clerkOrgId: clerkOrg.id,
          email: value.email || undefined,
          phone: value.phone || undefined,
          country: value.country || undefined,
          cityOrDistrict: value.cityOrDistrict || undefined,
          town: value.town || undefined,
          street: value.street || undefined,
          timezone: value.timezone || undefined,
          isBusy: value.isBusy,
          businessHours,
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        console.error('Failed to save settings:', error)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    },
  })

  // Update form values when convexOrg data loads
  React.useEffect(() => {
    if (convexOrg) {
      form.setFieldValue('email', convexOrg.email ?? '')
      form.setFieldValue('phone', convexOrg.phone ?? '')
      form.setFieldValue('country', convexOrg.country ?? 'UG')
      form.setFieldValue('cityOrDistrict', convexOrg.cityOrDistrict ?? '')
      form.setFieldValue('town', convexOrg.town ?? '')
      form.setFieldValue('street', convexOrg.street ?? '')
      form.setFieldValue('timezone', convexOrg.timezone ?? 'Africa/Kampala')
      form.setFieldValue('isBusy', convexOrg.isBusy ?? false)
    }
  }, [convexOrg])

  if (!clerkLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!clerkOrg) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No organization selected. Please select an organization to manage settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your store's business information and operating hours.
          </p>
        </div>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              onClick={() => form.handleSubmit()}
              disabled={!canSubmit || isSubmitting || saveStatus === 'saving'}
            >
              <Save className="mr-2 size-4" />
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                  ? 'Saved!'
                  : saveStatus === 'error'
                    ? 'Error'
                    : 'Save Changes'}
            </Button>
          )}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        {/* Store Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Store Status
            </CardTitle>
            <CardDescription>
              Control whether your store is currently accepting orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.Field
              name="isBusy"
              children={(field) => (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <Label htmlFor="isBusy" className="font-medium">
                      Pause Orders
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, customers won't be able to place new orders.
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
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              How customers can reach your store.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <form.Field
              name="email"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="size-4" />
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
                    <Phone className="size-4" />
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
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5" />
              Location
            </CardTitle>
            <CardDescription>
              Your store's physical address for delivery purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>

        {/* Timezone */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5" />
              Timezone
            </CardTitle>
            <CardDescription>
              Set your store's timezone for accurate operating hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.Field
              name="timezone"
              children={(field) => (
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="Africa/Kampala"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use IANA timezone format (e.g., Africa/Kampala, Europe/London)
                  </p>
                </div>
              )}
            />
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <OperatingHoursForm
          value={businessHours}
          onChange={setBusinessHours}
          disabled={form.state.isSubmitting}
        />
      </form>
    </div>
  )
}
