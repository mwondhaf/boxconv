import { createFileRoute } from "@tanstack/react-router";
import { VendorDashboardPage } from "~/features/vendor";

export const Route = createFileRoute("/_authed/_vendor/v/")({
  component: VendorDashboardPage,
});
