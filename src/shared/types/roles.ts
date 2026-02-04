/**
 * Platform roles stored in Clerk publicMetadata.platformRole
 *
 * - admin: BoxKuBox staff - full platform access (admin dashboard)
 * - rider: Delivery riders - can belong to rider organizations (rider dashboard)
 * - (undefined/customer): Default - vendor access via Clerk org membership
 */
export type PlatformRole = "admin" | "rider";

/**
 * Type for Clerk publicMetadata
 */
export interface PublicMetadata {
  platformRole?: PlatformRole;
  // Add other metadata fields as needed
}

/**
 * Check if user has admin role (BoxKuBox staff)
 */
export function isAdmin(metadata: PublicMetadata | undefined): boolean {
  return metadata?.platformRole === "admin";
}

/**
 * Check if user has rider role
 */
export function isRider(metadata: PublicMetadata | undefined): boolean {
  return metadata?.platformRole === "rider";
}

/**
 * Check if user is a regular user (no platform role)
 * Vendor access is determined by Clerk org membership, not platformRole
 */
export function isRegularUser(metadata: PublicMetadata | undefined): boolean {
  return !metadata?.platformRole;
}

/**
 * Get dashboard path based on platform role
 * Note: Vendor dashboard access is via org membership, not role
 */
export function getDashboardPath(
  metadata: PublicMetadata | undefined,
  hasOrgMembership: boolean
): string {
  switch (metadata?.platformRole) {
    case "admin":
      return "/admin";
    case "rider":
      return "/rider";
    default:
      // Regular users go to vendor if they're in an org
      return hasOrgMembership ? "/vendor" : "/";
  }
}
