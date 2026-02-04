import { Outlet } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Truck,
  ClipboardList,
  History,
  DollarSign,
  User,
  Bike,
} from 'lucide-react'

import {
  AppSidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  type NavMainItem,
} from '~/components/sidebar'
import { Separator } from '~/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { useSyncAbility } from '~/shared/hooks/use-sync-ability'

/**
 * Rider navigation items
 */
const riderNavItems: NavMainItem[] = [
  {
    title: 'Dashboard',
    url: '/r',
    icon: LayoutDashboard,
  },
  {
    title: 'My Deliveries',
    url: '/r/deliveries',
    icon: Truck,
  },
  {
    title: 'Assignments',
    url: '/r/assignments',
    icon: ClipboardList,
  },
  {
    title: 'History',
    url: '/r/history',
    icon: History,
  },
  {
    title: 'Earnings',
    url: '/r/earnings',
    icon: DollarSign,
  },
  {
    title: 'Profile',
    url: '/r/profile',
    icon: User,
  },
]

/**
 * Rider header component for the sidebar
 */
function RiderHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
          <div className="bg-emerald-600 text-white flex aspect-square size-8 items-center justify-center rounded-lg">
            <Bike className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">BoxKuBox</span>
            <span className="truncate text-xs text-muted-foreground">Rider Portal</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function RiderLayout() {
  // Sync ability store with Clerk auth context
  useSyncAbility()

  return (
    <SidebarProvider>
      <AppSidebar
        navItems={riderNavItems}
        navLabel="Rider"
        headerContent={<RiderHeader />}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/r">
                    Rider Dashboard
                  </BreadcrumbLink>
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
  )
}
