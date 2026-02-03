# syntax=docker/dockerfile:1.7

# =============================================================================
# boxconv - TanStack Start + Convex + Clerk
# =============================================================================

# --- base stage ---
FROM node:22-alpine AS base
WORKDIR /app

# --- deps stage: install dependencies ---
FROM base AS deps

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# --- build stage ---
FROM base AS build

# Build args for environment variables needed at build time
ARG VITE_CONVEX_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG CLERK_PUBLISHABLE_KEY

WORKDIR /app

# Copy deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV VITE_CONVEX_URL=${VITE_CONVEX_URL}
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY:-${CLERK_PUBLISHABLE_KEY}}
ENV CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}

# Build the app
# Note: convex/_generated must be committed to the repo
# Run `npx convex dev --once` locally before building
RUN npm run build

# --- production stage ---
FROM base AS production

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy built output
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", ".output/server/index.mjs"]
