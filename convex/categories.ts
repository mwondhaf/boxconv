import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPublicUrl } from "./r2";
import type { Id } from "./_generated/dataModel";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Add public URLs to a category object from its r2Key fields.
 */
function getCategoryWithPublicUrls<T extends {
  thumbnailR2Key?: string;
  bannerR2Key?: string;
}>(category: T): T & { thumbnailUrl?: string; bannerUrl?: string } {
  return {
    ...category,
    thumbnailUrl: category.thumbnailR2Key
      ? getPublicUrl(category.thumbnailR2Key)
      : undefined,
    bannerUrl: category.bannerR2Key
      ? getPublicUrl(category.bannerR2Key)
      : undefined,
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a single category by ID
 */
export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) return null;

    // Get parent category if exists
    const parent = category.parentId
      ? await ctx.db.get(category.parentId)
      : null;

    // Get child categories
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    return {
      ...getCategoryWithPublicUrls(category),
      parent: parent ? getCategoryWithPublicUrls(parent) : null,
      children: children.map(getCategoryWithPublicUrls),
    };
  },
});

/**
 * Get a category by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return category ? getCategoryWithPublicUrls(category) : null;
  },
});

/**
 * List all categories (flat list)
 */
export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let categoriesQuery = ctx.db.query("categories");

    if (args.isActive !== undefined) {
      categoriesQuery = categoriesQuery.filter((q) =>
        q.eq(q.field("isActive"), args.isActive)
      );
    }

    const categories = await categoriesQuery.take(limit);

    return categories.map(getCategoryWithPublicUrls);
  },
});

/**
 * List root categories (no parent)
 */
export const listRoots = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let categoriesQuery = ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", undefined));

    if (args.isActive !== undefined) {
      categoriesQuery = categoriesQuery.filter((q) =>
        q.eq(q.field("isActive"), args.isActive)
      );
    }

    const categories = await categoriesQuery.collect();

    return categories.map(getCategoryWithPublicUrls);
  },
});

/**
 * List child categories of a parent
 */
export const listByParent = query({
  args: {
    parentId: v.id("categories"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let categoriesQuery = ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId));

    if (args.isActive !== undefined) {
      categoriesQuery = categoriesQuery.filter((q) =>
        q.eq(q.field("isActive"), args.isActive)
      );
    }

    const categories = await categoriesQuery.collect();

    return categories.map(getCategoryWithPublicUrls);
  },
});

/**
 * List categories as a tree structure
 */
export const listTree = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get all categories
    let categoriesQuery = ctx.db.query("categories");

    if (args.isActive !== undefined) {
      categoriesQuery = categoriesQuery.filter((q) =>
        q.eq(q.field("isActive"), args.isActive)
      );
    }

    const allCategories = await categoriesQuery.collect();

    // Build tree structure
    type CategoryWithChildren = (typeof allCategories)[0] & {
      children: CategoryWithChildren[];
    };

    const categoryMap = new Map<string, CategoryWithChildren>();

    // First pass: create map with empty children arrays and public URLs
    for (const cat of allCategories) {
      categoryMap.set(cat._id, { ...getCategoryWithPublicUrls(cat), children: [] });
    }

    // Second pass: build tree
    const roots: CategoryWithChildren[] = [];

    for (const cat of allCategories) {
      const categoryWithChildren = categoryMap.get(cat._id)!;

      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(categoryWithChildren);
        } else {
          // Parent not found (maybe filtered out), treat as root
          roots.push(categoryWithChildren);
        }
      } else {
        roots.push(categoryWithChildren);
      }
    }

    return roots;
  },
});

/**
 * List active categories for customer-facing display
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return categories.map(getCategoryWithPublicUrls);
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new category
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check for slug uniqueness
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Category with slug "${args.slug}" already exists`);
    }

    // Verify parent exists if provided
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) {
        throw new Error("Parent category not found");
      }
    }

    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      parentId: args.parentId,
      isActive: args.isActive ?? true,
    });

    return categoryId;
  },
});

/**
 * Update a category
 */
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check slug uniqueness if changing
    if (args.slug && args.slug !== category.slug) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .first();

      if (existing) {
        throw new Error(`Category with slug "${args.slug}" already exists`);
      }
    }

    // Prevent circular parent references
    if (args.parentId) {
      if (args.parentId === args.id) {
        throw new Error("Category cannot be its own parent");
      }

      // Check for deeper circular references using a simple loop
      const visited = new Set<string>([args.id]);
      let nextParentId = args.parentId as Id<"categories"> | undefined;

      // Limit iterations to prevent infinite loops (max depth of 10)
      for (let i = 0; i < 10 && nextParentId; i++) {
        if (visited.has(nextParentId)) {
          throw new Error("Circular parent reference detected");
        }
        visited.add(nextParentId);

        // Query to get the parent's parentId
        const parentDoc = await ctx.db
          .query("categories")
          .filter((q) => q.eq(q.field("_id"), nextParentId))
          .first();

        if (!parentDoc) break;
        nextParentId = parentDoc.parentId;
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.slug !== undefined && { slug: args.slug }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.parentId !== undefined && { parentId: args.parentId }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
    });

    return args.id;
  },
});

/**
 * Delete a category
 * Note: This will fail if there are products or subcategories referencing it
 */
export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check for child categories
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .first();

    if (children) {
      throw new Error(
        "Cannot delete category with subcategories. Delete subcategories first."
      );
    }

    // Check for products in this category
    const products = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (products) {
      throw new Error(
        "Cannot delete category with products. Move or delete products first."
      );
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

/**
 * Toggle category active status
 */
export const toggleActive = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !category.isActive,
    });

    return { isActive: !category.isActive };
  },
});
