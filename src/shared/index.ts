// =============================================================================
// Shared Module Exports
// =============================================================================

// Ability / Authorization
export {
  // Types
  type AppAction,
  type AppSubjects,
  type AppAbility,
  type AppRawRule,
  type OrgRole,
  type PlatformRole,
  // Subject types
  type Product,
  type Order,
  type Customer,
  type Settings,
  type Member,
  type Organization,
  // Builder
  buildAbilityFor,
  // Helpers
  checkAbility,
  checkFieldAbility,
  assertAbility,
  assertFieldAbility,
  getPermittedFields,
  filterPermittedUpdates,
  // Subject creators
  subject,
  asProduct,
  asOrder,
  asCustomer,
  asSettings,
  asMember,
  asOrganization,
} from './lib/ability'

// Stores
export {
  useAbilityStore,
  useAbility,
  useAbilityContext,
  useCan,
  useCannot,
} from './stores/ability-store'

// Hooks
export { useSyncAbility, useAuthContext } from './hooks/use-sync-ability'

// Components
export { Can, useCanCheck, type CanProps } from './components/can'
export {
  AbilityProvider,
  AbilityContext,
  Can as ContextualCan,
  useAbilityContext as useAbilityFromContext,
} from './components/ability-provider'

// Types
export type { PlatformRole as TPlatformRole, PublicMetadata } from './types/roles'
export { isAdmin, isRider, isRegularUser, getDashboardPath } from './types/roles'

// Data Table
export {
  DataTable,
  SortableHeader,
  type DataTableProps,
  type SortableHeaderProps,
  type ColumnDef,
  type Row,
  type SortingState,
  type ColumnFiltersState,
} from './components/data-table'
