import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteObject, getPublicUrl } from "./r2";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get images for a category.
 */
export const getByCategory = query({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      return null;
    }

    return {
      thumbnailUrl: category.thumbnailR2Key
        ? getPublicUrl(category.thumbnailR2Key)
        : undefined,
      bannerUrl: category.bannerR2Key
        ? getPublicUrl(category.bannerR2Key)
        : undefined,
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Set thumbnail image for a category.
 * Called after the file has been uploaded to R2.
 */
export const setThumbnail = mutation({
  args: {
    categoryId: v.id("categories"),
    r2Key: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Delete old thumbnail from R2 if exists
    if (category.thumbnailR2Key) {
      try {
        await deleteObject(ctx, category.thumbnailR2Key);
      } catch (e) {
        console.warn("Could not delete old thumbnail from R2:", e);
      }
    }

    await ctx.db.patch(args.categoryId, {
      thumbnailR2Key: args.r2Key,
    });

    return { thumbnailUrl: getPublicUrl(args.r2Key) };
  },
});

/**
 * Set banner image for a category.
 * Called after the file has been uploaded to R2.
 */
export const setBanner = mutation({
  args: {
    categoryId: v.id("categories"),
    r2Key: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Delete old banner from R2 if exists
    if (category.bannerR2Key) {
      try {
        await deleteObject(ctx, category.bannerR2Key);
      } catch (e) {
        console.warn("Could not delete old banner from R2:", e);
      }
    }

    await ctx.db.patch(args.categoryId, {
      bannerR2Key: args.r2Key,
    });

    return { bannerUrl: getPublicUrl(args.r2Key) };
  },
});

/**
 * Remove thumbnail image from a category.
 */
export const removeThumbnail = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Delete from R2
    if (category.thumbnailR2Key) {
      try {
        await deleteObject(ctx, category.thumbnailR2Key);
      } catch (e) {
        console.warn("Could not delete thumbnail from R2:", e);
      }
    }

    await ctx.db.patch(args.categoryId, {
      thumbnailR2Key: undefined,
    });

    return { success: true };
  },
});

/**
 * Remove banner image from a category.
 */
export const removeBanner = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Delete from R2
    if (category.bannerR2Key) {
      try {
        await deleteObject(ctx, category.bannerR2Key);
      } catch (e) {
        console.warn("Could not delete banner from R2:", e);
      }
    }

    await ctx.db.patch(args.categoryId, {
      bannerR2Key: undefined,
    });

    return { success: true };
  },
});
