# Research: Grocery & Logistics Platform

**Feature**: Grocery & Logistics Platform
**Status**: Research Complete

## Decision Log

### 1. Data Modeling Strategy (Convex)

**Decision**: Use a relational-style schema in Convex with `masterProducts` and `vendorVariants` tables.
**Rationale**:

- **Master/Variant Split**: Separating the immutable "Master Product" (managed by Admin) from the mutable "Variant" (managed by Vendor) ensures data consistency. Vendors reference a `masterProductId` but own their `price` and `quantity`.
- **Role-Based Access**: Convex row-level security (via helper functions checking `ctx.auth`) allows strict enforcement of who can edit which table.

### 2. Rider Assignment Algorithm

**Decision**: Implement "Nearest Rider Round-Robin" using Geospatial Indexing (Geohash) + Scheduled Functions.
**Rationale**:

- **Geospatial**: Riders' locations will be stored with a geohash. When a job is created, a Convex query filters riders within a neighboring geohash set.
- **Round-Robin**: A `jobAssignments` table tracks which rider has been offered the job. A scheduled Convex mutation (cron/scheduler) runs every 30s to check if the current assignee accepted. If not, it re-assigns to the next nearest rider.
- **Alternatives**: "Broadcast to all" was rejected per spec clarification to reduce noise and race conditions.

### 3. Role Management (Clerk + Convex)

**Decision**: Store user roles in Clerk `publicMetadata` and mirror them in a `users` table in Convex.
**Rationale**:

- **Clerk Metadata**: Allows frontend to easily conditionally render UI based on role without fetching database state.
- **Convex Mirror**: Essential for backend authorization logic (e.g., "only Admins can write to `masterProducts`"). Convex functions will read the user's role from the stored User document (synced via webhook or checked on login).

### 4. UI Component Library

**Decision**: Use **shadcn/ui** with **Tailwind CSS**.
**Rationale**:

- **User Request**: Explicitly requested by user.
- **Velocity**: Pre-built accessible components (Forms, Tables, Dialogs) speed up Admin and Vendor dashboard creation.
- **Customization**: Copy-paste architecture allows full control over styling without fighting a library.

### 5. Date & Time Handling

**Decision**: Use **date-fns**.
**Rationale**:

- **Lightweight**: Tree-shakeable and smaller bundle size than Moment.js.
- **Functionality**: Robust formatting and manipulation for delivery slots and order timestamps.

## Open Questions Resolved

- **Rider Assignment**: Clarified as Round-Robin. Implementation will use a scheduler.
- **Payments**: Clarified as "Platform Collects All". Schema will include a `ledger` table to track "Payout" obligations, but no real-time payment splitting logic is needed yet.
- **Vendor Confirmation**: Added a `status` field transition `Pending -> VendorConfirmed` to the Order schema.
