import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "~/features/admin";
import type { PublicMetadata } from "~/shared/types/roles";

export const Route = createFileRoute("/_authed/_admin")({
  beforeLoad: ({ context }) => {
    const publicMetadata = context.publicMetadata as PublicMetadata | undefined;

    // Only allow admin role
    const role = publicMetadata?.platformRole;
    if (role !== "admin") {
      throw redirect({
        to: "/",
        search: { error: "unauthorized" },
      });
    }
  },
  component: AdminLayout,
});
