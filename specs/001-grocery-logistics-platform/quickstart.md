# Quickstart: Grocery & Logistics Platform

## Prerequisites

- Node.js 18+
- npm/pnpm/yarn
- Convex Account
- Clerk Account

## Setup

1.  **Install Dependencies**:

    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file based on `.env.example`:

    ```bash
    CONVEX_DEPLOYMENT=...
    NEXT_PUBLIC_CONVEX_URL=...
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
    CLERK_SECRET_KEY=...
    ```

3.  **Start Dev Server**:

    ```bash
    npm run dev
    ```

    This starts the TanStack Start frontend and runs `convex dev` concurrently.

4.  **Seed Data (Optional)**:
    - Log in as an Admin (set role in Clerk metadata manually or via script).
    - Go to `/admin` to create Master Products.

## Key Flows

### Admin: Create Product

1.  Navigate to `/admin/products`.
2.  Click "New Product".
3.  Fill in details and save.

### Vendor: List Variant

1.  Navigate to `/vendor/products`.
2.  Select a Master Product from the catalog.
3.  Set price and stock.
4.  Click "Publish".

### Customer: Order

1.  Navigate to `/`.
2.  Browse products (aggregated by variants).
3.  Add to cart and checkout.
4.  Order appears in `/customer/orders`.

### Rider: Delivery

1.  Navigate to `/rider`.
2.  Set status to "Available".
3.  Wait for job assignment (simulated or real-time).
4.  Accept and complete job.

## Troubleshooting

- **No Riders Found**: Ensure a rider user exists, has a `riderProfile`, and `isAvailable` is true. Also check `geohash` alignment if testing geospatial.
- **Permissions**: Check `ctx.auth` logic in Convex functions if actions are denied.
