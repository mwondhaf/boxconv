import { createFileRoute, redirect } from "@tanstack/react-router";
import { VendorLayout } from "~/features/vendor";
import type { PublicMetadata } from "~/shared/types/roles";

export const Route = createFileRoute("/_authed/_vendor")({
  beforeLoad: ({ context }) => {
    const publicMetadata = context.publicMetadata as PublicMetadata | undefined;
    const hasOrgMembership = context.hasOrgMembership as boolean;

    // Riders cannot access vendor dashboard
    if (publicMetadata?.platformRole === "rider") {
      throw redirect({
        to: "/r",
      });
    }

    // Admins can access vendor dashboard
    if (publicMetadata?.platformRole === "admin") {
      return;
    }

    // Regular users must belong to an organization
    if (!hasOrgMembership) {
      throw redirect({
        to: "/",
        search: { error: "no_organization" },
      });
    }
  },
  component: VendorLayout,
});
