import {
  AbilityBuilder,
  createMongoAbility,
  type ExtractSubjectType,
  type MongoAbility,
  type MongoQuery,
  type SubjectRawRule,
} from "@casl/ability";

// =============================================================================
// Subject Types - Type-safe entities
// =============================================================================

export interface Product {
  kind: "Product";
  id: string;
  organizationId: string;
  name: string;
  price: number;
  sku: string;
  isActive: boolean;
}

export interface Order {
  kind: "Order";
  id: string;
  organizationId: string;
  customerId: string;
  status: string;
  total: number;
}

export interface Customer {
  kind: "Customer";
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  phone?: string;
}

export interface Settings {
  kind: "Settings";
  organizationId: string;
}

export interface Member {
  kind: "Member";
  id: string;
  organizationId: string;
  userId: string;
  role: string;
}

export interface Organization {
  kind: "Organization";
  id: string;
  name: string;
  slug: string;
}

// Union of all subject types
export type AppSubjects =
  | Product
  | Order
  | Customer
  | Settings
  | Member
  | Organization
  | "Product"
  | "Order"
  | "Customer"
  | "Settings"
  | "Member"
  | "Organization"
  | "all";

// =============================================================================
// Actions
// =============================================================================

export type AppAction = "manage" | "create" | "read" | "update" | "delete";

// =============================================================================
// Ability Type
// =============================================================================

export type AppAbility = MongoAbility<[AppAction, AppSubjects]>;

// Type for raw rules (useful for serialization)
export type AppRawRule = SubjectRawRule<
  AppAction,
  ExtractSubjectType<AppSubjects>,
  MongoQuery
>;

// =============================================================================
// Roles
// =============================================================================

// Clerk org roles
export type OrgRole = "org:owner" | "org:admin" | "org:member" | null;

// Platform roles from Clerk publicMetadata
export type PlatformRole = "admin" | "rider" | undefined;

interface AbilityContext {
  platformRole?: PlatformRole;
  orgRole?: OrgRole;
  orgId?: string; // Current organization ID for scoping
  userId?: string;
}

// =============================================================================
// Field-Level Permissions
// =============================================================================

// Fields that only admins/owners can modify
const PROTECTED_PRODUCT_FIELDS = ["price", "sku", "isActive"] as const;
const PROTECTED_ORDER_FIELDS = ["status", "total"] as const;
const PROTECTED_MEMBER_FIELDS = ["role"] as const;

// =============================================================================
// Ability Builder
// =============================================================================

/**
 * Build CASL ability based on platform role and org role
 * Supports field-level permissions and organization scoping
 */
