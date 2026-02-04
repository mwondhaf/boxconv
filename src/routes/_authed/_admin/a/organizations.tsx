import { createFileRoute } from "@tanstack/react-router";
import { AdminOrganizationsPage } from "~/features/admin/pages/organizations";

export const Route = createFileRoute("/_authed/_admin/a/organizations")({
  component: AdminOrganizationsPage,
});
