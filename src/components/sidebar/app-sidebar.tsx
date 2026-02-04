"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";
import { NavMain, type NavMainItem } from "./nav-main";
import { NavUser } from "./nav-user";
import { OrgSwitcher } from "./org-switcher";

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  /**
   * Navigation items to display in the sidebar
   */
  navItems: NavMainItem[];
  /**
   * Label for the navigation section
   */
  navLabel?: string;
  /**
   * Whether to show the organization switcher (for vendor layout)
   */
  showOrgSwitcher?: boolean;
  /**
   * Whether to hide the "Create organization" option in the org switcher
   */
  hideCreateOrg?: boolean;
  /**
   * Custom header content (overrides org switcher)
   */
  headerContent?: React.ReactNode;
  /**
   * Custom footer content (overrides user nav)
   */
  footerContent?: React.ReactNode;
  /**
   * Additional content to render in the sidebar
   */
  children?: React.ReactNode;
}

/**
 * Configurable App Sidebar component based on shadcn sidebar-07 pattern.
 *
 * Can be customized for different layouts (admin, vendor, rider) by passing
 * different navItems and configuration options.
 *
 * @example Vendor Layout
 * ```tsx
 * <AppSidebar
 *   navItems={vendorNavItems}
 *   navLabel="Vendor"
 *   showOrgSwitcher
 * />
 * ```
 *
 * @example Admin Layout
 * ```tsx
 * <AppSidebar
 *   navItems={adminNavItems}
 *   navLabel="Admin"
 *   headerContent={<AdminHeader />}
 * />
 * ```
 */
export function AppSidebar({
  navItems,
  navLabel = "Navigation",
  showOrgSwitcher = false,
  hideCreateOrg = false,
  headerContent,
  footerContent,
  children,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {headerContent ??
          (showOrgSwitcher ? (
            <OrgSwitcher hideCreateOrg={hideCreateOrg} />
          ) : null)}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} label={navLabel} />
        {children}
      </SidebarContent>
      <SidebarFooter>{footerContent ?? <NavUser />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
