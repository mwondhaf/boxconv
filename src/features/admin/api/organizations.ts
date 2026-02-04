import { createServerFn } from '@tanstack/react-start'
import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { z } from 'zod'

// =============================================================================
// Helper: Require Platform Admin
// =============================================================================

async function requirePlatformAdmin() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized: Authentication required')
  }

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const platformRole = user.publicMetadata.platformRole as string | undefined

  if (platformRole !== 'admin') {
    throw new Error('Forbidden: Platform admin access required')
  }

  return { userId, client }
}

// =============================================================================
// List All Organizations
// =============================================================================

export const listOrganizations = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    const { data: organizations, totalCount } =
      await client.organizations.getOrganizationList({
        limit: data.limit,
        offset: data.offset,
        includeMembersCount: true,
      })

    return {
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        imageUrl: org.imageUrl,
        membersCount: org.membersCount ?? 0,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      })),
      totalCount,
      hasMore: data.offset + data.limit < totalCount,
    }
  })

// =============================================================================
// Get Organization Details
// =============================================================================

export const getOrganization = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      organizationId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    const org = await client.organizations.getOrganization({
      organizationId: data.organizationId,
    })

    // Get members
    const { data: members } =
      await client.organizations.getOrganizationMembershipList({
        organizationId: data.organizationId,
        limit: 100,
      })

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      imageUrl: org.imageUrl,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        userId: m.publicUserData?.userId,
        email:
          m.publicUserData?.identifier ?? m.publicUserData?.userId ?? 'Unknown',
        firstName: m.publicUserData?.firstName,
        lastName: m.publicUserData?.lastName,
        imageUrl: m.publicUserData?.imageUrl,
        createdAt: m.createdAt,
      })),
    }
  })

// =============================================================================
// Create Organization
// =============================================================================

export const createOrganization = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().min(1, 'Organization name is required'),
      slug: z.string().optional(),
      createdBy: z.string().optional(), // User ID to set as owner
    })
  )
  .handler(async ({ data }) => {
    const { client, userId } = await requirePlatformAdmin()

    // Create the organization
    const org = await client.organizations.createOrganization({
      name: data.name,
      slug: data.slug,
      createdBy: data.createdBy ?? userId, // Default to admin if not specified
    })

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      imageUrl: org.imageUrl,
      createdAt: org.createdAt,
    }
  })

// =============================================================================
// Update Organization
// =============================================================================

export const updateOrganization = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      organizationId: z.string(),
      name: z.string().optional(),
      slug: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    const org = await client.organizations.updateOrganization(
      data.organizationId,
      {
        name: data.name,
        slug: data.slug,
      }
    )

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      imageUrl: org.imageUrl,
      updatedAt: org.updatedAt,
    }
  })

// =============================================================================
// Delete Organization
// =============================================================================

export const deleteOrganization = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      organizationId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    await client.organizations.deleteOrganization(data.organizationId)

    return { success: true }
  })

// =============================================================================
// Add Member to Organization
// =============================================================================

export const addOrganizationMember = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      organizationId: z.string(),
      userId: z.string(),
      role: z.enum(['org:admin', 'org:member']).default('org:member'),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    const membership =
      await client.organizations.createOrganizationMembership({
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role,
      })

    return {
      id: membership.id,
      role: membership.role,
      userId: membership.publicUserData?.userId,
      createdAt: membership.createdAt,
    }
  })

// =============================================================================
// Remove Member from Organization
// =============================================================================

export const removeOrganizationMember = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      organizationId: z.string(),
      userId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    await client.organizations.deleteOrganizationMembership({
      organizationId: data.organizationId,
      userId: data.userId,
    })

    return { success: true }
  })

// =============================================================================
// Update Member Role
// =============================================================================

export const updateMemberRole = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      organizationId: z.string(),
      userId: z.string(),
      role: z.enum(['org:owner', 'org:admin', 'org:member']),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    const membership =
      await client.organizations.updateOrganizationMembership({
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role,
      })

    return {
      id: membership.id,
      role: membership.role,
      userId: membership.publicUserData?.userId,
    }
  })

// =============================================================================
// Search Users (for adding to organizations)
// =============================================================================

export const searchUsers = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      query: z.string().optional(),
      limit: z.number().optional().default(10),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    const { data: users } = await client.users.getUserList({
      query: data.query,
      limit: data.limit,
    })

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        platformRole: user.publicMetadata.platformRole as string | undefined,
      })),
    }
  })

// =============================================================================
// Set User Platform Role
// =============================================================================

export const setUserPlatformRole = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string(),
      platformRole: z.enum(['admin', 'rider']).nullable(),
    })
  )
  .handler(async ({ data }) => {
    const { client } = await requirePlatformAdmin()

    const user = await client.users.updateUserMetadata(data.userId, {
      publicMetadata: {
        platformRole: data.platformRole,
      },
    })

    return {
      id: user.id,
      platformRole: user.publicMetadata.platformRole as string | undefined,
    }
  })
