import {
  IconArrowRight,
  IconCash,
  IconCircleCheckFilled,
  IconHistory,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconTruck,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RiderSectionCards } from "~/components/rider/rider-section-cards";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

export const Route = createFileRoute("/_authed/_rider/r/")({
  component: RiderDashboard,
});

function RiderDashboard() {
  // Demo state - in real app would come from Convex
  const isOnline = true;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <h1 className="font-bold text-2xl tracking-tight">
              Rider Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your deliveries and track your earnings.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Online/Offline Toggle */}
            <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
              <Switch checked={isOnline} id="online-status" />
              <Label className="font-medium" htmlFor="online-status">
                {isOnline ? (
                  <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                    </span>
                    Online
                  </span>
                ) : (
                  <span className="text-muted-foreground">Offline</span>
                )}
              </Label>
            </div>
          </div>
        </div>

        {/* Stats Section Cards */}
        <RiderSectionCards isOnline={isOnline} />

        {/* Current Deliveries & Quick Actions */}
        <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
          {/* Current Deliveries */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Current Deliveries</CardTitle>
                <CardDescription>
                  Orders you're currently delivering
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/r/assignments">View All Assignments</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Demo deliveries - in real app would come from Convex */}
                {[
                  {
                    id: "DEL-001",
                    orderNumber: "ORD-1234",
                    vendor: "Fresh Foods Ltd",
                    customer: "John Doe",
                    address: "Plot 45, Kampala Road, Kampala",
                    phone: "+256 701 234 567",
                    status: "in_transit",
                    items: 3,
                  },
                  {
                    id: "DEL-002",
                    orderNumber: "ORD-1235",
                    vendor: "City Grocers",
                    customer: "Jane Smith",
                    address: "Ntinda Shopping Center, Ntinda",
                    phone: "+256 702 345 678",
                    status: "picked_up",
                    items: 2,
                  },
                ].map((delivery) => (
                  <div
                    className="flex flex-col gap-3 rounded-lg border p-4"
                    key={delivery.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                          <IconTruck className="size-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{delivery.orderNumber}</p>
                          <p className="text-muted-foreground text-sm">
                            from {delivery.vendor}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          delivery.status === "in_transit"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {delivery.status === "in_transit"
                          ? "In Transit"
                          : "Picked Up"}
                      </Badge>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-start gap-2 text-sm">
                        <IconMapPin className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{delivery.customer}</p>
                          <p className="text-muted-foreground">
                            {delivery.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <IconPhone className="size-4 text-muted-foreground" />
                        <a
                          className="text-primary hover:underline"
                          href={`tel:${delivery.phone}`}
                        >
                          {delivery.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <IconPackage className="size-4" />
                        <span>{delivery.items} items</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <IconPhone className="me-1 size-4" />
                          Call
                        </Button>
                        <Button size="sm">
                          <IconCircleCheckFilled className="me-1 size-4" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild className="justify-start" variant="outline">
                <Link to="/r/assignments">
                  <IconTruck className="me-2 size-4" />
                  View Assignments
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Button asChild className="justify-start" variant="outline">
                <Link to="/r/history">
                  <IconHistory className="me-2 size-4" />
                  Delivery History
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Button asChild className="justify-start" variant="outline">
                <Link to="/r/earnings">
                  <IconCash className="me-2 size-4" />
                  View Earnings
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pending Assignments */}
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Assignments</CardTitle>
                <CardDescription>Orders waiting for pickup</CardDescription>
              </div>
              <Badge variant="secondary">5 pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Demo pending assignments */}
                {[
                  {
                    id: "ASN-001",
                    orderNumber: "ORD-1240",
                    vendor: "Quick Bites",
                    location: "Kampala Central",
                    distance: "2.5 km",
                    reward: "UGX 5,000",
                  },
                  {
                    id: "ASN-002",
                    orderNumber: "ORD-1241",
                    vendor: "Fresh Market",
                    location: "Kololo",
                    distance: "4.2 km",
                    reward: "UGX 7,500",
                  },
                  {
                    id: "ASN-003",
                    orderNumber: "ORD-1242",
                    vendor: "City Cafe",
                    location: "Nakasero",
                    distance: "1.8 km",
                    reward: "UGX 4,000",
                  },
                ].map((assignment) => (
                  <div
                    className="flex flex-col gap-3 rounded-lg border p-4"
                    key={assignment.id}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{assignment.orderNumber}</p>
                        <p className="text-muted-foreground text-sm">
                          {assignment.vendor}
                        </p>
                      </div>
                      <Badge
                        className="text-green-600 dark:text-green-400"
                        variant="outline"
                      >
                        {assignment.reward}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <IconMapPin className="size-4" />
                      <span>{assignment.location}</span>
                      <span>•</span>
                      <span>{assignment.distance}</span>
                    </div>
                    <Button className="w-full" size="sm">
                      Accept Assignment
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Summary */}
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>This Week's Summary</CardTitle>
              <CardDescription>
                Your delivery performance this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1 rounded-lg border p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    Total Deliveries
                  </p>
                  <p className="font-bold text-2xl">47</p>
                </div>
                <div className="space-y-1 rounded-lg border p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    Total Earnings
                  </p>
                  <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                    UGX 385,000
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border p-4 text-center">
                  <p className="text-muted-foreground text-sm">Avg. Rating</p>
                  <p className="font-bold text-2xl">4.8 ⭐</p>
                </div>
                <div className="space-y-1 rounded-lg border p-4 text-center">
                  <p className="text-muted-foreground text-sm">On-Time Rate</p>
                  <p className="font-bold text-2xl">96%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
