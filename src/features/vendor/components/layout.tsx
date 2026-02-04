import { Outlet } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  Settings,
  UserPlus,
} from 'lucide-react'

import {
  AppSidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
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
import { useCan } from '~/shared/stores/ability-store'

/**
 * Build navigation items based on user permissions
 */
function useVendorNavItems(): NavMainItem[] {
  const canManageMembers = useCan('manage', 'Member')

  const navItems: NavMainItem[] = [
    {
      title: 'Dashboard',
      url: '/v',
      icon: LayoutDashboard,
    },
    {
      title: 'Products',
      url: '/v/products',
      icon: Package,
    },
    {
      title: 'Variants',
      url: '/v/variants',
      icon: Layers,
    },
    {
      title: 'Orders',
      url: '/v/orders',
      icon: ShoppingCart,
    },
    {
      title: 'Customers',
      url: '/v/customers',
      icon: Users,
    },
  ]

  // Only show Team if user can manage members
  if (canManageMembers) {
    navItems.push({
      title: 'Team',
      url: '/v/team',
      icon: UserPlus,
    })
  }

  // Always show Settings in the sidebar for easy access
  navItems.push({
    title: 'Settings',
    url: '/v/settings',
    icon: Settings,
  })

  return navItems
}

export function VendorLayout() {
  // Sync ability store with Clerk auth context
  useSyncAbility()

  const navItems = useVendorNavItems()

  return (
    <SidebarProvider>
      <AppSidebar
        navItems={navItems}
        navLabel="Vendor"
        showOrgSwitcher
        hideCreateOrg
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
                  <BreadcrumbLink href="/v">
                    Vendor Dashboard
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
