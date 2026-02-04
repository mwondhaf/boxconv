import { useEffect } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { useAbilityStore } from '~/shared/stores/ability-store'
import type { PlatformRole, OrgRole } from '~/shared/lib/ability'

/**
 * Hook to sync the ability store with Clerk auth context from routes
 * Call this in layout components to initialize permissions
 *
 * This hook reads authentication data from the route context (populated
 * by the __root__ route's beforeLoad) and updates the Zustand ability store.
 *
 * This hook is SSR-safe - it only updates the store on the client side
 * after the component mounts.
 *
 * @example
 * ```tsx
 * function VendorLayout() {
 *   // Sync ability store with Clerk auth context
 *   useSyncAbility()
 *
 *   return <Outlet />
 * }
 * ```
 */
export function useSyncAbility() {
  const context = useRouteContext({ from: '__root__' })
  const setFullContext = useAbilityStore((state) => state.setFullContext)

  useEffect(() => {
    // Only run on client side (useEffect doesn't run on server)
    const publicMetadata = context.publicMetadata as
      | { platformRole?: PlatformRole }
      | undefined
    const platformRole = publicMetadata?.platformRole
    const orgRole = (context.orgRole as OrgRole) ?? null
    const orgId = context.orgId as string | undefined
    const userId = context.userId as string | undefined

    setFullContext({
      platformRole,
      orgRole,
      orgId,
      userId,
    })
  }, [context.publicMetadata, context.orgRole, context.orgId, context.userId, setFullContext])
}

/**
 * Hook to get current auth status from route context
 * Useful for components that need auth info but don't need reactive ability updates
 * This hook is SSR-safe as it only reads from route context
 */
export function useAuthContext() {
  const context = useRouteContext({ from: '__root__' })

  const publicMetadata = context.publicMetadata as
    | { platformRole?: PlatformRole }
    | undefined

  return {
    userId: context.userId as string | undefined,
    orgId: context.orgId as string | undefined,
    orgRole: (context.orgRole as OrgRole) ?? null,
    platformRole: publicMetadata?.platformRole,
    orgMemberships: context.orgMemberships as string[] | undefined,
    hasOrgMembership: context.hasOrgMembership as boolean,
    isAuthenticated: !!context.userId,
    isAdmin: publicMetadata?.platformRole === 'admin',
    isRider: publicMetadata?.platformRole === 'rider',
  }
}
