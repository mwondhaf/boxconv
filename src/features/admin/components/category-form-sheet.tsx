'use client'

import * as React from 'react'
import { FolderTree, Loader2 } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import slugify from 'slugify'
import { z } from 'zod'

import { useCategories, useCreateCategory, useUpdateCategory } from '../hooks/use-catalog'
import { CategoryImageUpload } from './category-image-upload'
import type { Id } from 'convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'

// =============================================================================
// Types
// =============================================================================

export interface CategoryData {
  _id: Id<'categories'>
  name: string
  slug: string
  description?: string
  parentId?: Id<'categories'>
  thumbnailUrl?: string
  bannerUrl?: string
  isActive: boolean
}

export interface CategoryFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryData | null
  onSuccess?: () => void
}

// =============================================================================
// Schema
// =============================================================================

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string(),
  parentId: z.string(),
  isActive: z.boolean(),
})

// =============================================================================
// Helpers
// =============================================================================

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true })
}

// =============================================================================
// Component
// =============================================================================

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormSheetProps) {
  const categories = useCategories({ isActive: undefined })
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const [serverError, setServerError] = React.useState<string | null>(null)

  // Track image URLs for display (updated after uploads)
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | undefined>(
    category?.thumbnailUrl
  )
  const [bannerUrl, setBannerUrl] = React.useState<string | undefined>(
    category?.bannerUrl
  )

  // Filter out the current category and its descendants from parent options
  const parentOptions = React.useMemo(() => {
    if (!categories) return []
    // When editing, exclude self from parent options
    return categories.filter((cat) => cat._id !== category?._id)
  }, [categories, category?._id])

  const form = useForm({
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      parentId: category?.parentId?.toString() ?? '',
      isActive: category?.isActive ?? true,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = categorySchema.safeParse(value)
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(', ')
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null)

      try {
        const slug = generateSlug(value.name)

        if (category) {
          await updateCategory({
            id: category._id,
            name: value.name,
            slug,
            description: value.description || undefined,
            parentId: value.parentId ? (value.parentId as Id<'categories'>) : undefined,
            isActive: value.isActive,
          })
        } else {
          await createCategory({
            name: value.name,
            slug,
            description: value.description || undefined,
            parentId: value.parentId ? (value.parentId as Id<'categories'>) : undefined,
            isActive: value.isActive,
          })
        }

        onSuccess?.()
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to save category:', error)
        setServerError(
          error instanceof Error ? error.message : 'Failed to save category'
        )
      }
    },
  })

  // Reset form when category changes
  React.useEffect(() => {
    if (category) {
      form.setFieldValue('name', category.name)
      form.setFieldValue('description', category.description ?? '')
      form.setFieldValue('parentId', category.parentId?.toString() ?? '')
      form.setFieldValue('isActive', category.isActive)
      setThumbnailUrl(category.thumbnailUrl)
      setBannerUrl(category.bannerUrl)
    } else {
      form.reset()
      setThumbnailUrl(undefined)
      setBannerUrl(undefined)
    }
  }, [category])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderTree className="size-5" />
            {category ? `Edit ${category.name}` : 'Add New Category'}
          </SheetTitle>
          <SheetDescription>
            {category
              ? 'Update the category information below.'
              : 'Fill in the details to create a new category.'}
          </SheetDescription>
        </SheetHeader>

        <form
          id="category-form"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Images - Only show for existing categories */}
              {category && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Images</h3>
                    <div className="grid min-w-0 grid-cols-2 gap-3">
                      <CategoryImageUpload
                        categoryId={category._id}
                        categoryName={category.name}
                        imageType="thumbnail"
                        currentUrl={thumbnailUrl}
                        onUploaded={() => {
                          // The component handles the upload, we just need to trigger a refetch
                          // For now, we'll rely on Convex reactivity
                        }}
                        onDeleted={() => {
                          setThumbnailUrl(undefined)
                        }}
                      />
                      <CategoryImageUpload
                        categoryId={category._id}
                        categoryName={category.name}
                        imageType="banner"
                        currentUrl={bannerUrl}
                        onUploaded={() => {
                          // The component handles the upload
                        }}
                        onDeleted={() => {
                          setBannerUrl(undefined)
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Upload images after creating the category.
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Basic Info */}
              <FieldGroup>
                <form.Field
                  name="name"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Category Name *</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="e.g., Beverages"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                />

                <form.Field
                  name="description"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                      <Textarea
                        id={field.name}
                        placeholder="Describe this category..."
                        rows={3}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                />
              </FieldGroup>

              <Separator />

              {/* Hierarchy */}
              <FieldGroup>
                <h3 className="text-sm font-medium">Hierarchy</h3>
                <form.Field
                  name="parentId"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Parent Category</FieldLabel>
                      <Select
                        value={field.state.value || 'none'}
                        onValueChange={(val) => field.handleChange(val === 'none' ? '' : val)}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No parent (Root)</SelectItem>
                          {parentOptions.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Leave empty for a top-level category.
                      </FieldDescription>
                    </Field>
                  )}
                />
              </FieldGroup>

              <Separator />

              {/* Note for new categories about images */}
              {!category && (
                <>
                  <div className="rounded-lg border border-dashed p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> You can upload thumbnail and banner images after creating the category.
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Status */}
              <FieldGroup>
                <h3 className="text-sm font-medium">Status</h3>
                <form.Field
                  name="isActive"
                  children={(field) => (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <FieldLabel htmlFor={field.name} className="font-medium">
                          Active
                        </FieldLabel>
                        <p className="text-xs text-muted-foreground">
                          Active categories are visible to customers
                        </p>
                      </div>
                      <Switch
                        id={field.name}
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                      />
                    </div>
                  )}
                />
              </FieldGroup>

              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </div>
          </div>

          <SheetFooter>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : category ? (
                      'Save Changes'
                    ) : (
                      'Create Category'
                    )}
                  </Button>
                )}
              />
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default CategoryFormSheet
