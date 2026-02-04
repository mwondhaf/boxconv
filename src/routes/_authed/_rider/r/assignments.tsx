import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/_rider/r/assignments")({
  component: RiderAssignmentsPage,
});

function RiderAssignmentsPage() {
  return (
    <div>
      <h1>Assignments</h1>
    </div>
  );
}
