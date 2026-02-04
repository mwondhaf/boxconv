import { createContext, useContext, type ReactNode } from 'react'
import { createContextualCan } from '@casl/react'
import { useAbility } from '~/shared/stores/ability-store'
import type { AppAbility } from '~/shared/lib/ability'

// Create the CASL context
export const AbilityContext = createContext<AppAbility>(undefined!)

// Create the Can component bound to our ability type
export const Can = createContextualCan(AbilityContext.Consumer)

// Hook to get ability from context (alternative to zustand store)
export function useAbilityContext(): AppAbility {
  const ability = useContext(AbilityContext)
  if (!ability) {
    throw new Error('useAbilityContext must be used within AbilityProvider')
  }
  return ability
}

interface AbilityProviderProps {
  children: ReactNode
}

/**
 * CASL Ability Provider
 * Wraps children with AbilityContext using the Zustand store's ability
 *
 * Usage:
 * ```tsx
 * <AbilityProvider>
 *   <App />
 * </AbilityProvider>
 * ```
 *
 * Then use <Can> component:
 * ```tsx
 * <Can I="create" a="Product">
 *   <CreateProductButton />
 * </Can>
 *
 * <Can I="manage" a="Settings" not>
 *   <p>You don't have permission to manage settings</p>
 * </Can>
 * ```
 */
export function AbilityProvider({ children }: AbilityProviderProps) {
  const ability = useAbility()

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  )
}
