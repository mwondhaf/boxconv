'use client'

import { type ReactNode } from 'react'
import { useAbility } from '~/shared/stores/ability-store'
import type { AppAction, AppSubjects } from '~/shared/lib/ability'

export interface CanProps {
  /**
   * The action to check (e.g., "create", "read", "update", "delete", "manage")
   */
  I: AppAction
  /**
   * The subject to check against (e.g., "Product", "Order", or a subject instance)
   */
  a: AppSubjects
  /**
   * Optional field for field-level permission checks
   */
  field?: string
  /**
   * If true, inverts the permission check (renders children when NOT allowed)
   */
  not?: boolean
  /**
   * Content to render when permission check fails
   */
  otherwise?: ReactNode
  /**
   * Content to render when permission check passes
   */
  children?: ReactNode
}

/**
 * A declarative component for permission-based rendering.
 *
 * Uses CASL abilities from the Zustand store to conditionally render content
 * based on user permissions.
 *
 * This component is SSR-safe - during SSR it will hide protected content
 * (returning `otherwise` or null) as a safe default.
 *
 * @example Basic usage
 * ```tsx
 * <Can I="create" a="Product">
 *   <Button>Add Product</Button>
 * </Can>
 * ```
 *
 * @example With fallback content
 * ```tsx
 * <Can I="delete" a="Order" otherwise={<span>No permission to delete</span>}>
 *   <Button variant="danger">Delete Order</Button>
 * </Can>
 * ```
 *
 * @example Inverted check (show when NOT allowed)
 * ```tsx
 * <Can I="manage" a="Settings" not>
 *   <Alert>Contact your admin to change settings</Alert>
 * </Can>
 * ```
 *
 * @example Field-level permission
 * ```tsx
 * <Can I="update" a="Product" field="price">
 *   <PriceInput />
 * </Can>
 * ```
 *
 * @example With subject instance
 * ```tsx
 * import { asProduct } from '~/shared/lib/ability'
 *
 * const product = asProduct({ _id: '123', organizationId: 'org_123', ... })
 *
 * <Can I="update" a={product}>
 *   <EditButton />
 * </Can>
 * ```
 */
export function Can({
  I: action,
  a: subject,
  field,
  not = false,
  children,
  otherwise,
}: CanProps): ReactNode {
  const ability = useAbility()

  const allowed = field
    ? ability.can(action, subject, field)
    : ability.can(action, subject)

  const shouldShow = not ? !allowed : allowed

  if (shouldShow) {
    return children ?? null
  }

  return otherwise ?? null
}

/**
 * Hook version of Can component for programmatic permission checks
 *
 * SSR-safe: returns false during SSR (safe default - hide protected content)
 *
 * @example
 * ```tsx
 * const canDeleteProduct = useCanCheck('delete', 'Product')
 *
 * if (canDeleteProduct) {
 *   // show delete UI
 * }
 * ```
 */
export function useCanCheck(
  action: AppAction,
  subject: AppSubjects,
  field?: string
): boolean {
  const ability = useAbility()

  if (field) {
    return ability.can(action, subject, field)
  }
  return ability.can(action, subject)
}

export default Can
