import { createFileRoute } from "@tanstack/react-router";
import { AdminRidersPage } from "~/features/admin/pages/riders";

export const Route = createFileRoute("/_authed/_admin/a/riders")({
  component: AdminRidersPage,
});
