import { Outlet } from "@tanstack/react-router";
import {
  Bike,
  Boxes,
  Building2,
  FolderTree,
  LayoutDashboard,
  Network,
  Package,
  PackageSearch,
  Percent,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Users,
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
  {
    title: "Orders",
    url: "/a/orders",
    icon: ShoppingCart,
  },
  {
    title: "Parcels",
    url: "/a/parcels",
    icon: PackageSearch,
  },
  {
    title: "Riders",
    url: "/a/riders",
    icon: Bike,
  },
  {
    title: "Organizations",
    url: "/a/organizations",
    icon: Network,
  },
  {
    title: "Vendors",
    url: "/a/vendors",
    icon: Building2,
  },
  {
    title: "Customers",
    url: "/a/customers",
    icon: Users,
  },
  {
    title: "Products",
    url: "/a/products",
    icon: Package,
  },
  {
    title: "Variants",
    url: "/a/variants",
    icon: Boxes,
  },
  {
    title: "Categories",
    url: "/a/categories",
    icon: FolderTree,
  },
  {
    title: "Brands",
    url: "/a/brands",
    icon: Tag,
  },
  {
    title: "Promotions",
    url: "/a/promotions",
    icon: Percent,
  },
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
