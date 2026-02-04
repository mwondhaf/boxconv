import { useOrganization } from "@clerk/tanstack-react-start";
import { useUploadFile } from "@convex-dev/r2/react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import {
  Building2,
  Globe,
  ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  useOrganizationByClerkId,
  useUpdateOrganizationBusinessData,
} from "~/features/admin";
import {
  type BusinessHours,
  DEFAULT_BUSINESS_HOURS,
  OperatingHoursForm,
  parseBusinessHours,
} from "~/features/vendor/components/operating-hours-form";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_authed/_vendor/v/settings")({
  component: VendorSettingsPage,
});

// =============================================================================
// Schema
// =============================================================================

const settingsSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  cityOrDistrict: z.string().optional(),
  town: z.string().optional(),
  street: z.string().optional(),
  lat: z.number().min(-90).max(90).optional().or(z.literal("")),
  lng: z.number().min(-180).max(180).optional().or(z.literal("")),
  timezone: z.string().optional(),
  isBusy: z.boolean().optional(),
});

// =============================================================================
// Geohash utility
// =============================================================================

function encodeGeohash(lat: number, lng: number, precision = 9): string {
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let minLat = -90,
    maxLat = 90;
  let minLng = -180,
    maxLng = 180;
  let hash = "";
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

// =============================================================================
// Logo Upload Component
// =============================================================================

interface LogoUploadProps {
  currentLogo?: string | null;
  organizationName: string;
  onUpload: (r2Key: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function LogoUpload({
  currentLogo,
  organizationName,
  onUpload,
  onRemove,
  disabled = false,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const uploadFile = useUploadFile(api.r2);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      setIsUploading(true);
      setError(null);

      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      try {
        const r2Key = await uploadFile(file);
        onUpload(r2Key);
      } catch (e) {
        console.error("Logo upload failed:", e);
        setError(e instanceof Error ? e.message : "Upload failed");
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile, onUpload]
  );

  const handleRemove = () => {
    setPreviewUrl(null);
    onRemove();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  const displayLogo = previewUrl || currentLogo;

  return (
    <div className="space-y-3">
      {displayLogo ? (
        <div className="flex items-start gap-4">
          <div className="relative">
            <div
              className="size-24 rounded-lg border bg-center bg-cover bg-muted/30"
              style={{ backgroundImage: `url(${displayLogo})` }}
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                <Loader2 className="size-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              Your store logo is displayed to customers in the app.
            </p>
            <div className="flex gap-2">
              <Button
                disabled={disabled || isUploading}
                size="sm"
                type="button"
                variant="outline"
                {...getRootProps()}
              >
                <input {...getInputProps()} aria-label="Upload new logo" />
                <Upload className="mr-1 size-3" />
                Change
              </Button>
              <Button
                disabled={disabled || isUploading}
                onClick={handleRemove}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 className="mr-1 size-3" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragActive && "border-primary bg-primary/5",
            isUploading && "cursor-not-allowed opacity-50",
            !disabled && "hover:bg-muted/30"
          )}
        >
          <input
            {...getInputProps()}
            aria-label={`Upload logo for ${organizationName}`}
          />
          <div className="rounded-full bg-muted p-3">
            {isUploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            {isUploading ? (
              <p className="text-sm">Uploading...</p>
            ) : isDragActive ? (
              <p className="text-sm">Drop the image here</p>
            ) : (
              <>
                <p className="font-medium text-sm">
                  Click to upload or drag and drop
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  PNG, JPG, GIF or WebP (max 5MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// GPS Coordinates Component
// =============================================================================

interface GPSCoordinatesProps {
  lat: string;
  lng: string;
  onLatChange: (value: string) => void;
  onLngChange: (value: string) => void;
  disabled?: boolean;
}

function GPSCoordinates({
  lat,
  lng,
  onLatChange,
  onLngChange,
  disabled = false,
}: GPSCoordinatesProps) {
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLatChange(position.coords.latitude.toFixed(6));
        onLngChange(position.coords.longitude.toFixed(6));
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              "Location permission denied. Please enable it in your browser settings."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An unknown error occurred.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      }
    );
  };

  const hasCoordinates = lat && lng;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            disabled={disabled || isGettingLocation}
            id="lat"
            max="90"
            min="-90"
            onChange={(e) => onLatChange(e.target.value)}
            placeholder="0.347596"
            step="0.000001"
            type="number"
            value={lat}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            disabled={disabled || isGettingLocation}
            id="lng"
            max="180"
            min="-180"
            onChange={(e) => onLngChange(e.target.value)}
            placeholder="32.582520"
            step="0.000001"
            type="number"
            value={lng}
          />
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row">
        <Button
          disabled={disabled || isGettingLocation}
          onClick={handleGetCurrentLocation}
          size="sm"
          type="button"
          variant="outline"
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <Navigation className="mr-2 size-4" />
              Use Current Location
            </>
          )}
        </Button>

        {hasCoordinates && (
          <a
            className="flex items-center gap-1 text-primary text-sm hover:underline"
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MapPin className="size-3" />
            View on Google Maps
          </a>
        )}
      </div>

      {locationError && (
        <p className="text-destructive text-sm" role="alert">
          {locationError}
        </p>
      )}

      <p className="text-muted-foreground text-xs">
        GPS coordinates are used to calculate delivery distances and show your
        store on the map. You can enter them manually or use your current
        location.
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function VendorSettingsPage() {
  const { organization: clerkOrg, isLoaded: clerkLoaded } = useOrganization();
  const convexOrg = useOrganizationByClerkId(clerkOrg?.id);
  const updateBusinessData = useUpdateOrganizationBusinessData();

  const [businessHours, setBusinessHours] = React.useState<BusinessHours>(
    DEFAULT_BUSINESS_HOURS
  );
  const [saveStatus, setSaveStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Logo state (managed separately for immediate preview)
  const [logoR2Key, setLogoR2Key] = React.useState<string | null>(null);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

  // Lat/Lng state (managed as strings for input handling)
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");

  // Initialize business hours from Convex data
  React.useEffect(() => {
    if (convexOrg?.businessHours) {
      setBusinessHours(parseBusinessHours(convexOrg.businessHours));
    }
  }, [convexOrg?.businessHours]);

  // Initialize logo from Convex data (use logoUrl which resolves R2 keys to URLs)
  React.useEffect(() => {
    if (convexOrg?.logoUrl) {
      setLogoUrl(convexOrg.logoUrl);
    }
  }, [convexOrg?.logoUrl]);

  // Initialize lat/lng from Convex data
  React.useEffect(() => {
    if (convexOrg?.lat !== undefined && convexOrg?.lat !== null) {
      setLat(convexOrg.lat.toString());
    }
    if (convexOrg?.lng !== undefined && convexOrg?.lng !== null) {
      setLng(convexOrg.lng.toString());
    }
  }, [convexOrg?.lat, convexOrg?.lng]);

  const form = useForm({
    defaultValues: {
      email: convexOrg?.email ?? "",
      phone: convexOrg?.phone ?? "",
      country: convexOrg?.country ?? "UG",
      cityOrDistrict: convexOrg?.cityOrDistrict ?? "",
      town: convexOrg?.town ?? "",
      street: convexOrg?.street ?? "",
      timezone: convexOrg?.timezone ?? "Africa/Kampala",
      isBusy: convexOrg?.isBusy ?? false,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = settingsSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      if (!clerkOrg?.id) return;

      setSaveStatus("saving");
      try {
        // Parse lat/lng
        const parsedLat = lat ? Number.parseFloat(lat) : undefined;
        const parsedLng = lng ? Number.parseFloat(lng) : undefined;

        // Calculate geohash if we have valid coordinates
        let geohash: string | undefined;
        if (
          parsedLat !== undefined &&
          parsedLng !== undefined &&
          !isNaN(parsedLat) &&
          !isNaN(parsedLng)
        ) {
          geohash = encodeGeohash(parsedLat, parsedLng);
        }

        await updateBusinessData({
          clerkOrgId: clerkOrg.id,
          email: value.email || undefined,
          phone: value.phone || undefined,
          country: value.country || undefined,
          cityOrDistrict: value.cityOrDistrict || undefined,
          town: value.town || undefined,
          street: value.street || undefined,
          lat: parsedLat,
          lng: parsedLng,
          geohash,
          timezone: value.timezone || undefined,
          isBusy: value.isBusy,
          businessHours,
          // Include logo if it was changed
          ...(logoR2Key && { logo: logoR2Key }),
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Failed to save settings:", error);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
  });

  // Update form values when convexOrg data loads
  React.useEffect(() => {
    if (convexOrg) {
      form.setFieldValue("email", convexOrg.email ?? "");
      form.setFieldValue("phone", convexOrg.phone ?? "");
      form.setFieldValue("country", convexOrg.country ?? "UG");
      form.setFieldValue("cityOrDistrict", convexOrg.cityOrDistrict ?? "");
      form.setFieldValue("town", convexOrg.town ?? "");
      form.setFieldValue("street", convexOrg.street ?? "");
      form.setFieldValue("timezone", convexOrg.timezone ?? "Africa/Kampala");
      form.setFieldValue("isBusy", convexOrg.isBusy ?? false);
    }
  }, [convexOrg]);

  const handleLogoUpload = (r2Key: string) => {
    setLogoR2Key(r2Key);
    // The preview is handled by the LogoUpload component
  };

  const handleLogoRemove = () => {
    setLogoR2Key(null);
    setLogoUrl(null);
  };

  if (!clerkLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!clerkOrg) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No organization selected. Please select an organization to manage
              settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-bold text-2xl">Store Settings</h1>
          <p className="text-muted-foreground">
            Manage your store's business information, location, and operating
            hours.
          </p>
        </div>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting || saveStatus === "saving"}
              onClick={() => form.handleSubmit()}
            >
              <Save className="mr-2 size-4" />
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved!"
                  : saveStatus === "error"
                    ? "Error"
                    : "Save Changes"}
            </Button>
          )}
        </form.Subscribe>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {/* Store Logo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              Store Logo
            </CardTitle>
            <CardDescription>
              Upload your store's logo. This will be displayed to customers in
              the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LogoUpload
              currentLogo={logoUrl}
              disabled={form.state.isSubmitting}
              onRemove={handleLogoRemove}
              onUpload={handleLogoUpload}
              organizationName={clerkOrg.name}
            />
          </CardContent>
        </Card>

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
              children={(field) => (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                  <div>
                    <Label className="font-medium" htmlFor="isBusy">
                      Pause Orders
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      When enabled, customers won't be able to place new orders.
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
              children={(field) => (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2" htmlFor="email">
                    <Mail className="size-4" />
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
                  <Label className="flex items-center gap-2" htmlFor="phone">
                    <Phone className="size-4" />
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
          </CardContent>
        </Card>

        {/* Location Address */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5" />
              Location Address
            </CardTitle>
            <CardDescription>
              Your store's physical address for display purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>

        {/* GPS Coordinates */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="size-5" />
              GPS Coordinates
            </CardTitle>
            <CardDescription>
              Precise location for delivery distance calculations and map
              display.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GPSCoordinates
              disabled={form.state.isSubmitting}
              lat={lat}
              lng={lng}
              onLatChange={setLat}
              onLngChange={setLng}
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
              children={(field) => (
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Africa/Kampala"
                    value={field.state.value}
                  />
                  <p className="text-muted-foreground text-xs">
                    Use IANA timezone format (e.g., Africa/Kampala,
                    Europe/London)
                  </p>
                </div>
              )}
              name="timezone"
            />
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <OperatingHoursForm
          disabled={form.state.isSubmitting}
          onChange={setBusinessHours}
          value={businessHours}
        />
      </form>
    </div>
  );
}
