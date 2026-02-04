import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/_authed/user")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.user.profile, {})
    );
  },
});

function RouteComponent() {
  const { data: profile } = useSuspenseQuery(convexQuery(api.user.profile, {}));

  return (
    <div className="flex flex-col gap-2 p-2">
      {profile === null ? (
        <p>You are not logged in.</p>
      ) : (
        <p>Welcome! Your email address is {profile.email}.</p>
      )}
    </div>
  );
}
