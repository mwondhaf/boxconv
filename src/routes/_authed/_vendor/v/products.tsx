import { createFileRoute } from "@tanstack/react-router";
import { VendorProductsPage } from "~/features/vendor";

export const Route = createFileRoute("/_authed/_vendor/v/products")({
  component: VendorProductsPage,
});
