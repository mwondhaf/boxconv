import { Link } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { IconArrowRight, IconPlus, IconTruck, IconBuildingStore, IconSettings } from '@tabler/icons-react'

import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { ChartAreaInteractive } from '~/components/chart-area-interactive'
import { ChartBarInteractive } from '~/components/chart-bar-interactive'
import { AdminSectionCards } from '~/components/admin/admin-section-cards'

export const Route = createFileRoute('/_authed/_admin/a/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Platform overview. Manage orders, riders, vendors, and system settings.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/a/vendors">
                <IconBuildingStore className="me-2 size-4" />
                Vendors
              </Link>
            </Button>
            <Button asChild>
              <Link to="/a/riders">
                <IconTruck className="me-2 size-4" />
                Riders
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Section Cards */}
        <AdminSectionCards />

        {/* Charts Section */}
        <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
          <ChartAreaInteractive />
          <ChartBarInteractive />
        </div>

        {/* Quick Actions & Pending Items */}
        <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/a/orders">
                  <IconPlus className="me-2 size-4" />
                  Manage Orders
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/a/riders">
                  <IconTruck className="me-2 size-4" />
                  Manage Riders
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/a/vendors">
                  <IconBuildingStore className="me-2 size-4" />
                  Manage Vendors
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/a/settings">
                  <IconSettings className="me-2 size-4" />
                  Platform Settings
                  <IconArrowRight className="ms-auto size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/a/orders">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Demo activity items */}
                {[
                  { type: 'order', message: 'New order #1234 placed', vendor: 'Fresh Foods Ltd', time: '2 min ago', status: 'pending' },
                  { type: 'rider', message: 'Rider Moses T. went online', vendor: '', time: '5 min ago', status: 'online' },
                  { type: 'vendor', message: 'New vendor registration', vendor: 'Quick Bites', time: '15 min ago', status: 'pending' },
                  { type: 'order', message: 'Order #1230 delivered', vendor: 'City Grocers', time: '1 hour ago', status: 'delivered' },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-9 items-center justify-center rounded-full ${
                        activity.type === 'order' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        activity.type === 'rider' ? 'bg-green-100 dark:bg-green-900/30' :
                        'bg-purple-100 dark:bg-purple-900/30'
                      }`}>
                        {activity.type === 'order' && <IconPlus className="size-4 text-blue-600 dark:text-blue-400" />}
                        {activity.type === 'rider' && <IconTruck className="size-4 text-green-600 dark:text-green-400" />}
                        {activity.type === 'vendor' && <IconBuildingStore className="size-4 text-purple-600 dark:text-purple-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.message}</p>
                        {activity.vendor && (
                          <p className="text-xs text-muted-foreground">{activity.vendor}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <Badge
                        variant={
                          activity.status === 'delivered' ? 'default' :
                          activity.status === 'online' ? 'secondary' :
                          'outline'
                        }
                      >
                        {activity.status}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals Section */}
        <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
          {/* Pending Vendor Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Pending Vendors</CardTitle>
                <CardDescription>Awaiting approval</CardDescription>
              </div>
              <Badge variant="secondary">3</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Quick Bites', location: 'Kampala Central', time: '2 hours ago' },
                  { name: 'Fresh Market', location: 'Ntinda', time: '5 hours ago' },
                  { name: 'City Cafe', location: 'Kololo', time: '1 day ago' },
                ].map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">{vendor.location}</p>
                    </div>
                    <Button size="sm" variant="outline">Review</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Rider Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Pending Riders</CardTitle>
                <CardDescription>Awaiting verification</CardDescription>
              </div>
              <Badge variant="secondary">2</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'John Okello', vehicle: 'Motorcycle', time: '3 hours ago' },
                  { name: 'Peter Ssempa', vehicle: 'Bicycle', time: '1 day ago' },
                ].map((rider, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{rider.name}</p>
                      <p className="text-xs text-muted-foreground">{rider.vehicle}</p>
                    </div>
                    <Button size="sm" variant="outline">Review</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Support Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Support Tickets</CardTitle>
                <CardDescription>Open issues</CardDescription>
              </div>
              <Badge variant="secondary">5</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { subject: 'Payment not received', priority: 'high', time: '30 min ago' },
                  { subject: 'Order not delivered', priority: 'medium', time: '2 hours ago' },
                  { subject: 'App login issue', priority: 'low', time: '5 hours ago' },
                ].map((ticket, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">{ticket.time}</p>
                    </div>
                    <Badge
                      variant={
                        ticket.priority === 'high' ? 'destructive' :
                        ticket.priority === 'medium' ? 'secondary' :
                        'outline'
                      }
                    >
                      {ticket.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
