'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useQuery as useConvexQuery } from 'convex/react'
import { Store, MapPin, Clock, MoreHorizontal, Pencil, Eye } from 'lucide-react'

import { listOrganizations } from '../api/organizations'
import { VendorFormSheet, type VendorBusinessData } from '../components/vendor-form-sheet'
import { api } from '../../../../convex/_generated/api'

import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Badge } from '~/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'

// =============================================================================
// Types
// =============================================================================

interface ClerkOrganization {
  id: string
  name: string
  slug: string
  imageUrl: string
  membersCount: number
  createdAt: number
  updatedAt: number
}

// =============================================================================
// Component
// =============================================================================

export function AdminVendorsPage() {
  const queryClient = useQueryClient()
  const [selectedVendor, setSelectedVendor] = React.useState<VendorBusinessData | null>(null)
  const [editSheetOpen, setEditSheetOpen] = React.useState(false)

  // Fetch organizations from Clerk
  const { data: clerkData, isLoading: clerkLoading, error: clerkError } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => listOrganizations({ data: { limit: 100, offset: 0 } }),
  })

  // Fetch all organizations from Convex (for business data)
  const convexOrgs = useConvexQuery(api.organizations.list, { limit: 100 })

  // Fetch organization categories
  const categories = useConvexQuery(api.organizationCategories.listFlat, {})

  // Create a map of Convex orgs by clerkOrgId for quick lookup
  const convexOrgMap = React.useMemo(() => {
    if (!convexOrgs) return new Map()
    return new Map(convexOrgs.map((org) => [org.clerkOrgId, org]))
  }, [convexOrgs])

  // Create a map of categories by ID
  const categoryMap = React.useMemo(() => {
    if (!categories) return new Map()
    return new Map(categories.map((cat) => [cat._id, cat]))
  }, [categories])

  const handleEdit = (clerkOrg: ClerkOrganization) => {
    const convexOrg = convexOrgMap.get(clerkOrg.id)

    const vendorData: VendorBusinessData = {
      clerkOrgId: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug,
      imageUrl: clerkOrg.imageUrl,
      // Business data from Convex
      email: convexOrg?.email,
      phone: convexOrg?.phone,
      country: convexOrg?.country,
      cityOrDistrict: convexOrg?.cityOrDistrict,
      town: convexOrg?.town,
      street: convexOrg?.street,
      categoryId: convexOrg?.categoryId,
      openingTime: convexOrg?.openingTime,
      closingTime: convexOrg?.closingTime,
      timezone: convexOrg?.timezone,
      isBusy: convexOrg?.isBusy,
    }

    setSelectedVendor(vendorData)
    setEditSheetOpen(true)
  }

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] })
  }

  const getVendorStatus = (clerkOrgId: string): 'active' | 'busy' | 'incomplete' => {
    const convexOrg = convexOrgMap.get(clerkOrgId)
    if (!convexOrg) return 'incomplete'
    if (convexOrg.isBusy) return 'busy'
    return 'active'
  }

  const getVendorLocation = (clerkOrgId: string): string => {
    const convexOrg = convexOrgMap.get(clerkOrgId)
    if (!convexOrg) return '—'
    const parts = [convexOrg.town, convexOrg.cityOrDistrict, convexOrg.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : '—'
  }

  const getVendorCategory = (clerkOrgId: string): string => {
    const convexOrg = convexOrgMap.get(clerkOrgId)
    if (!convexOrg?.categoryId) return '—'
    const category = categoryMap.get(convexOrg.categoryId)
    return category?.name ?? '—'
  }

  const getVendorHours = (clerkOrgId: string): string => {
    const convexOrg = convexOrgMap.get(clerkOrgId)
    if (!convexOrg?.openingTime || !convexOrg?.closingTime) return '—'
    return `${convexOrg.openingTime} - ${convexOrg.closingTime}`
  }

  if (clerkError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-destructive">
              {clerkError instanceof Error
                ? clerkError.message
                : 'Failed to load vendors'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">
            Manage vendor organizations and their business settings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Store className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clerkData?.totalCount ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="size-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clerkData?.organizations.filter(
                (org) => getVendorStatus(org.id) === 'active'
              ).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <div className="size-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clerkData?.organizations.filter(
                (org) => getVendorStatus(org.id) === 'busy'
              ).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
            <div className="size-2 rounded-full bg-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clerkData?.organizations.filter(
                (org) => getVendorStatus(org.id) === 'incomplete'
              ).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
          <CardDescription>
            Click on a vendor to view and edit their business details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clerkLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">
                Loading vendors...
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clerkData?.organizations.map((org) => {
                  const status = getVendorStatus(org.id)

                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarImage src={org.imageUrl} alt={org.name} />
                            <AvatarFallback>
                              {org.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {org.slug}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {getVendorCategory(org.id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="size-3 text-muted-foreground" />
                          {getVendorLocation(org.id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="size-3 text-muted-foreground" />
                          {getVendorHours(org.id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{org.membersCount}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status === 'active'
                              ? 'default'
                              : status === 'busy'
                                ? 'secondary'
                                : 'outline'
                          }
                          className={
                            status === 'active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : status === 'busy'
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                                : ''
                          }
                        >
                          {status === 'active'
                            ? 'Active'
                            : status === 'busy'
                              ? 'Paused'
                              : 'Incomplete'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(org)}>
                              <Pencil className="mr-2 size-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="mr-2 size-4" />
                              View Store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {clerkData?.organizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No vendors found. Create an organization to get started.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vendor Edit Sheet */}
      <VendorFormSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        vendor={selectedVendor}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
