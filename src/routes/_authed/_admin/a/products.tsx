import { createFileRoute } from "@tanstack/react-router";
import { AdminProductsPage } from "~/features/admin/pages/products";

export const Route = createFileRoute("/_authed/_admin/a/products")({
  component: AdminProductsPage,
});
