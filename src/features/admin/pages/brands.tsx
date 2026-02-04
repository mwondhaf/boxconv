'use client'

import * as React from 'react'
import { Plus, Tag } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'

import { api } from 'convex/_generated/api'
import { BrandsTable } from '../components/brands-table'
import { BrandFormSheet } from '../components/brand-form-sheet'

import type { Brand } from '../components/brands-table'
import type { BrandData } from '../components/brand-form-sheet'
import { Button } from '~/components/ui/button'
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

// =============================================================================
// Types
// =============================================================================

interface DeleteConfirmState {
  open: boolean
  brand: Brand | null
}

// =============================================================================
// AdminBrandsPage Component
// =============================================================================

export function AdminBrandsPage() {
  // State
  const [formSheet, setFormSheet] = React.useState<{
    open: boolean
    brand: BrandData | null
  }>({ open: false, brand: null })
  const [deleteConfirm, setDeleteConfirm] = React.useState<DeleteConfirmState>({
    open: false,
    brand: null,
  })

  // Fetch brands from Convex with product counts
  const brandsResult = useQuery(api.brands.listWithProductCounts, {})
  const brands = brandsResult ?? []
  const isLoading = brandsResult === undefined

  // Mutations
  const deleteBrand = useMutation(api.brands.remove)

  // Handlers
  const handleAddBrand = () => {
    setFormSheet({ open: true, brand: null })
  }

  const handleEditBrand = (brand: Brand) => {
    setFormSheet({
      open: true,
      brand: {
        _id: brand._id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
      },
    })
  }

  const handleDeleteClick = (brand: Brand) => {
    setDeleteConfirm({ open: true, brand })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.brand) return

    try {
      await deleteBrand({ id: deleteConfirm.brand._id })
      toast.success(`"${deleteConfirm.brand.name}" has been deleted`)
      setDeleteConfirm({ open: false, brand: null })
    } catch (error) {
      console.error('Failed to delete brand:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete brand'
      )
    }
  }

  const handleFormSuccess = () => {
    toast.success(
      formSheet.brand
        ? 'Brand updated successfully'
        : 'Brand created successfully'
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="size-6" />
            Brands
          </h1>
          <p className="text-muted-foreground">
            Manage product brands across the platform.
          </p>
        </div>
        <Button onClick={handleAddBrand}>
          <Plus className="size-4 mr-1.5" />
          Add Brand
        </Button>
      </div>

      {/* Brands Table */}
      <BrandsTable
        data={brands}
        isLoading={isLoading}
        onEdit={handleEditBrand}
        onDelete={handleDeleteClick}
      />

      {/* Brand Form Sheet */}
      <BrandFormSheet
        open={formSheet.open}
        onOpenChange={(open) => setFormSheet((prev) => ({ ...prev, open }))}
        brand={formSheet.brand}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.brand?.name}"?
              This action cannot be undone.
              {deleteConfirm.brand?.productCount &&
                deleteConfirm.brand.productCount > 0 && (
                  <span className="block mt-2 text-destructive font-medium">
                    Warning: This brand has {deleteConfirm.brand.productCount}{' '}
                    associated products. You must remove the brand from those
                    products first.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminBrandsPage
