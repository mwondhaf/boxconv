'use client'

import * as React from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

import { createOrganization } from '../api/organizations'

import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'

// =============================================================================
// Schema
// =============================================================================

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters.')
    .max(64, 'Organization name must be at most 64 characters.'),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]*$/,
      'Slug can only contain lowercase letters, numbers, and hyphens.'
    )
    .max(64, 'Slug must be at most 64 characters.')
    .optional()
    .or(z.literal('')),
})

// =============================================================================
// Types
// =============================================================================

interface CreateOrganizationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// =============================================================================
// Component
// =============================================================================

export function CreateOrganizationForm({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      name: '',
      slug: '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = createOrganizationSchema.safeParse(value)
        if (!result.success) {
          return result.error.issues.map((issue) => issue.message).join(', ')
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await createOrganization({
          data: {
            name: value.name,
            slug: value.slug || undefined,
          },
        })
        form.reset()
        onSuccess()
        onOpenChange(false)
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : 'Failed to create organization'
        )
      }
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      setServerError(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization for a vendor. You can add members after
            creation.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-organization-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Organization Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Acme Inc."
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
            <form.Field
              name="slug"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Slug (optional)
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="acme-inc"
                      autoComplete="off"
                    />
                    <FieldDescription>
                      URL-friendly identifier. Auto-generated if left blank.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
          </FieldGroup>

          {serverError && (
            <p className="mt-4 text-sm text-destructive">{serverError}</p>
          )}
        </form>
        <DialogFooter>
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
                form="create-organization-form"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
