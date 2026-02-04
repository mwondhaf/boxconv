import { Link } from '@tanstack/react-router'
import { IconPlus, IconArrowRight } from '@tabler/icons-react'

import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { ChartAreaInteractive } from '~/components/chart-area-interactive'
import { VendorSectionCards } from '~/components/vendor/vendor-section-cards'
import { VendorOrdersTable } from '~/components/vendor/vendor-orders-table'
import { VendorOrderStatusChart } from '~/components/vendor/vendor-order-status-chart'
import { Can } from '~/shared/components/can'

export function VendorDashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your store.
            </p>
          </div>
          <div className="flex gap-2">
            <Can I="create" a="Product">
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
              <Can I="create" a="Product">
                <Button variant="outline" className="justify-start" asChild>
                  <Link to="/v/products">
                    <IconPlus className="me-2 size-4" />
                    Add New Product
                    <IconArrowRight className="ms-auto size-4" />
                  </Link>
                </Button>
              </Can>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/v/orders">
                  View All Orders
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/v/customers">
                  View Customers
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Can I="manage" a="Settings">
                <Button variant="outline" className="justify-start" asChild>
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
                  <p className="text-sm text-muted-foreground">New Orders</p>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-green-600 dark:text-green-400">+4 from yesterday</p>
                </div>
                <div className="space-y-1 rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Pending Delivery</p>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-xs text-muted-foreground">Awaiting dispatch</p>
                </div>
                <div className="space-y-1 rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                  <p className="text-2xl font-bold">15</p>
                  <p className="text-xs text-green-600 dark:text-green-400">100% success rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 lg:px-6">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/v/orders">View All Orders</Link>
            </Button>
          </div>
          <VendorOrdersTable />
        </div>
      </div>
    </div>
  )
}
