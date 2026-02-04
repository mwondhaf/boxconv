import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
  type SubjectRawRule,
  type ExtractSubjectType,
  type MongoQuery,
} from '@casl/ability'
import type { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server'

// =============================================================================
// Subject Types - Matches the schema
// =============================================================================

export interface Product {
  kind: 'Product'
  _id: string
  organizationId: string
  sku: string
  price: number
  isActive: boolean
  createdBy: string
}

export interface Order {
  kind: 'Order'
  _id: string
  organizationId: string
  customerId: string
  status: string
  total: number
  createdBy: string
}

export interface Customer {
  kind: 'Customer'
  _id: string
  organizationId: string
  userId?: string
  email: string
}

export interface Settings {
  kind: 'Settings'
  organizationId: string
}

export interface Member {
  kind: 'Member'
  _id: string
  organizationId: string
  userId: string
  role: string
}

export interface Organization {
  kind: 'Organization'
  id: string
  name: string
}

export interface Category {
  kind: 'Category'
  _id: string
  organizationId: string
}

// Union of all subject types
export type AppSubjects =
  | Product
  | Order
  | Customer
  | Settings
  | Member
  | Organization
  | Category
  | 'Product'
  | 'Order'
  | 'Customer'
  | 'Settings'
  | 'Member'
  | 'Organization'
  | 'Category'
  | 'all'

// =============================================================================
// Actions
// =============================================================================

export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete'

// =============================================================================
// Ability Type
// =============================================================================

export type AppAbility = MongoAbility<[AppAction, AppSubjects]>

// Type for raw rules (useful for serialization)
export type AppRawRule = SubjectRawRule<
  AppAction,
  ExtractSubjectType<AppSubjects>,
  MongoQuery
>

// =============================================================================
// Roles
// =============================================================================

// Clerk org roles
export type OrgRole = 'org:owner' | 'org:admin' | 'org:member' | null

// Platform roles from Clerk publicMetadata
export type PlatformRole = 'admin' | 'rider' | undefined

// =============================================================================
// Ability Context
// =============================================================================

export interface AbilityContext {
  platformRole?: PlatformRole
  orgRole?: OrgRole
  orgId?: string
  userId?: string
}

// =============================================================================
// Protected Fields
// =============================================================================

const PROTECTED_PRODUCT_FIELDS = ['price', 'sku', 'isActive'] as const
const PROTECTED_ORDER_FIELDS = ['status', 'total'] as const
const PROTECTED_MEMBER_FIELDS = ['role'] as const

// =============================================================================
// Ability Builder
// =============================================================================

/**
 * Build CASL ability based on platform role and org role
 * For use in Convex functions (server-side)
 */
export function buildAbilityFor(ctx: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  const { platformRole, orgRole, orgId } = ctx

  // =========================================================================
  // Platform Admin - Full access to everything
  // =========================================================================
  if (platformRole === 'admin') {
    can('manage', 'all')
    return build()
  }

  // =========================================================================
  // Rider - Limited permissions (only their deliveries)
  // =========================================================================
  if (platformRole === 'rider') {
    // Riders can read orders assigned to them (handled at query level)
    can('read', 'Order')
    can('update', 'Order', ['status']) // Only status updates for delivery
    return build()
  }

  // =========================================================================
  // No org role = no permissions
  // =========================================================================
  if (!orgRole || !orgId) {
    return build()
  }

  // =========================================================================
  // Organization Member (org:member)
  // =========================================================================

  // Read access scoped to organization
  can('read', 'Product', { organizationId: orgId })
  can('read', 'Order', { organizationId: orgId })
  can('read', 'Customer', { organizationId: orgId })
  can('read', 'Category', { organizationId: orgId })

  // Can create orders
  can('create', 'Order')

  // =========================================================================
  // Organization Admin (org:admin)
  // =========================================================================
  if (orgRole === 'org:admin' || orgRole === 'org:owner') {
    // Full access to products, orders, customers, categories within org
    can('manage', 'Product', { organizationId: orgId })
    can('manage', 'Order', { organizationId: orgId })
    can('manage', 'Customer', { organizationId: orgId })
    can('manage', 'Category', { organizationId: orgId })

    // Can read settings and members
    can('read', 'Settings', { organizationId: orgId })
    can('read', 'Member', { organizationId: orgId })

    // Admins cannot change certain protected fields (only owners can)
    if (orgRole === 'org:admin') {
      cannot('update', 'Product', PROTECTED_PRODUCT_FIELDS as unknown as string[])
      cannot('update', 'Order', PROTECTED_ORDER_FIELDS as unknown as string[])
      cannot('update', 'Member', PROTECTED_MEMBER_FIELDS as unknown as string[])
    }
  }

  // =========================================================================
  // Organization Owner (org:owner)
  // =========================================================================
  if (orgRole === 'org:owner') {
    // Full access to settings
    can('manage', 'Settings', { organizationId: orgId })

    // Full access to members (invite, remove, change roles)
    can('manage', 'Member', { organizationId: orgId })

    // Can manage the organization itself
    can('manage', 'Organization', { id: orgId })

    // Owners can update protected fields (override the cannot rules)
    can('update', 'Product', PROTECTED_PRODUCT_FIELDS as unknown as string[], {
      organizationId: orgId,
    })
    can('update', 'Order', PROTECTED_ORDER_FIELDS as unknown as string[], {
      organizationId: orgId,
    })
    can('update', 'Member', PROTECTED_MEMBER_FIELDS as unknown as string[], {
      organizationId: orgId,
    })
  }

  return build()
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check a single permission
 */
export function checkAbility(
  ctx: AbilityContext,
  action: AppAction,
  subject: AppSubjects
): boolean {
  const ability = buildAbilityFor(ctx)
  return ability.can(action, subject)
}

/**
 * Check permission on a specific field
 */
export function checkFieldAbility(
  ctx: AbilityContext,
  action: AppAction,
  subject: AppSubjects,
  field: string
): boolean {
  const ability = buildAbilityFor(ctx)
  return ability.can(action, subject, field)
}

/**
 * Assert permission or throw error
 * Use this in Convex mutations/queries
 */
export function assertAbility(
  ctx: AbilityContext,
  action: AppAction,
  subject: AppSubjects,
  message = 'Forbidden: You do not have permission to perform this action'
): void {
  if (!checkAbility(ctx, action, subject)) {
    throw new Error(message)
  }
}

/**
 * Assert field-level permission or throw error
 */
export function assertFieldAbility(
  ctx: AbilityContext,
  action: AppAction,
  subject: AppSubjects,
  field: string,
  message?: string
): void {
  if (!checkFieldAbility(ctx, action, subject, field)) {
    throw new Error(
      message ?? `Forbidden: You do not have permission to ${action} the '${field}' field`
    )
  }
}

/**
 * Get list of fields the user can update on a subject
 */
export function getPermittedFields(
  ctx: AbilityContext,
  action: AppAction,
  subject: AppSubjects,
  allFields: Array<string>
): Array<string> {
  const ability = buildAbilityFor(ctx)
  return allFields.filter((field) => ability.can(action, subject, field))
}

/**
 * Filter an update object to only include permitted fields
 */
export function filterPermittedUpdates<T extends Record<string, unknown>>(
  ctx: AbilityContext,
  subject: AppSubjects,
  updates: T
): Partial<T> {
  const ability = buildAbilityFor(ctx)
  const permitted: Partial<T> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (ability.can('update', subject, key)) {
      ;(permitted as Record<string, unknown>)[key] = value
    }
  }

  return permitted
}

// =============================================================================
// Subject Helpers
// =============================================================================

/**
 * Create a subject instance with the 'kind' property for type detection
 */
export function subject<T extends { kind: string }>(
  type: T['kind'],
  obj: Omit<T, 'kind'>
): T {
  return { ...obj, kind: type } as T
}

// Convenience functions for creating typed subjects
export const asProduct = (obj: Omit<Product, 'kind'>): Product =>
  subject('Product', obj)

export const asOrder = (obj: Omit<Order, 'kind'>): Order => subject('Order', obj)

export const asCustomer = (obj: Omit<Customer, 'kind'>): Customer =>
  subject('Customer', obj)

export const asSettings = (obj: Omit<Settings, 'kind'>): Settings =>
  subject('Settings', obj)

export const asMember = (obj: Omit<Member, 'kind'>): Member =>
  subject('Member', obj)

export const asOrganization = (obj: Omit<Organization, 'kind'>): Organization =>
  subject('Organization', obj)

export const asCategory = (obj: Omit<Category, 'kind'>): Category =>
  subject('Category', obj)

// =============================================================================
// Convex Context Helpers
// =============================================================================

/**
 * Extract ability context from Convex auth identity
 */
export async function getAbilityContextFromAuth(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<AbilityContext> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    return {
      platformRole: undefined,
      orgRole: null,
      orgId: undefined,
      userId: undefined,
    }
  }

  // Clerk stores custom claims in the token
  // platformRole is in publicMetadata
  // orgRole and orgId come from the organization context
  const platformRole = (identity as any).platformRole as PlatformRole
  const orgRole = (identity as any).org_role as OrgRole
  const orgId = (identity as any).org_id as string | undefined

  return {
    platformRole,
    orgRole: orgRole ?? null,
    orgId,
    userId: identity.subject,
  }
}

