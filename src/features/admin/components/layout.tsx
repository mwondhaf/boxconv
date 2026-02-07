import { Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Percent,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";

import type { NavMainItem } from "~/components/sidebar";
import {
  AppSidebar,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { useSyncAbility } from "~/shared/hooks/use-sync-ability";

/**
 * Admin navigation items - platform admins have full access
 */
const adminNavItems: Array<NavMainItem> = [
  {
    title: "Dashboard",
    url: "/a",
    icon: LayoutDashboard,
  },
  // Orders & Fulfillment Group
  {
    title: "Orders & Fulfillment",
    url: "/a/orders",
    icon: ShoppingCart,
    items: [
      { title: "Orders", url: "/a/orders" },
      { title: "Live Carts", url: "/a/live-carts" },
      { title: "Parcels", url: "/a/parcels" },
    ],
  },
  // Delivery & Logistics Group
  {
    title: "Delivery",
    url: "/a/riders",
    icon: Truck,
    items: [
      { title: "Riders", url: "/a/riders" },
      { title: "Stages", url: "/a/stages" },
      { title: "Coverage", url: "/a/coverage" },
      { title: "Pricing", url: "/a/pricing" },
    ],
  },
  // Vendors & Organizations Group
  {
    title: "Vendors",
    url: "/a/organizations",
    icon: Store,
    items: [
      { title: "Organizations", url: "/a/organizations" },
      { title: "Vendors", url: "/a/vendors" },
      { title: "Customers", url: "/a/customers" },
    ],
  },
  // Catalog Group
  {
    title: "Catalog",
    url: "/a/products",
    icon: Package,
    items: [
      { title: "Products", url: "/a/products" },
      { title: "Variants", url: "/a/variants" },
      { title: "Categories", url: "/a/categories" },
      { title: "Brands", url: "/a/brands" },
    ],
  },
  // Marketing Group
  {
    title: "Marketing",
    url: "/a/promotions",
    icon: Percent,
    items: [
      { title: "Promotions", url: "/a/promotions" },
    ],
  },
  // Settings
  {
    title: "Settings",
    url: "/a/settings",
    icon: Settings,
  },
];

/**
 * Admin header component for the sidebar
 */
function AdminHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="cursor-default hover:bg-transparent"
          size="lg"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">BoxKuBox</span>
            <span className="truncate text-muted-foreground text-xs">
              Admin Panel
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AdminLayout() {
  // Sync ability store with Clerk auth context
  useSyncAbility();

  return (
    <SidebarProvider>
      <AppSidebar
        headerContent={<AdminHeader />}
        navItems={adminNavItems}
        navLabel="Platform"
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mr-2 data-[orientation=vertical]:h-4"
              orientation="vertical"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/a">Admin Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