export function buildAbilityFor(ctx: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility
  );

  const { platformRole, orgRole, orgId } = ctx;

  // =========================================================================
  // Platform Admin - Full access to everything
  // =========================================================================
  if (platformRole === "admin") {
    can("manage", "all");
    return build();
  }

  // =========================================================================
  // Rider - No org permissions (uses rider dashboard only)
  // =========================================================================
  if (platformRole === "rider") {
    // Riders can only read their own deliveries (handled separately)
    return build();
  }

  // =========================================================================
  // No org role = no permissions
  // =========================================================================
  if (!(orgRole && orgId)) {
    return build();
  }

  // =========================================================================
  // Organization Member (org:member)
  // - Can read products, orders, customers within their org
  // - Can create orders
  // - Cannot modify products or settings
  // =========================================================================

  // Read access scoped to organization
  can("read", "Product", { organizationId: orgId });
  can("read", "Order", { organizationId: orgId });
  can("read", "Customer", { organizationId: orgId });

  // Can create orders
  can("create", "Order");

  // =========================================================================
  // Organization Admin (org:admin)
  // - Full CRUD on products, orders, customers
  // - Can read settings and members
  // - Cannot modify protected fields (price changes need owner approval)
  // =========================================================================
  if (orgRole === "org:admin" || orgRole === "org:owner") {
    // Full access to products within org
    can("manage", "Product", { organizationId: orgId });
    can("manage", "Order", { organizationId: orgId });
    can("manage", "Customer", { organizationId: orgId });

    // Can read settings and members
    can("read", "Settings", { organizationId: orgId });
    can("read", "Member", { organizationId: orgId });

    // Admins cannot change certain protected fields (only owners can)
    if (orgRole === "org:admin") {
      cannot(
        "update",
        "Product",
        PROTECTED_PRODUCT_FIELDS as unknown as string[]
      );
      cannot("update", "Order", PROTECTED_ORDER_FIELDS as unknown as string[]);
      cannot(
        "update",
        "Member",
        PROTECTED_MEMBER_FIELDS as unknown as string[]
      );
    }
  }

  // =========================================================================
  // Organization Owner (org:owner)
  // - Everything admin can do, plus:
  // - Can modify protected fields
  // - Can manage settings and members
  // - Can delete organization
  // =========================================================================
  if (orgRole === "org:owner") {
    // Full access to settings
    can("manage", "Settings", { organizationId: orgId });

    // Full access to members (invite, remove, change roles)
    can("manage", "Member", { organizationId: orgId });

    // Can manage the organization itself
    can("manage", "Organization", { id: orgId });

    // Owners can update protected fields (override the cannot rules)
    can("update", "Product", PROTECTED_PRODUCT_FIELDS as unknown as string[], {
      organizationId: orgId,
    });
    can("update", "Order", PROTECTED_ORDER_FIELDS as unknown as string[], {
      organizationId: orgId,
    });
    can("update", "Member", PROTECTED_MEMBER_FIELDS as unknown as string[], {
      organizationId: orgId,
    });
  }

  return build();
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
  const ability = buildAbilityFor(ctx);
  return ability.can(action, subject);
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
  const ability = buildAbilityFor(ctx);
  return ability.can(action, subject, field);
}

/**
 * Assert permission or throw error
 */
export function assertAbility(
  ctx: AbilityContext,
  action: AppAction,
  subject: AppSubjects,
  message = "Forbidden: You do not have permission to perform this action"
): void {
  if (!checkAbility(ctx, action, subject)) {
    throw new Error(message);
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
      message ??
        `Forbidden: You do not have permission to ${action} the '${field}' field`
    );
  }
}

/**
 * Get list of fields the user can update on a subject
 */
export function getPermittedFields<T extends AppSubjects>(
  ctx: AbilityContext,
  action: AppAction,
  subject: T,
  allFields: Array<string>
): Array<string> {
  const ability = buildAbilityFor(ctx);
  return allFields.filter((field) => ability.can(action, subject, field));
}

/**
 * Filter an update object to only include permitted fields
 */
export function filterPermittedUpdates<T extends Record<string, unknown>>(
  ctx: AbilityContext,
  subject: AppSubjects,
  updates: T
): Partial<T> {
  const ability = buildAbilityFor(ctx);
  const permitted: Partial<T> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (ability.can("update", subject, key)) {
      (permitted as Record<string, unknown>)[key] = value;
    }
  }

  return permitted;
}

/**
 * Create a subject instance with the 'kind' property for type detection
 */
export function subject<T extends { kind: string }>(
  type: T["kind"],
  obj: Omit<T, "kind">
): T {
  return { ...obj, kind: type } as T;
}

// Convenience functions for creating typed subjects
export const asProduct = (obj: Omit<Product, "kind">): Product =>
  subject("Product", obj);

export const asOrder = (obj: Omit<Order, "kind">): Order =>
  subject("Order", obj);

export const asCustomer = (obj: Omit<Customer, "kind">): Customer =>
  subject("Customer", obj);

export const asSettings = (obj: Omit<Settings, "kind">): Settings =>
  subject("Settings", obj);

export const asMember = (obj: Omit<Member, "kind">): Member =>
  subject("Member", obj);

export const asOrganization = (obj: Omit<Organization, "kind">): Organization =>
  subject("Organization", obj);