/**
 * Get ability instance from Convex context
 */
export async function getAbilityFromAuth(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<AppAbility> {
  const abilityCtx = await getAbilityContextFromAuth(ctx)
  return buildAbilityFor(abilityCtx)
}

/**
 * Assert that user is authenticated
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ userId: string; abilityCtx: AbilityContext }> {
  const abilityCtx = await getAbilityContextFromAuth(ctx)

  if (!abilityCtx.userId) {
    throw new Error('Unauthorized: Authentication required')
  }

  return { userId: abilityCtx.userId, abilityCtx }
}

/**
 * Assert that user has organization membership
 */
export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ userId: string; orgId: string; abilityCtx: AbilityContext }> {
  const { userId, abilityCtx } = await requireAuth(ctx)

  if (!abilityCtx.orgId) {
    throw new Error('Forbidden: Organization membership required')
  }

  return { userId, orgId: abilityCtx.orgId, abilityCtx }
}

/**
 * Assert that user has specific ability
 * For actions that require org membership, use this after confirming the action needs org context
 */
export async function requireAbility(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  action: AppAction,
  subject: AppSubjects
): Promise<{ userId: string; orgId: string; abilityCtx: AbilityContext; ability: AppAbility }> {
  const { userId, orgId, abilityCtx } = await requireOrgMembership(ctx)
  const ability = buildAbilityFor(abilityCtx)

  if (!ability.can(action, subject)) {
    throw new Error(`Forbidden: Cannot ${action} ${typeof subject === 'string' ? subject : subject.kind}`)
  }

  return { userId, orgId, abilityCtx, ability }
}

