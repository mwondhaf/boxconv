import { createFileRoute } from "@tanstack/react-router";
import { VendorOrdersPage } from "~/features/vendor";

export const Route = createFileRoute("/_authed/_vendor/v/orders")({
  component: VendorOrdersPage,
});
