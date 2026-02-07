/**
 * Vendor Live Carts Monitoring Page
 * Real-time view of active shopping carts for the vendor's store
 * Includes notification sounds for new cart activity
 */

import {
  IconBell,
  IconBellOff,
  IconShoppingCart,
  IconUser,
  IconUserQuestion,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useOrganization } from "@clerk/tanstack-react-start";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  useNotificationSound,
  useActivityNotification,
} from "~/hooks/use-notification-sound";

export const Route = createFileRoute("/_authed/_vendor/v/live-carts")({
  component: VendorLiveCartsPage,
});

function VendorLiveCartsPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { play, setEnabled } = useNotificationSound({ soundType: "cart" });

  // Get current organization from Clerk
  const { organization: clerkOrg, isLoaded: clerkLoaded } = useOrganization();

  // Convert Clerk org ID to Convex organization ID
  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    clerkOrg?.id ? { clerkOrgId: clerkOrg.id } : "skip"
  );

  const organizationId = convexOrg?._id as Id<"organizations"> | undefined;

  // Get cart stats for this vendor
  const cartStats = useQuery(
    api.carts.getCartStats,
    organizationId ? { organizationId } : "skip"
  );

  // Get active carts for this vendor
  const activeCarts = useQuery(
    api.carts.listActiveCarts,
    organizationId ? { organizationId, limit: 50 } : "skip"
  );

  // Get activity feed for this vendor
  const activityFeed = useQuery(
    api.carts.getCartActivityFeed,
    organizationId ? { organizationId, limit: 20 } : "skip"
  );

  // Get latest activity for notification
  const latestActivity = useQuery(
    api.carts.getLatestCartActivity,
    organizationId ? { organizationId } : "skip"
  );

  // Handle new activity notifications
  useActivityNotification(latestActivity?.latestActivityAt, {
    enabled: soundEnabled,
    soundType: "cart",
    onNewActivity: () => {
      console.log("New cart activity detected for your store!");
    },
  });

  // Toggle sound notifications
  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setEnabled(newState);
    // Play a test sound when enabling
    if (newState) {
      play();
    }
  };

  const formatCurrency = (amount: number, currency = "UGX") => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  // Loading state
  if (!clerkLoaded || (clerkOrg && !convexOrg)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading cart data...</p>
        </div>
      </div>
    );
  }

  // No organization selected
  if (!clerkOrg) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Store Selected</CardTitle>
            <CardDescription>
              Please select a store from the organization switcher to view live
              cart activity.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Live Cart Activity
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring of shopping carts for {clerkOrg.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleToggleSound}
                className="gap-2"
              >
                {soundEnabled ? (
                  <>
                    <IconBell className="size-4" />
                    <span className="hidden sm:inline">Sound On</span>
                  </>
                ) : (
                  <>
                    <IconBellOff className="size-4" />
                    <span className="hidden sm:inline">Sound Off</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {soundEnabled
                ? "Click to disable notification sounds"
                : "Click to enable notification sounds"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Active Carts</CardTitle>
            <IconShoppingCart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {cartStats?.totalActiveCarts ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">
              {cartStats?.userCarts ?? 0} users, {cartStats?.guestCarts ?? 0}{" "}
              guests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Items in Carts</CardTitle>
            <IconShoppingCart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {cartStats?.totalItems ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">
              Waiting to be purchased
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Potential Revenue
            </CardTitle>
            <IconShoppingCart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(cartStats?.totalValue ?? 0, cartStats?.currency)}
            </div>
            <p className="text-muted-foreground text-xs">If all carts convert</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Avg Cart Value</CardTitle>
            <IconShoppingCart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(
                cartStats?.totalActiveCarts
                  ? Math.round(
                      (cartStats.totalValue ?? 0) / cartStats.totalActiveCarts
                    )
                  : 0,
                cartStats?.currency
              )}
            </div>
            <p className="text-muted-foreground text-xs">Per active cart</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Active Carts Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Carts</CardTitle>
            <CardDescription>
              Customers currently shopping in your store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!activeCarts || activeCarts.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-muted-foreground"
                      >
                        <IconShoppingCart className="mx-auto mb-2 size-8 opacity-50" />
                        <p>No active carts at the moment</p>
                        <p className="text-xs">
                          Carts will appear here when customers start shopping
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {activeCarts?.map((cart) => (
                    <TableRow key={cart._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                            {cart.isGuest ? (
                              <IconUserQuestion className="size-4 text-muted-foreground" />
                            ) : (
                              <IconUser className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {cart.isGuest ? "Guest Shopper" : "Registered User"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {cart.isGuest
                                ? `Session: ${cart.sessionId?.slice(0, 8)}...`
                                : `ID: ${cart.clerkId?.slice(0, 8)}...`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{cart.itemCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cart.subtotal, cart.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDistanceToNow(cart.lastActivityAt, {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Live Activity
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-green-500"></span>
              </span>
            </CardTitle>
            <CardDescription>Items being added to carts</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {(!activityFeed || activityFeed.length === 0) && (
                  <div className="py-8 text-center text-muted-foreground">
                    <IconShoppingCart className="mx-auto mb-2 size-8 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs">
                      New cart additions will appear here in real-time
                    </p>
                  </div>
                )}
                {activityFeed?.map((activity, index) => (
                  <div key={activity._id}>
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <Avatar className="size-10 rounded-lg">
                        {activity.imageUrl ? (
                          <AvatarImage
                            src={activity.imageUrl}
                            alt={activity.productName}
                          />
                        ) : null}
                        <AvatarFallback className="rounded-lg">
                          {activity.productName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Activity Details */}
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm leading-none">
                          {activity.productName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {activity.quantity}x @{" "}
                          {formatCurrency(activity.price, activity.currency)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={activity.isGuest ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {activity.isGuest ? "Guest" : "User"}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatDistanceToNow(activity.addedAt, {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <span className="font-medium text-sm">
                          {formatCurrency(activity.subtotal, activity.currency)}
                        </span>
                      </div>
                    </div>
                    {index < (activityFeed?.length ?? 0) - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Cart Details Grid */}
      {activeCarts && activeCarts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cart Contents</CardTitle>
            <CardDescription>
              What customers have in their carts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCarts.slice(0, 6).map((cart) => (
                <Card key={cart._id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-background">
                          {cart.isGuest ? (
                            <IconUserQuestion className="size-3" />
                          ) : (
                            <IconUser className="size-3" />
                          )}
                        </div>
                        <span className="font-medium text-sm">
                          {cart.isGuest ? "Guest" : "User"}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(cart.lastActivityAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {cart.items.slice(0, 4).map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8 rounded">
                              {item.imageUrl ? (
                                <AvatarImage src={item.imageUrl} />
                              ) : null}
                              <AvatarFallback className="rounded text-xs">
                                {item.productName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="max-w-[100px] truncate">
                              {item.productName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              x{item.quantity}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {formatCurrency(item.subtotal, item.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {cart.items.length > 4 && (
                        <p className="text-muted-foreground text-xs">
                          +{cart.items.length - 4} more items
                        </p>
                      )}
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Cart Total
                      </span>
                      <span className="font-bold">
                        {formatCurrency(cart.subtotal, cart.currencyCode)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activeCarts.length > 6 && (
              <p className="mt-4 text-center text-muted-foreground text-sm">
                Showing 6 of {activeCarts.length} active carts
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