/**
 * Assert that user is platform admin
 */
export async function requirePlatformAdmin(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ userId: string; abilityCtx: AbilityContext }> {
  const { userId, abilityCtx } = await requireAuth(ctx)

  if (abilityCtx.platformRole !== 'admin') {
    throw new Error('Forbidden: Platform admin access required')
  }

  return { userId, abilityCtx }
}

/**
 * Assert that user is org owner
 */
export async function requireOrgOwner(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ userId: string; orgId: string; abilityCtx: AbilityContext }> {
  const { userId, orgId, abilityCtx } = await requireOrgMembership(ctx)

  // Platform admins can also act as org owners
  if (abilityCtx.platformRole === 'admin') {
    return { userId, orgId, abilityCtx }
  }

  if (abilityCtx.orgRole !== 'org:owner') {
    throw new Error('Forbidden: Organization owner access required')
  }

  return { userId, orgId, abilityCtx }
}

/**
 * Assert that user is org admin or owner
 */
export async function requireOrgAdmin(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ userId: string; orgId: string; abilityCtx: AbilityContext }> {
  const { userId, orgId, abilityCtx } = await requireOrgMembership(ctx)

  // Platform admins can also act as org admins
  if (abilityCtx.platformRole === 'admin') {
    return { userId, orgId, abilityCtx }
  }

  if (abilityCtx.orgRole !== 'org:admin' && abilityCtx.orgRole !== 'org:owner') {
    throw new Error('Forbidden: Organization admin access required')
  }

  return { userId, orgId, abilityCtx }
}
