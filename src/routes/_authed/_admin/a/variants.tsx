import { createFileRoute } from "@tanstack/react-router";
import { AdminVariantsPage } from "~/features/admin/pages/variants";

export const Route = createFileRoute("/_authed/_admin/a/variants")({
  component: AdminVariantsPage,
});
