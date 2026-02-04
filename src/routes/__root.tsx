import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/tanstack-react-start";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import type { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type * as React from "react";

import { Toaster } from "~/components/ui/sonner";
import appCss from "~/styles/app.css?url";

// const fetchUserOrg = createServerFn({ method: 'GET' }).handler(async () => {
//   const { getToken, userId, orgId } = await auth()

//   const token = await getToken({ template: 'convex' })

//   return {
//     userId,
//     token,
//     orgId,
//   }
// })

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { getToken, userId, orgId, orgRole } = await auth();

  const token = await getToken({ template: "convex" });

  // Get user's publicMetadata and org memberships using clerkClient
  let publicMetadata: { [x: string]: {} } = {};
  let orgMemberships: Array<string> = [];

  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      publicMetadata = user.publicMetadata as { [x: string]: {} };

      // Get all organization memberships for this user
      const memberships = await client.users.getOrganizationMembershipList({
        userId,
      });
      orgMemberships = memberships.data.map((m) => m.organization.id);
    } catch (error) {
      console.error("Failed to fetch user metadata:", error);
    }
  }

  return {
    userId,
    token,
    publicMetadata,
    orgId,
    orgRole,
    orgMemberships,
    hasOrgMembership: orgMemberships.length > 0,
  };
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  beforeLoad: async (ctx) => {
    const clerkAuth = await fetchClerkAuth();
    const {
      userId,
      token,
      publicMetadata,
      orgId,
      orgRole,
      orgMemberships,
      hasOrgMembership,
    } = clerkAuth;
    // During SSR only (the only time serverHttpClient exists),
    // set the Clerk auth token to make HTTP queries with.
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      userId,
      token,
      publicMetadata,
      orgId,
      orgRole,
      orgMemberships,
      hasOrgMembership,
    };
  },
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <RootDocument>
          <Outlet />
        </RootDocument>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="flex gap-2 p-2 text-lg">
          <Link
            activeOptions={{ exact: true }}
            activeProps={{
              className: "font-bold",
            }}
            to="/"
          >
            Home
          </Link>

          <Link
            activeProps={{
              className: "font-bold",
            }}
            to="/user"
          >
            User
          </Link>
          <div className="ml-auto">
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" />
            </SignedOut>
          </div>
        </div>
        <hr />
        {children}
        <Toaster closeButton position="top-right" richColors />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
