import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteObject, getPublicUrl } from "./r2";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all images for a product.
 */
export const listByProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    // Sort: primary image first, then by creation time
    const sortedImages = images.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a._creationTime - b._creationTime;
    });

    // Return images with public URLs
    return sortedImages.map((image) => ({
      ...image,
      url: getPublicUrl(image.r2Key),
    }));
  },
});

/**
 * Get primary image for a product.
 */
export const getPrimary = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const primaryImage = await ctx.db
      .query("productImages")
      .withIndex("by_primary", (q) =>
        q.eq("productId", args.productId).eq("isPrimary", true)
      )
      .first();

    if (!primaryImage) {
      return null;
    }

    return {
      ...primaryImage,
      url: getPublicUrl(primaryImage.r2Key),
    };
  },
});

/**
 * Get a single image by ID.
 */
export const get = query({
  args: {
    id: v.id("productImages"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id);
    if (!image) {
      return null;
    }

    return {
      ...image,
      url: getPublicUrl(image.r2Key),
    };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Add an image to a product.
 * Called after the file has been uploaded to R2.
 */
export const add = mutation({
  args: {
    productId: v.id("products"),
    r2Key: v.string(),
    alt: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if product exists
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // If this is marked as primary, unset any existing primary
    if (args.isPrimary) {
      const existingPrimary = await ctx.db
        .query("productImages")
        .withIndex("by_primary", (q) =>
          q.eq("productId", args.productId).eq("isPrimary", true)
        )
        .first();

      if (existingPrimary) {
        await ctx.db.patch(existingPrimary._id, { isPrimary: false });
      }
    }

    // Check if this is the first image (make it primary by default)
    const existingImages = await ctx.db
      .query("productImages")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const shouldBePrimary = args.isPrimary ?? existingImages.length === 0;

    const imageId = await ctx.db.insert("productImages", {
      productId: args.productId,
      r2Key: args.r2Key,
      alt: args.alt,
      isPrimary: shouldBePrimary,
    });

    return imageId;
  },
});

/**
 * Update image metadata.
 */
export const update = mutation({
  args: {
    id: v.id("productImages"),
    alt: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    // If setting as primary, unset existing primary
    if (args.isPrimary) {
      const existingPrimary = await ctx.db
        .query("productImages")
        .withIndex("by_primary", (q) =>
          q.eq("productId", image.productId).eq("isPrimary", true)
        )
        .first();

      if (existingPrimary && existingPrimary._id !== args.id) {
        await ctx.db.patch(existingPrimary._id, { isPrimary: false });
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.alt !== undefined && { alt: args.alt }),
      ...(args.isPrimary !== undefined && { isPrimary: args.isPrimary }),
    });

    return args.id;
  },
});

/**
 * Set an image as the primary image for its product.
 */
export const setPrimary = mutation({
  args: { id: v.id("productImages") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    // Unset existing primary
    const existingPrimary = await ctx.db
      .query("productImages")
      .withIndex("by_primary", (q) =>
        q.eq("productId", image.productId).eq("isPrimary", true)
      )
      .first();

    if (existingPrimary && existingPrimary._id !== args.id) {
      await ctx.db.patch(existingPrimary._id, { isPrimary: false });
    }

    // Set this as primary
    await ctx.db.patch(args.id, { isPrimary: true });

    return args.id;
  },
});

/**
 * Delete an image.
 */
export const remove = mutation({
  args: { id: v.id("productImages") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    // Delete from R2
    try {
      await deleteObject(ctx, image.r2Key);
    } catch (e) {
      console.warn("Could not delete from R2:", e);
    }

    // If this was primary, set another image as primary
    if (image.isPrimary) {
      const otherImage = await ctx.db
        .query("productImages")
        .withIndex("by_product", (q) => q.eq("productId", image.productId))
        .filter((q) => q.neq(q.field("_id"), args.id))
        .first();

      if (otherImage) {
        await ctx.db.patch(otherImage._id, { isPrimary: true });
      }
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

/**
 * Delete all images for a product.
 */
export const removeAllForProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    for (const image of images) {
      // Delete from R2
      try {
        await deleteObject(ctx, image.r2Key);
      } catch (e) {
        console.warn("Could not delete from R2:", e);
      }

      await ctx.db.delete(image._id);
    }

    return { success: true, deletedCount: images.length };
  },
});
