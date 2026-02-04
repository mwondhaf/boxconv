// =============================================================================
// Shared Module Exports
// =============================================================================

export {
  AbilityContext,
  AbilityProvider,
  Can as ContextualCan,
  useAbilityContext as useAbilityFromContext,
} from "./components/ability-provider";
// Components
export { Can, type CanProps, useCanCheck } from "./components/can";
// Data Table
export {
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  type DataTableProps,
  type Row,
  SortableHeader,
  type SortableHeaderProps,
  type SortingState,
} from "./components/data-table";
// Hooks
export { useAuthContext, useSyncAbility } from "./hooks/use-sync-ability";
// Ability / Authorization
export {
  type AppAbility,
  // Types
  type AppAction,
  type AppRawRule,
  type AppSubjects,
  asCustomer,
  asMember,
  asOrder,
  asOrganization,
  asProduct,
  asSettings,
  assertAbility,
  assertFieldAbility,
  // Builder
  buildAbilityFor,
  type Customer,
  // Helpers
  checkAbility,
  checkFieldAbility,
  filterPermittedUpdates,
  getPermittedFields,
  type Member,
  type Order,
  type Organization,
  type OrgRole,
  type PlatformRole,
  // Subject types
  type Product,
  type Settings,
  // Subject creators
  subject,
} from "./lib/ability";
// Stores
export {
  useAbility,
  useAbilityContext,
  useAbilityStore,
  useCan,
  useCannot,
} from "./stores/ability-store";
// Types
export type {
  PlatformRole as TPlatformRole,
  PublicMetadata,
} from "./types/roles";
export {
  getDashboardPath,
  isAdmin,
  isRegularUser,
  isRider,
} from "./types/roles";
