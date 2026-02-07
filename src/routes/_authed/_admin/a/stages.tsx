import { createFileRoute } from "@tanstack/react-router";
import { AdminStagesPage } from "~/features/admin/pages/stages";

export const Route = createFileRoute("/_authed/_admin/a/stages")({
  component: AdminStagesPage,
});
