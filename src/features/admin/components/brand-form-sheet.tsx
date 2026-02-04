'use client'

import * as React from 'react'
import { Loader2, Tag } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import slugify from 'slugify'
import { z } from 'zod'

import { useCreateBrand, useUpdateBrand } from '../hooks/use-catalog'
import type { Id } from 'convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
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

export interface BrandData {
  _id: Id<'brands'>
  name: string
  slug: string
  description?: string
}

export interface BrandFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand: BrandData | null
  onSuccess?: () => void
}

// =============================================================================
// Schema
// =============================================================================

const brandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  description: z.string(),
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

export function BrandFormSheet({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: BrandFormSheetProps) {
  const isEditing = !!brand
  const createBrand = useCreateBrand()
  const updateBrand = useUpdateBrand()

  const [serverError, setServerError] = React.useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      name: brand?.name ?? '',
      description: brand?.description ?? '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = brandSchema.safeParse(value)
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

        if (isEditing) {
          await updateBrand({
            id: brand._id,
            name: value.name,
            slug,
            description: value.description || undefined,
          })
        } else {
          await createBrand({
            name: value.name,
            slug,
            description: value.description || undefined,
          })
        }

        onSuccess?.()
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to save brand:', error)
        setServerError(
          error instanceof Error ? error.message : 'Failed to save brand'
        )
      }
    },
  })

  // Reset form when brand changes
  React.useEffect(() => {
    if (brand) {
      form.setFieldValue('name', brand.name)
      form.setFieldValue('description', brand.description ?? '')
    } else {
      form.reset()
    }
  }, [brand])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            {brand ? `Edit ${brand.name}` : 'Add New Brand'}
          </SheetTitle>
          <SheetDescription>
            {brand
              ? 'Update the brand information below.'
              : 'Fill in the details to create a new brand.'}
          </SheetDescription>
        </SheetHeader>

        <form
          id="brand-form"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <FieldGroup>
                <form.Field
                  name="name"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Brand Name *</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="e.g., Coca-Cola"
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
                        placeholder="Describe this brand..."
                        rows={3}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldDescription>
                        Optional description for internal reference.
                      </FieldDescription>
                    </Field>
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
                    ) : brand ? (
                      'Save Changes'
                    ) : (
                      'Create Brand'
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

export default BrandFormSheet
