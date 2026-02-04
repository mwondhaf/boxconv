import { OrganizationProfile } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/_vendor/v/team")({
  component: VendorTeamPage,
});

function VendorTeamPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-bold text-2xl">Team Management</h1>
        <p className="text-muted-foreground">
          Manage your organization's team members, roles, and invitations.
        </p>
      </div>

      {/* Clerk Organization Profile */}
      <div className="flex justify-center">
        <OrganizationProfile
          appearance={{
            elements: {
              rootBox: "w-full max-w-4xl",
              card: "shadow-none border rounded-lg",
              navbar: "hidden",
              pageScrollBox: "p-0",
            },
          }}
          routing="hash"
        />
      </div>
    </div>
  );
}
