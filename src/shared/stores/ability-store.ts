'use client'

import { create } from 'zustand'
import {
  buildAbilityFor,
  type AppAbility,
  type OrgRole,
  type PlatformRole,
} from '~/shared/lib/ability'

interface AbilityState {
  // Context
  platformRole: PlatformRole
  orgRole: OrgRole
  orgId: string | undefined
  userId: string | undefined

  // Computed ability
  ability: AppAbility

  // Actions
  setRoles: (platformRole: PlatformRole, orgRole: OrgRole, orgId?: string) => void
  setFullContext: (context: {
    platformRole: PlatformRole
    orgRole: OrgRole
    orgId?: string
    userId?: string
  }) => void
  setPlatformRole: (role: PlatformRole) => void
  setOrgRole: (role: OrgRole) => void
  setOrgId: (orgId: string | undefined) => void
  setUserId: (userId: string | undefined) => void
  reset: () => void
}

const initialState = {
  platformRole: undefined as PlatformRole,
  orgRole: null as OrgRole,
  orgId: undefined as string | undefined,
  userId: undefined as string | undefined,
}

/**
 * Default ability with no permissions (used during SSR and initial state)
 */
const defaultAbility = buildAbilityFor({
  platformRole: undefined,
  orgRole: null,
  orgId: undefined,
  userId: undefined,
})

/**
 * Lazy store initialization to avoid SSR issues
 * The store is only created when first accessed on the client
 */
let store: ReturnType<typeof createAbilityStore> | null = null

function createAbilityStore() {
  return create<AbilityState>((set) => ({
    ...initialState,
    ability: defaultAbility,

    setRoles: (platformRole, orgRole, orgId) =>
      set((state) => ({
        platformRole,
        orgRole,
        orgId: orgId ?? state.orgId,
        ability: buildAbilityFor({
          platformRole,
          orgRole,
          orgId: orgId ?? state.orgId,
          userId: state.userId,
        }),
      })),

    setFullContext: (context) =>
      set({
        platformRole: context.platformRole,
        orgRole: context.orgRole,
        orgId: context.orgId,
        userId: context.userId,
        ability: buildAbilityFor({
          platformRole: context.platformRole,
          orgRole: context.orgRole,
          orgId: context.orgId,
          userId: context.userId,
        }),
      }),

    setPlatformRole: (platformRole) =>
      set((state) => ({
        platformRole,
        ability: buildAbilityFor({
          platformRole,
          orgRole: state.orgRole,
          orgId: state.orgId,
          userId: state.userId,
        }),
      })),

    setOrgRole: (orgRole) =>
      set((state) => ({
        orgRole,
        ability: buildAbilityFor({
          platformRole: state.platformRole,
          orgRole,
          orgId: state.orgId,
          userId: state.userId,
        }),
      })),

    setOrgId: (orgId) =>
      set((state) => ({
        orgId,
        ability: buildAbilityFor({
          platformRole: state.platformRole,
          orgRole: state.orgRole,
          orgId,
          userId: state.userId,
        }),
      })),

    setUserId: (userId) =>
      set((state) => ({
        userId,
        ability: buildAbilityFor({
          platformRole: state.platformRole,
          orgRole: state.orgRole,
          orgId: state.orgId,
          userId,
        }),
      })),

    reset: () =>
      set({
        ...initialState,
        ability: defaultAbility,
      }),
  }))
}

/**
 * Get the store instance, creating it lazily if needed
 * Returns null during SSR
 */
function getStore() {
  if (typeof window === 'undefined') {
    return null
  }
  if (!store) {
    store = createAbilityStore()
  }
  return store
}

/**
 * Hook to access the ability store
 * SSR-safe: returns a no-op store selector during SSR
 */
export function useAbilityStore<T>(selector: (state: AbilityState) => T): T {
  const storeInstance = getStore()

  if (!storeInstance) {
    // Return default state during SSR
    const defaultState: AbilityState = {
      ...initialState,
      ability: defaultAbility,
      setRoles: () => {},
      setFullContext: () => {},
      setPlatformRole: () => {},
      setOrgRole: () => {},
      setOrgId: () => {},
      setUserId: () => {},
      reset: () => {},
    }
    return selector(defaultState)
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return storeInstance(selector)
}

// Also expose getState and subscribe for non-hook access
useAbilityStore.getState = (): AbilityState => {
  const storeInstance = getStore()
  if (!storeInstance) {
    return {
      ...initialState,
      ability: defaultAbility,
      setRoles: () => {},
      setFullContext: () => {},
      setPlatformRole: () => {},
      setOrgRole: () => {},
      setOrgId: () => {},
      setUserId: () => {},
      reset: () => {},
    }
  }
  return storeInstance.getState()
}

useAbilityStore.subscribe = (listener: (state: AbilityState) => void): (() => void) => {
  const storeInstance = getStore()
  if (!storeInstance) {
    return () => {}
  }
  return storeInstance.subscribe(listener)
}

/**
 * SSR-safe hook to get current ability
 * Returns the default (empty permissions) ability during SSR
 */
export function useAbility(): AppAbility {
  return useAbilityStore((state) => state.ability)
}

/**
 * SSR-safe hook to get full ability context
 * Returns empty context during SSR
 */
export function useAbilityContext() {
  return useAbilityStore((state) => ({
    platformRole: state.platformRole,
    orgRole: state.orgRole,
    orgId: state.orgId,
    userId: state.userId,
  }))
}

/**
 * SSR-safe hook to check a permission
 * Returns false during SSR (safe default - hide protected content)
 */
export function useCan(
  action: Parameters<AppAbility['can']>[0],
  subject: Parameters<AppAbility['can']>[1],
  field?: string
): boolean {
  const ability = useAbility()
  if (field) {
    return ability.can(action, subject, field)
  }
  return ability.can(action, subject)
}

/**
 * SSR-safe hook to check if user cannot perform an action
 * Returns true during SSR (safe default - assume no permission)
 */
export function useCannot(
  action: Parameters<AppAbility['cannot']>[0],
  subject: Parameters<AppAbility['cannot']>[1],
  field?: string
): boolean {
  const ability = useAbility()
  if (field) {
    return ability.cannot(action, subject, field)
  }
  return ability.cannot(action, subject)
}

/**
 * Get the store instance directly (for use outside of React components)
 * Safe to use on server but will return default state
 */
export function getAbilityStore() {
  return useAbilityStore.getState()
}
