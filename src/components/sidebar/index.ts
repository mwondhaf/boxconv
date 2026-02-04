// Sidebar components
export { AppSidebar, type AppSidebarProps } from './app-sidebar'
export { NavMain, type NavMainItem } from './nav-main'
export { NavUser } from './nav-user'
export { OrgSwitcher, type OrgSwitcherProps } from './org-switcher'

// Re-export UI sidebar components for convenience
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  SidebarInset,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar,
} from '~/components/ui/sidebar'
