import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/_admin/a/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return <div>Admin Settings</div>;
}
