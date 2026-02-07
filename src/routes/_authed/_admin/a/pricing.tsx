import { createFileRoute } from "@tanstack/react-router";
import { AdminPricingPage } from "~/features/admin/pages/pricing";

export const Route = createFileRoute("/_authed/_admin/a/pricing")({
  component: AdminPricingPage,
});
