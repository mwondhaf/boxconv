'use client'

import { ChevronsUpDown, Plus, Building2 } from 'lucide-react'
import {
  useOrganization,
  useOrganizationList,
  useClerk,
} from '@clerk/tanstack-react-start'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'

export interface OrgSwitcherProps {
  hideCreateOrg?: boolean
}

export function OrgSwitcher({ hideCreateOrg = false }: OrgSwitcherProps) {
  const { isMobile } = useSidebar()
  const { organization: activeOrg } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  })
  const { openCreateOrganization } = useClerk()

  const organizations = userMemberships?.data ?? []

  const handleOrgSwitch = async (orgId: string) => {
    if (setActive) {
      await setActive({ organization: orgId })
    }
  }

  const getOrgInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {activeOrg?.imageUrl ? (
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={activeOrg.imageUrl} alt={activeOrg.name} />
                    <AvatarFallback className="rounded-lg">
                      {getOrgInitials(activeOrg.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Building2 className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeOrg?.name ?? 'Select Organization'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeOrg ? 'Organization' : 'No org selected'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {organizations.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">No organizations</span>
              </DropdownMenuItem>
            ) : (
              organizations.map((membership) => (
                <DropdownMenuItem
                  key={membership.organization.id}
                  onClick={() => handleOrgSwitch(membership.organization.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {membership.organization.imageUrl ? (
                      <Avatar className="size-6 rounded-md">
                        <AvatarImage
                          src={membership.organization.imageUrl}
                          alt={membership.organization.name}
                        />
                        <AvatarFallback className="rounded-md text-xs">
                          {getOrgInitials(membership.organization.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className="size-3.5 shrink-0" />
                    )}
                  </div>
                  <span className="flex-1 truncate">{membership.organization.name}</span>
                  {activeOrg?.id === membership.organization.id && (
                    <span className="text-xs text-muted-foreground">Active</span>
                  )}
                </DropdownMenuItem>
              ))
            )}
            {!hideCreateOrg && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => openCreateOrganization()}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <span className="text-muted-foreground font-medium">
                    Create organization
                  </span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
