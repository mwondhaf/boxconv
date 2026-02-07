import { createFileRoute } from "@tanstack/react-router";
import { AdminCoveragePage } from "~/features/admin/pages/coverage";

export const Route = createFileRoute("/_authed/_admin/a/coverage")({
  component: AdminCoveragePage,
});
