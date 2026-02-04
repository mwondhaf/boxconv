import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { ChartAreaInteractive } from "~/components/chart-area-interactive";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { VendorOrderStatusChart } from "~/components/vendor/vendor-order-status-chart";
import { VendorOrdersTable } from "~/components/vendor/vendor-orders-table";
import { VendorSectionCards } from "~/components/vendor/vendor-section-cards";
import { Can } from "~/shared/components/can";

export function VendorDashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your store.
            </p>
          </div>
          <div className="flex gap-2">
            <Can a="Product" I="create">
              <Button asChild>
                <Link to="/v/products">
                  <IconPlus className="me-2 size-4" />
                  Add Product
                </Link>
              </Button>
            </Can>
          </div>
        </div>

        {/* Stats Section Cards */}
        <VendorSectionCards />

        {/* Charts Section - Area Chart and Pie Chart side by side */}
        <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
          {/* Sales Area Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ChartAreaInteractive />
          </div>

          {/* Order Status Pie Chart - Takes 1 column */}
          <VendorOrderStatusChart />
        </div>

        {/* Quick Actions & Today's Summary */}
        <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Can a="Product" I="create">
                <Button asChild className="justify-start" variant="outline">
                  <Link to="/v/products">
                    <IconPlus className="me-2 size-4" />
                    Add New Product
                    <IconArrowRight className="ms-auto size-4" />
                  </Link>
                </Button>
              </Can>
              <Button asChild className="justify-start" variant="outline">
                <Link to="/v/orders">
                  View All Orders
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Button asChild className="justify-start" variant="outline">
                <Link to="/v/customers">
                  View Customers
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Can a="Settings" I="manage">
                <Button asChild className="justify-start" variant="outline">
                  <Link to="/v/settings">
                    Store Settings
                    <IconArrowRight className="ms-auto size-4" />
                  </Link>
                </Button>
              </Can>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Today's Summary</CardTitle>
                <CardDescription>Overview of today's activity</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1 rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">New Orders</p>
                  <p className="font-bold text-2xl">12</p>
                  <p className="text-green-600 text-xs dark:text-green-400">
                    +4 from yesterday
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">
                    Pending Delivery
                  </p>
                  <p className="font-bold text-2xl">8</p>
                  <p className="text-muted-foreground text-xs">
                    Awaiting dispatch
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">
                    Completed Today
                  </p>
                  <p className="font-bold text-2xl">15</p>
                  <p className="text-green-600 text-xs dark:text-green-400">
                    100% success rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <h2 className="font-semibold text-lg">Recent Orders</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/v/orders">View All Orders</Link>
            </Button>
          </div>
          <VendorOrdersTable />
        </div>
      </div>
    </div>
  );
}
