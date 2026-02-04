'use client'

import * as React from 'react'
import { FolderTree, Plus } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'

import { api } from 'convex/_generated/api'
import { CategoriesTable } from '../components/categories-table'
import { CategoryFormSheet } from '../components/category-form-sheet'

import type { Category } from '../components/categories-table'
import type { CategoryData } from '../components/category-form-sheet'
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
  category: Category | null
}

// =============================================================================
// AdminCategoriesPage Component
// =============================================================================

export function AdminCategoriesPage() {
  // State
  const [formSheet, setFormSheet] = React.useState<{
    open: boolean
    category: CategoryData | null
  }>({ open: false, category: null })
  const [deleteConfirm, setDeleteConfirm] = React.useState<DeleteConfirmState>({
    open: false,
    category: null,
  })

  // Fetch categories from Convex
  const categoriesResult = useQuery(api.categories.list, {})
  const allCategories = categoriesResult ?? []

  // Enrich categories with parent names and children counts
  const categories = React.useMemo(() => {
    const categoryMap = new Map(allCategories.map((cat) => [cat._id, cat]))

    return allCategories.map((cat) => {
      const parent = cat.parentId ? categoryMap.get(cat.parentId) : undefined
      const childrenCount = allCategories.filter(
        (c) => c.parentId === cat._id
      ).length

      return {
        ...cat,
        parentName: parent?.name,
        childrenCount,
        productCount: 0, // TODO: Add product count enrichment
      }
    })
  }, [allCategories])

  const isLoading = categoriesResult === undefined

  // Mutations
  const toggleActive = useMutation(api.categories.toggleActive)
  const deleteCategory = useMutation(api.categories.remove)

  // Handlers
  const handleAddCategory = () => {
    setFormSheet({ open: true, category: null })
  }

  const handleEditCategory = (category: Category) => {
    setFormSheet({
      open: true,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        thumbnailUrl: category.thumbnailUrl,
        bannerUrl: category.bannerUrl,
        isActive: category.isActive,
      },
    })
  }

  const handleToggleActive = async (category: Category) => {
    try {
      const result = await toggleActive({ id: category._id })
      toast.success(
        result.isActive
          ? `"${category.name}" is now active`
          : `"${category.name}" is now inactive`
      )
    } catch (error) {
      console.error('Failed to toggle category status:', error)
      toast.error('Failed to update category status')
    }
  }

  const handleDeleteClick = (category: Category) => {
    setDeleteConfirm({ open: true, category })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.category) return

    try {
      await deleteCategory({ id: deleteConfirm.category._id })
      toast.success(`"${deleteConfirm.category.name}" has been deleted`)
      setDeleteConfirm({ open: false, category: null })
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete category'
      )
    }
  }

  const handleFormSuccess = () => {
    toast.success(
      formSheet.category
        ? 'Category updated successfully'
        : 'Category created successfully'
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="size-6" />
            Categories
          </h1>
          <p className="text-muted-foreground">
            Manage product categories and their hierarchy.
          </p>
        </div>
        <Button onClick={handleAddCategory}>
          <Plus className="size-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Categories Table */}
      <CategoriesTable
        data={categories}
        isLoading={isLoading}
        onEdit={handleEditCategory}
        onDelete={handleDeleteClick}
        onToggleActive={handleToggleActive}
      />

      {/* Category Form Sheet */}
      <CategoryFormSheet
        open={formSheet.open}
        onOpenChange={(open) => setFormSheet((prev) => ({ ...prev, open }))}
        category={formSheet.category}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.category?.name}"?
              This action cannot be undone.
              {deleteConfirm.category?.childrenCount &&
                deleteConfirm.category.childrenCount > 0 && (
                  <span className="block mt-2 text-destructive font-medium">
                    Warning: This category has {deleteConfirm.category.childrenCount}{' '}
                    subcategories. You must delete or move them first.
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

export default AdminCategoriesPage
