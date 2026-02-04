import { createFileRoute } from "@tanstack/react-router";
import { VendorCustomersPage } from "~/features/vendor";

export const Route = createFileRoute("/_authed/_vendor/v/customers")({
  component: VendorCustomersPage,
});
