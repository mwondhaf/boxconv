import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPublicUrl } from "./r2";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a public (non-expiring) URL for an image from its r2Key.
 */
function getImageUrl(r2Key: string | undefined): string | undefined {
  if (!r2Key) return undefined;
  return getPublicUrl(r2Key);
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a single product by ID
 */
export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    // Get primary image
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    // Get category
    const category = product.categoryId
      ? await ctx.db.get(product.categoryId)
      : null;

    // Get brand
    const brand = product.brandId ? await ctx.db.get(product.brandId) : null;

    // Get tags
    const tags = await ctx.db
      .query("productTags")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    return {
      ...product,
      images,
      category,
      brand,
      tags: tags.map((t) => t.value),
    };
  },
});

/**
 * Get a product by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!product) return null;

    // Get images
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect();

    return { ...product, images };
  },
});

/**
 * List products with filters and pagination
 */
export const list = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    isActive: v.optional(v.boolean()),
    search: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Use search index if search term provided
    if (args.search && args.search.trim().length > 0) {
      const searchResults = await ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) => q.search("name", args.search!))
        .take(limit);

      // Get images for search results
      const productsWithImages = await Promise.all(
        searchResults.map(async (product) => {
          const primaryImage = await ctx.db
            .query("productImages")
            .withIndex("by_primary", (q) =>
              q.eq("productId", product._id).eq("isPrimary", true)
            )
            .first();

          // Get a variant for price/stock info
          const variant = await ctx.db
            .query("productVariants")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .first();

          let price = 0;
          let compareAtPrice: number | undefined;
          if (variant) {
            const priceSet = await ctx.db
              .query("priceSets")
              .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
              .first();
            if (priceSet) {
              const moneyAmount = await ctx.db
                .query("moneyAmounts")
                .withIndex("by_priceSet", (q) =>
                  q.eq("priceSetId", priceSet._id)
                )
                .first();
              if (moneyAmount) {
                price = moneyAmount.amount;
                compareAtPrice = moneyAmount.saleAmount ?? undefined;
              }
            }
          }

          return {
            ...product,
            imageUrl: getImageUrl(primaryImage?.r2Key),
            sku: variant?.sku ?? "",
            price,
            compareAtPrice,
            quantity: variant?.stockQuantity ?? 0,
          };
        })
      );

      return {
        products: productsWithImages,
        hasMore: searchResults.length === limit,
        cursor: undefined,
      };
    }

    // Query by category or brand if specified
    let productsQuery;
    if (args.categoryId) {
      productsQuery = ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!));
    } else if (args.brandId) {
      productsQuery = ctx.db
        .query("products")
        .withIndex("by_brand", (q) => q.eq("brandId", args.brandId!));
    } else if (args.isActive !== undefined) {
      productsQuery = ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!));
    } else {
      productsQuery = ctx.db.query("products");
    }

    const products = await productsQuery.take(limit + 1);
    const hasMore = products.length > limit;
    const resultProducts = hasMore ? products.slice(0, limit) : products;

    // Filter by isActive if needed (when not using index)
    const filteredProducts =
      args.isActive !== undefined && !args.categoryId && !args.brandId
        ? resultProducts
        : args.isActive !== undefined
          ? resultProducts.filter((p) => p.isActive === args.isActive)
          : resultProducts;

    // Enrich with images and variant data
    const enrichedProducts = await Promise.all(
      filteredProducts.map(async (product) => {
        const primaryImage = await ctx.db
          .query("productImages")
          .withIndex("by_primary", (q) =>
            q.eq("productId", product._id).eq("isPrimary", true)
          )
          .first();

        const variant = await ctx.db
          .query("productVariants")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .first();

        let price = 0;
        let compareAtPrice: number | undefined;
        if (variant) {
          const priceSet = await ctx.db
            .query("priceSets")
            .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
            .first();
          if (priceSet) {
            const moneyAmount = await ctx.db
              .query("moneyAmounts")
              .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
              .first();
            if (moneyAmount) {
              price = moneyAmount.amount;
              compareAtPrice = moneyAmount.saleAmount ?? undefined;
            }
          }
        }

        return {
          ...product,
          imageUrl: getImageUrl(primaryImage?.r2Key),
          sku: variant?.sku ?? "",
          price,
          compareAtPrice,
          quantity: variant?.stockQuantity ?? 0,
        };
      })
    );

    return {
      products: enrichedProducts,
      hasMore,
      cursor: hasMore ? resultProducts[resultProducts.length - 1]._id : undefined,
    };
  },
});

/**
 * List active products for a category (customer-facing)
 */
export const listByCategory = query({
  args: {
    categoryId: v.id("categories"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const products = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(limit);

    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        const primaryImage = await ctx.db
          .query("productImages")
          .withIndex("by_primary", (q) =>
            q.eq("productId", product._id).eq("isPrimary", true)
          )
          .first();

        return {
          ...product,
          imageUrl: getImageUrl(primaryImage?.r2Key),
        };
      })
    );

    return enrichedProducts;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new product
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    categoryId: v.id("categories"),
    isActive: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check for slug uniqueness
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Product with slug "${args.slug}" already exists`);
    }

    const productId = await ctx.db.insert("products", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      brandId: args.brandId,
      categoryId: args.categoryId,
      isActive: args.isActive ?? false,
    });

    // Insert tags if provided
    if (args.tags && args.tags.length > 0) {
      for (const tag of args.tags) {
        await ctx.db.insert("productTags", {
          productId,
          value: tag,
        });
      }
    }

    return productId;
  },
});

/**
 * Update a product
 */
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    categoryId: v.optional(v.id("categories")),
    isActive: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check slug uniqueness if changing
    if (args.slug && args.slug !== product.slug) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .first();

      if (existing) {
        throw new Error(`Product with slug "${args.slug}" already exists`);
      }
    }

    // Update product
    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.slug !== undefined && { slug: args.slug }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.brandId !== undefined && { brandId: args.brandId }),
      ...(args.categoryId !== undefined && { categoryId: args.categoryId }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
    });

    // Update tags if provided
    if (args.tags !== undefined) {
      // Delete existing tags
      const existingTags = await ctx.db
        .query("productTags")
        .withIndex("by_product", (q) => q.eq("productId", args.id))
        .collect();

      for (const tag of existingTags) {
        await ctx.db.delete(tag._id);
      }

      // Insert new tags
      for (const tag of args.tags) {
        await ctx.db.insert("productTags", {
          productId: args.id,
          value: tag,
        });
      }
    }

    return args.id;
  },
});

/**
 * Delete a product and all related data
 */
export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Delete images
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    for (const image of images) {
      await ctx.db.delete(image._id);
    }

    // Delete tags
    const tags = await ctx.db
      .query("productTags")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    // Delete variants and their price data
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    for (const variant of variants) {
      // Delete price sets and money amounts
      const priceSets = await ctx.db
        .query("priceSets")
        .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
        .collect();

      for (const priceSet of priceSets) {
        const moneyAmounts = await ctx.db
          .query("moneyAmounts")
          .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
          .collect();

        for (const amount of moneyAmounts) {
          await ctx.db.delete(amount._id);
        }
        await ctx.db.delete(priceSet._id);
      }

      await ctx.db.delete(variant._id);
    }

    // Finally delete the product
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

/**
 * Toggle product active status
 */
export const toggleActive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !product.isActive,
    });

    return { isActive: !product.isActive };
  },
});
