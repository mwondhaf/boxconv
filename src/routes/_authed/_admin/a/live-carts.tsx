/**
 * Admin Live Carts Monitoring Page
 * Real-time view of active shopping carts across all vendors
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
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { api } from "convex/_generated/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import { useNotificationSound, useActivityNotification } from "~/hooks/use-notification-sound";

export const Route = createFileRoute("/_authed/_admin/a/live-carts")({
  component: AdminLiveCartsPage,
});

function AdminLiveCartsPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { play, setEnabled } = useNotificationSound({ soundType: "cart" });

  // Get all organizations for filter
  const organizations = useQuery(api.organizations.list, { limit: 100 });

  // Get cart stats
  const cartStats = useQuery(api.carts.getCartStats, {
    organizationId: selectedOrg !== "all" ? (selectedOrg as any) : undefined,
  });

  // Get active carts
  const activeCarts = useQuery(api.carts.listActiveCarts, {
    organizationId: selectedOrg !== "all" ? (selectedOrg as any) : undefined,
    limit: 50,
  });

  // Get activity feed
  const activityFeed = useQuery(api.carts.getCartActivityFeed, {
    organizationId: selectedOrg !== "all" ? (selectedOrg as any) : undefined,
    limit: 20,
  });

  // Get latest activity for notification
  const latestActivity = useQuery(api.carts.getLatestCartActivity, {
    organizationId: selectedOrg !== "all" ? (selectedOrg as any) : undefined,
  });

  // Handle new activity notifications
  useActivityNotification(latestActivity?.latestActivityAt, {
    enabled: soundEnabled,
    soundType: "cart",
    onNewActivity: () => {
      // Could show a toast here as well
      console.log("New cart activity detected!");
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

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Live Cart Activity
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring of shopping carts across all vendors
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Organization Filter */}
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {organizations?.map((org) => (
                <SelectItem key={org._id} value={org._id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sound Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="icon"
                onClick={handleToggleSound}
              >
                {soundEnabled ? (
                  <IconBell className="size-4" />
                ) : (
                  <IconBellOff className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {soundEnabled ? "Sound notifications on" : "Sound notifications off"}
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
              {cartStats?.userCarts ?? 0} users, {cartStats?.guestCarts ?? 0} guests
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
              Across all active carts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Potential Revenue</CardTitle>
            <IconShoppingCart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(cartStats?.totalValue ?? 0, cartStats?.currency)}
            </div>
            <p className="text-muted-foreground text-xs">
              If all carts convert
            </p>
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
                  ? Math.round((cartStats.totalValue ?? 0) / cartStats.totalActiveCarts)
                  : 0,
                cartStats?.currency
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Per active cart
            </p>
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
              Shopping carts currently in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCarts?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No active carts at the moment
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
                              {cart.isGuest ? "Guest" : "Registered User"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {cart.isGuest
                                ? cart.sessionId?.slice(0, 8)
                                : cart.clerkId?.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cart.organizationName}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{cart.itemCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cart.subtotal, cart.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDistanceToNow(cart.lastActivityAt, { addSuffix: true })}
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
              Live Activity Feed
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-green-500"></span>
              </span>
            </CardTitle>
            <CardDescription>
              Real-time cart additions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {activityFeed?.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    No recent activity
                  </p>
                )}
                {activityFeed?.map((activity, index) => (
                  <div key={activity._id}>
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <Avatar className="size-10 rounded-lg">
                        {activity.imageUrl ? (
                          <AvatarImage src={activity.imageUrl} alt={activity.productName} />
                        ) : null}
                        <AvatarFallback className="rounded-lg">
                          <IconShoppingCart className="size-4" />
                        </AvatarFallback>
                      </Avatar>

                      {/* Activity Details */}
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm leading-none">
                          {activity.productName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {activity.quantity}x @ {formatCurrency(activity.price, activity.currency)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.organizationName}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatDistanceToNow(activity.addedAt, { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Customer Type */}
                      <div className="flex items-start">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant={activity.isGuest ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {activity.isGuest ? "Guest" : "User"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {activity.isGuest ? "Guest shopper" : "Registered user"}
                          </TooltipContent>
                        </Tooltip>
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

      {/* Cart Details Expandable Section */}
      {activeCarts && activeCarts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cart Contents</CardTitle>
            <CardDescription>
              Detailed view of items in active carts
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
                      <Badge variant="outline" className="text-xs">
                        {cart.organizationName}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {cart.items.slice(0, 3).map((item) => (
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
                            <span className="truncate max-w-[120px]">
                              {item.productName}
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                      {cart.items.length > 3 && (
                        <p className="text-muted-foreground text-xs">
                          +{cart.items.length - 3} more items
                        </p>
                      )}
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Total</span>
                      <span className="font-bold">
                        {formatCurrency(cart.subtotal, cart.currencyCode)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
