# CASL Authorization in BoxConv

This document explains how CASL (Code Access Security Layer) authorization works in the BoxConv project. All permissions are tied to **Clerk organizations** and user roles.

## Overview

BoxConv uses a role-based access control (RBAC) system built on [CASL](https://casl.js.org/). The authorization system has two layers:

1. **Platform Roles** - Stored in Clerk `publicMetadata.platformRole`
2. **Organization Roles** - Managed by Clerk Organizations (`org:owner`, `org:admin`, `org:member`)

All data in BoxConv is scoped to organizations. Users can only access resources that belong to their current organization.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clerk                                    │
│  ┌──────────────────┐    ┌─────────────────────────────────┐   │
│  │  publicMetadata  │    │     Organization Membership      │   │
│  │  └─platformRole  │    │  └─ orgId, orgRole (owner/admin) │   │
│  └──────────────────┘    └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AbilityContext                                │
│  { userId, orgId, orgRole, platformRole }                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   buildAbilityFor(ctx)                          │
│  Returns CASL AppAbility with rules based on roles              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│      Client (React)       │    │     Server (Convex)      │
│  • Zustand ability store  │    │  • requireAbility()      │
│  • <Can> component        │    │  • requireOrgMembership()│
│  • useCan() hook          │    │  • ability.can()         │
└──────────────────────────┘    └──────────────────────────┘
```

## Role Hierarchy

```
Platform Admin (staff)
    │ Full access to everything
    ▼
Organization Owner
    │ Full access within their org
    ▼
Organization Admin
    │ CRUD on products, orders, customers (some field restrictions)
    ▼
Organization Member
    │ Read access + create orders
    ▼
Rider
    │ Read/update assigned deliveries only
    ▼
Guest
    │ No access
```

## Platform Roles

| Role | Description | Access |
|------|-------------|--------|
| `admin` | BoxKuBox staff | Full platform access, can access any organization |
| `rider` | Delivery riders | Limited to their assigned deliveries |
| `undefined` | Regular users | Access determined by org membership |

Platform roles are set in Clerk's `publicMetadata.platformRole` for each user.

## Organization Roles (Clerk)

| Role | Description | Permissions |
|------|-------------|-------------|
| `org:owner` | Organization owner | Full access to org resources, settings, and members |
| `org:admin` | Organization admin | CRUD on products/orders/customers, read settings/members |
| `org:member` | Organization member | Read products/orders/customers, create orders |

These roles are managed entirely through Clerk's Organization feature.

## Subjects (Resources)

The following subjects are protected by CASL:

| Subject | Description | Database Table |
|---------|-------------|----------------|
| `Product` | Inventory items | `products` |
| `Order` | Customer orders | `orders` |
| `Customer` | Customer records | `customers` |
| `Category` | Product categories | `categories` |
| `Settings` | Organization settings | `organizationSettings` |
| `Member` | Organization members | (via Clerk) |
| `Organization` | The organization itself | (via Clerk) |

## Actions

| Action | Description |
|--------|-------------|
| `manage` | Full access (create, read, update, delete) |
| `create` | Create new resources |
| `read` | View resources |
| `update` | Modify resources |
| `delete` | Remove resources |

## Organization Scoping

**All resources are scoped to organizations.** Every database record includes an `organizationId` field that links it to a Clerk organization.

### Data Flow

```
1. User makes request
        │
        ▼
2. Extract orgId from Clerk session
        │
        ▼
3. Build CASL ability with orgId context
        │
        ▼
4. Query database with organizationId filter
        │
        ▼
5. Check ability.can() before returning/modifying data
```

This ensures complete data isolation between organizations.

## Field-Level Permissions

Some fields have additional restrictions. Only **org:owner** (or platform admin) can update:

| Subject | Protected Fields | Reason |
|---------|-----------------|--------|
| Product | `price`, `sku`, `isActive` | Financial/inventory control |
| Order | `status`, `total` | Order integrity |
| Member | `role` | Security - prevent privilege escalation |

Org admins can update other fields but not these protected ones.

## Request Flow

### Client-Side Flow

```
┌────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   __root__     │────▶│  useSyncAbility  │────▶│  Zustand Store  │
│  beforeLoad    │     │     (hook)       │     │  ability state  │
└────────────────┘     └──────────────────┘     └─────────────────┘
        │                                               │
        │ Fetches Clerk auth:                          │
        │ • userId                                      ▼
        │ • orgId                              ┌─────────────────┐
        │ • orgRole                            │   Components    │
        │ • publicMetadata                     │  <Can>, useCan  │
        │                                      └─────────────────┘
```

### Server-Side Flow (Convex)

```
┌────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Convex Query  │────▶│  ctx.auth            │────▶│  CASL Ability   │
│  or Mutation   │     │  .getUserIdentity()  │     │  Permission     │
└────────────────┘     └──────────────────────┘     └─────────────────┘
        │                       │                          │
        │                       ▼                          ▼
        │              ┌──────────────────┐      ┌─────────────────┐
        │              │ AbilityContext   │      │ Allow/Deny      │
        │              │ extraction       │      │ the operation   │
        │              └──────────────────┘      └─────────────────┘
```

## Client-Side Usage

### 1. Syncing Permissions

The `useSyncAbility()` hook reads auth context from the route and updates the Zustand store. Call it in layout components:

```tsx
function VendorLayout() {
  useSyncAbility()
  return <Outlet />
}
```

### 2. Declarative Rendering with `<Can>`

```tsx
// Show element only if user can create products
<Can I="create" a="Product">
  <Button>Add Product</Button>
</Can>

// Show warning when user CANNOT update price (inverted check)
<Can I="update" a="Product" field="price" not>
  <Alert>Contact your admin to change prices</Alert>
</Can>

// Show fallback content when permission denied
<Can I="delete" a="Order" otherwise={<span>Cannot delete</span>}>
  <DeleteButton />
</Can>
```

### 3. Programmatic Checks with `useCan()`

```tsx
function ProductActions({ product }) {
  const canEdit = useCan('update', 'Product')
  const canDelete = useCan('delete', 'Product')
  const canChangePrice = useCan('update', 'Product', 'price')

  return (
    <div>
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
      {!canChangePrice && <PriceLockedBadge />}
    </div>
  )
}
```

### 4. Accessing Ability Directly

```tsx
function CustomPermissionCheck() {
  const ability = useAbility()
  
  // Check any permission
  const allowed = ability.can('manage', 'Settings')
  
  // Check with subject instance
  const product = asProduct({ _id: '123', organizationId: 'org_xxx', ... })
  const canUpdate = ability.can('update', product)
}
```

## Server-Side Usage (Convex)

### Helper Functions

| Function | Returns | Throws If |
|----------|---------|-----------|
| `requireAuth(ctx)` | `{ userId, abilityCtx }` | Not authenticated |
| `requireOrgMembership(ctx)` | `{ userId, orgId, abilityCtx }` | No org membership |
| `requireAbility(ctx, action, subject)` | `{ userId, orgId, abilityCtx, ability }` | Permission denied |
| `requireOrgOwner(ctx)` | `{ userId, orgId, abilityCtx }` | Not org owner |
| `requireOrgAdmin(ctx)` | `{ userId, orgId, abilityCtx }` | Not org admin+ |
| `requirePlatformAdmin(ctx)` | `{ userId, abilityCtx }` | Not platform admin |

### Pattern 1: Simple Permission Check

```ts
export const list = query({
  handler: async (ctx) => {
    const { orgId } = await requireOrgMembership(ctx)
    
    return ctx.db
      .query('products')
      .withIndex('by_organization', q => q.eq('organizationId', orgId))
      .collect()
  }
})
```

### Pattern 2: Action-Based Permission

```ts
export const create = mutation({
  args: { name: v.string(), price: v.number() },
  handler: async (ctx, args) => {
    // Throws if user cannot create products
    const { userId, orgId } = await requireAbility(ctx, 'create', 'Product')
    
    return ctx.db.insert('products', {
      ...args,
      organizationId: orgId,
      createdBy: userId,
      createdAt: Date.now(),
    })
  }
})
```

### Pattern 3: Instance-Level Permission

```ts
export const update = mutation({
  args: { productId: v.id('products'), name: v.string() },
  handler: async (ctx, args) => {
    const { orgId, abilityCtx } = await requireOrgMembership(ctx)
    const ability = buildAbilityFor(abilityCtx)
    
    const product = await ctx.db.get(args.productId)
    if (!product || product.organizationId !== orgId) {
      throw new Error('Product not found')
    }
    
    // Check permission on this specific product
    const productSubject = asProduct({
      _id: product._id,
      organizationId: product.organizationId,
      ...
    })
    
    if (!ability.can('update', productSubject)) {
      throw new Error('Forbidden')
    }
    
    await ctx.db.patch(args.productId, { name: args.name })
  }
})
```

### Pattern 4: Field-Level Permission

```ts
export const updatePrice = mutation({
  args: { productId: v.id('products'), price: v.number() },
  handler: async (ctx, args) => {
    const { orgId, abilityCtx } = await requireOrgMembership(ctx)
    const ability = buildAbilityFor(abilityCtx)
    
    const product = await ctx.db.get(args.productId)
    const productSubject = asProduct({ ... })
    
    // Check field-level permission
    if (!ability.can('update', productSubject, 'price')) {
      throw new Error('Only organization owners can update prices')
    }
    
    await ctx.db.patch(args.productId, { price: args.price })
  }
})
```

## File Structure

```
src/shared/
├── lib/
│   └── ability.ts           # Client-side ability types, builder, helpers
├── stores/
│   └── ability-store.ts     # Zustand store for reactive abilities
├── hooks/
│   └── use-sync-ability.ts  # Hook to sync with Clerk auth context
├── components/
│   ├── can.tsx              # <Can> component for declarative checks
│   └── ability-provider.tsx # React context provider (optional)
├── types/
│   └── roles.ts             # Role type definitions
└── index.ts                 # Barrel exports

convex/
├── lib/
│   └── ability.ts           # Server-side ability (mirrors client)
├── products.ts              # Example: CASL-protected product mutations
├── orders.ts                # Example: CASL-protected order mutations
├── customers.ts             # Example: CASL-protected customer mutations
└── settings.ts              # Example: CASL-protected settings mutations
```

## Permission Matrix

| Subject | Member | Admin | Owner | Platform Admin |
|---------|--------|-------|-------|----------------|
| **Product** |
| └ read | ✅ org | ✅ org | ✅ org | ✅ all |
| └ create | ❌ | ✅ | ✅ | ✅ |
| └ update | ❌ | ✅* | ✅ | ✅ |
| └ delete | ❌ | ✅ | ✅ | ✅ |
| **Order** |
| └ read | ✅ org | ✅ org | ✅ org | ✅ all |
| └ create | ✅ | ✅ | ✅ | ✅ |
| └ update | ❌ | ✅* | ✅ | ✅ |
| └ delete | ❌ | ✅ | ✅ | ✅ |
| **Customer** |
| └ read | ✅ org | ✅ org | ✅ org | ✅ all |
| └ create | ❌ | ✅ | ✅ | ✅ |
| └ update | ❌ | ✅ | ✅ | ✅ |
| └ delete | ❌ | ✅ | ✅ | ✅ |
| **Settings** |
| └ read | ❌ | ✅ org | ✅ org | ✅ all |
| └ manage | ❌ | ❌ | ✅ | ✅ |
| **Member** |
| └ read | ❌ | ✅ org | ✅ org | ✅ all |
| └ manage | ❌ | ❌ | ✅ | ✅ |

*Admin cannot update protected fields (price, sku, isActive, status, total, role)

## Key Principles

1. **Organization-First**: All data belongs to an organization. No orphan data.
2. **Defense in Depth**: Check permissions on both client AND server. Never trust client alone.
3. **Least Privilege**: Users only get the minimum permissions they need.
4. **Explicit Checks**: Every mutation/query explicitly checks permissions. No implicit access.
5. **Audit Trail**: Activity logs track who did what and when.
6. **Fail Closed**: If permission check fails or errors, deny access.

## Troubleshooting

### User has no permissions
- Check they have an active Clerk organization selected
- Verify their org role in Clerk dashboard
- Ensure `useSyncAbility()` is called in the layout

### Platform admin can't access
- Ensure `publicMetadata.platformRole` is set to `"admin"` in Clerk dashboard
- Check that the auth context is being extracted correctly

### Field-level permission denied
- Only org owners can update protected fields
- This is intentional - org admins should escalate to owners

### "Organization membership required" error
- User needs to be part of a Clerk organization
- Check they have joined/been invited to an org

### Stale permissions after role change
- Role changes in Clerk require re-authentication
- Have user sign out and back in, or switch orgs

## Adding New Permissions

1. Add the subject type in `src/shared/lib/ability.ts` and `convex/lib/ability.ts`
2. Define rules in `buildAbilityFor()` for each role
3. Add corresponding database table in `convex/schema.ts` with `organizationId` field
4. Create mutations/queries with appropriate `requireAbility()` checks
5. Update this documentation with the new permission matrix
