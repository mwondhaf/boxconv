'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { deleteOrganization, listOrganizations } from '../api/organizations'
import { CreateOrganizationForm } from '../components/create-organization-form'
import { OrganizationDetailsDialog } from '../components/organization-details-dialog'
import { OrganizationsTable } from '../components/organizations-table'
import type { Organization } from '../components/organizations-table'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'

// =============================================================================
// Main Page Component
// =============================================================================

export function AdminOrganizationsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [selectedOrg, setSelectedOrg] = React.useState<Organization | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [deleteOrg, setDeleteOrg] = React.useState<Organization | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => listOrganizations({ data: { limit: 100, offset: 0 } }),
  })

  const handleViewMembers = (org: Organization) => {
    setSelectedOrg(org)
    setDetailsOpen(true)
  }

  const handleEdit = (org: Organization) => {
    // TODO: Implement edit organization dialog
    console.log('Edit organization:', org)
  }

  const handleDeleteClick = (org: Organization) => {
    setDeleteOrg(org)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteOrg) return
    try {
      await deleteOrganization({ data: { organizationId: deleteOrg.id } })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (err) {
      console.error('Failed to delete organization:', err)
    }
    setDeleteOrg(null)
  }

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] })
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-destructive">
              {error instanceof Error
                ? error.message
                : 'Failed to load organizations'}
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
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage all vendor organizations on the platform
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Organization
        </Button>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="text-sm text-muted-foreground">
            {data?.totalCount ?? 0} total organizations
          </div>
        </CardHeader>
        <CardContent>
          <OrganizationsTable
            data={data?.organizations ?? []}
            isLoading={isLoading}
            onViewMembers={handleViewMembers}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <CreateOrganizationForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Organization Details Dialog */}
      <OrganizationDetailsDialog
        organizationId={selectedOrg?.id ?? null}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteOrg} onOpenChange={() => setDeleteOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteOrg?.name}"? This action
              cannot be undone. All organization data and member associations
              will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
