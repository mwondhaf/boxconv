<!--
Sync Impact Report:
- Version change: [New] -> 1.0.0
- Added Principles: Modern SaaS Stack, UX-First Implementation, Velocity Focus (No Tests), End-to-End Type Safety
- Templates requiring updates:
  - .specify/templates/tasks-template.md (⚠ pending: mentions "ensure tests fail" which contradicts Principle 3)
- Follow-up TODOs: None
-->

# Grocery & Package Delivery SaaS Constitution

## Core Principles

### I. Modern SaaS Stack

Core technologies are **TanStack Start**, **Convex**, and **Clerk**. This stack is non-negotiable. All backend logic MUST reside in Convex functions (queries, mutations, actions); authentication MUST be managed via Clerk; frontend routing and rendering MUST be handled by TanStack Start. Do not introduce traditional backend servers (Express, Fastify) or alternative databases without explicit approval.

### II. UX-First Implementation

User Experience is the primary success metric. Utilize **shadcn/ui** for a professional, accessible, and consistent design system. Interfaces MUST be intuitive for logistics flows (Point A to Point B) and grocery selection. Visual polish, responsiveness, and interaction smoothness take precedence over architectural abstractions.

### III. Velocity Focus (No Tests Required)

Automated testing (unit, integration, E2E) is **NOT required**. Development velocity and rapid feature delivery are prioritized over test coverage. Verification SHOULD be performed manually against user stories. Do not write automated tests unless strictly necessary for complex isolated logic or explicitly requested by the user.

### IV. End-to-End Type Safety

Strict TypeScript MUST be used across the entire stack. Leverage the automatic type inference between Convex backend functions and TanStack Start frontend components to ensure type safety from database to UI. Usage of `any` is prohibited unless technically unavoidable and documented.

## Tech Stack & Constraints

### Approved Technologies

- **Framework**: TanStack Start (React)
- **Backend/Database**: Convex (BaaS)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

### Constraints

- **Performance**: Optimize for client-side interactivity and fast initial loads using TanStack Start's capabilities.
- **Styling**: Use Tailwind utility classes; avoid CSS-in-JS libraries unless part of the approved stack.
- **State Management**: Prefer Convex reactivity and URL state; avoid complex global state managers (Redux) unless necessary.

## Development Workflow

### Feature Implementation

1.  **Plan**: Define the user story and data model (Convex schema).
2.  **Build**: Implement UI with shadcn components and connect to Convex functions.
3.  **Verify**: Manually verify the user journey works as expected (No automated tests).
4.  **Refine**: Polish the UX and ensure type safety.

### Code Review Standards

- Verify correct usage of Convex `query` vs `mutation`.
- Ensure Clerk auth guards are present on protected routes/functions.
- Check for accessible UI patterns using shadcn components.
- Confirm no "any" types are leaked.

## Governance

This Constitution governs all technical decisions for the Grocery & Package Delivery SaaS project.

### Amendments

- Changes to the Tech Stack or Core Principles require a semantic version bump and user approval.
- Minor clarifications can be made with a patch version bump.

### Compliance

- All implementation plans must check against these principles.
- Code generated must adhere to the "No Tests" and "Type Safety" rules.

**Version**: 1.0.0 | **Ratified**: 2026-02-03 | **Last Amended**: 2026-02-03
