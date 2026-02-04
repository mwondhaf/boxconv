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
 * List all variants (admin view - no organization filter)
 */
export const listAll = query({
  args: {
    isAvailable: v.optional(v.boolean()),
    isApproved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let variants = await ctx.db.query("productVariants").take(limit);

    // Apply filters
    if (args.isAvailable !== undefined) {
      variants = variants.filter((v) => v.isAvailable === args.isAvailable);
    }
    if (args.isApproved !== undefined) {
      variants = variants.filter((v) => v.isApproved === args.isApproved);
    }

    // Enrich with product, organization, and pricing info
    const enrichedVariants = await Promise.all(
      variants.map(async (variant) => {
        const product = await ctx.db.get(variant.productId);
        const organization = await ctx.db.get(variant.organizationId);

        const priceSet = await ctx.db
          .query("priceSets")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .first();

        let price = 0;
        let salePrice: number | undefined;
        let currency = "UGX";
        let priceAmounts: Array<{
          amount: number;
          saleAmount?: number;
          currency: string;
          minQuantity?: number;
          maxQuantity?: number;
        }> = [];

        if (priceSet) {
          const moneyAmounts = await ctx.db
            .query("moneyAmounts")
            .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
            .collect();

          priceAmounts = moneyAmounts.map((ma) => ({
            amount: ma.amount,
            saleAmount: ma.saleAmount ?? undefined,
            currency: ma.currency,
            minQuantity: ma.minQuantity ?? undefined,
            maxQuantity: ma.maxQuantity ?? undefined,
          }));

          // Get first price for backwards compatibility
          if (moneyAmounts.length > 0) {
            price = moneyAmounts[0].amount;
            salePrice = moneyAmounts[0].saleAmount ?? undefined;
            currency = moneyAmounts[0].currency;
          }
        }

        // Get primary image
        const primaryImage = product
          ? await ctx.db
              .query("productImages")
              .withIndex("by_primary", (q) =>
                q.eq("productId", product._id).eq("isPrimary", true)
              )
              .first()
          : null;

        return {
          ...variant,
          product: product
            ? {
                _id: product._id,
                name: product.name,
                slug: product.slug,
                imageUrl: getImageUrl(primaryImage?.r2Key),
              }
            : null,
          organization: organization
            ? {
                _id: organization._id,
                name: organization.name,
                slug: organization.slug,
              }
            : null,
          price,
          salePrice,
          currency,
          priceAmounts,
        };
      })
    );

    return enrichedVariants;
  },
});

/**
 * Get a single variant by ID with pricing info
 */
export const get = query({
  args: { id: v.id("productVariants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) return null;

    // Get product info
    const product = await ctx.db.get(variant.productId);

    // Get price set and amounts
    const priceSet = await ctx.db
      .query("priceSets")
      .withIndex("by_variant", (q) => q.eq("variantId", args.id))
      .first();

    let pricing = null;
    if (priceSet) {
      const moneyAmounts = await ctx.db
        .query("moneyAmounts")
        .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
        .collect();

      pricing = {
        priceSetId: priceSet._id,
        amounts: moneyAmounts,
      };
    }

    // Get organization info
    const organization = await ctx.db.get(variant.organizationId);

    return {
      ...variant,
      product,
      organization,
      pricing,
    };
  },
});

/**
 * List all variants for a product
 */
export const listByProduct = query({
  args: {
    productId: v.id("products"),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    let variantsQuery = ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId));

    const variants = await variantsQuery.collect();

    // Filter by organization if provided
    const filteredVariants = args.organizationId
      ? variants.filter((v) => v.organizationId === args.organizationId)
      : variants;

    // Enrich with pricing
    const enrichedVariants = await Promise.all(
      filteredVariants.map(async (variant) => {
        const priceSet = await ctx.db
          .query("priceSets")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .first();

        let price = 0;
        let salePrice: number | undefined;
        let currency = "UGX";

        if (priceSet) {
          const moneyAmount = await ctx.db
            .query("moneyAmounts")
            .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
            .first();

          if (moneyAmount) {
            price = moneyAmount.amount;
            salePrice = moneyAmount.saleAmount ?? undefined;
            currency = moneyAmount.currency;
          }
        }

        return {
          ...variant,
          price,
          salePrice,
          currency,
        };
      })
    );

    return enrichedVariants;
  },
});

/**
 * List all variants for an organization
 */
export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    isAvailable: v.optional(v.boolean()),
    isApproved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let variantsQuery;

    if (args.isAvailable !== undefined) {
      variantsQuery = ctx.db
        .query("productVariants")
        .withIndex("by_available", (q) =>
          q.eq("organizationId", args.organizationId).eq("isAvailable", args.isAvailable!)
        );
    } else {
      variantsQuery = ctx.db
        .query("productVariants")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        );
    }

    let variants = await variantsQuery.take(limit);

    // Apply additional filters
    if (args.isApproved !== undefined) {
      variants = variants.filter((v) => v.isApproved === args.isApproved);
    }

    // Enrich with product and pricing info
    const enrichedVariants = await Promise.all(
      variants.map(async (variant) => {
        const product = await ctx.db.get(variant.productId);

        const priceSet = await ctx.db
          .query("priceSets")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .first();

        let price = 0;
        let salePrice: number | undefined;
        let currency = "UGX";
        let priceAmounts: Array<{
          amount: number;
          saleAmount?: number;
          currency: string;
          minQuantity?: number;
          maxQuantity?: number;
        }> = [];

        if (priceSet) {
          const moneyAmounts = await ctx.db
            .query("moneyAmounts")
            .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
            .collect();

          priceAmounts = moneyAmounts.map((ma) => ({
            amount: ma.amount,
            saleAmount: ma.saleAmount ?? undefined,
            currency: ma.currency,
            minQuantity: ma.minQuantity ?? undefined,
            maxQuantity: ma.maxQuantity ?? undefined,
          }));

          // Get first price for backwards compatibility
          if (moneyAmounts.length > 0) {
            price = moneyAmounts[0].amount;
            salePrice = moneyAmounts[0].saleAmount ?? undefined;
            currency = moneyAmounts[0].currency;
          }
        }

        // Get primary image
        const primaryImage = product
          ? await ctx.db
              .query("productImages")
              .withIndex("by_primary", (q) =>
                q.eq("productId", product._id).eq("isPrimary", true)
              )
              .first()
          : null;

        return {
          ...variant,
          product: product
            ? {
                _id: product._id,
                name: product.name,
                slug: product.slug,
                imageUrl: getImageUrl(primaryImage?.r2Key),
              }
            : null,
          price,
          salePrice,
          currency,
          priceAmounts,
        };
      })
    );

    return enrichedVariants;
  },
});

/**
 * Get variant by SKU within an organization
 */
export const getBySku = query({
  args: {
    organizationId: v.id("organizations"),
    sku: v.string(),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db
      .query("productVariants")
      .withIndex("by_org_sku", (q) =>
        q.eq("organizationId", args.organizationId).eq("sku", args.sku)
      )
      .first();

    return variant;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new product variant with pricing
 */
export const create = mutation({
  args: {
    productId: v.id("products"),
    organizationId: v.id("organizations"),
    sku: v.string(),
    unit: v.string(),
    weightGrams: v.optional(v.number()),
    barcode: v.optional(v.string()),
    stockQuantity: v.number(),
    isAvailable: v.optional(v.boolean()),
    isApproved: v.optional(v.boolean()),
    // Pricing
    price: v.number(),
    salePrice: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify product exists
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verify organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check SKU uniqueness within organization
    const existingSku = await ctx.db
      .query("productVariants")
      .withIndex("by_org_sku", (q) =>
        q.eq("organizationId", args.organizationId).eq("sku", args.sku)
      )
      .first();

    if (existingSku) {
      throw new Error(
        `SKU "${args.sku}" already exists in this organization`
      );
    }

    // Create variant
    const variantId = await ctx.db.insert("productVariants", {
      productId: args.productId,
      organizationId: args.organizationId,
      sku: args.sku,
      unit: args.unit,
      weightGrams: args.weightGrams,
      barcode: args.barcode,
      stockQuantity: args.stockQuantity,
      isAvailable: args.isAvailable ?? true,
      isApproved: args.isApproved ?? false,
    });

    // Create price set
    const priceSetId = await ctx.db.insert("priceSets", {
      variantId,
      organizationId: args.organizationId,
    });

    // Create money amount
    await ctx.db.insert("moneyAmounts", {
      priceSetId,
      currency: args.currency ?? "UGX",
      amount: args.price,
      saleAmount: args.salePrice,
      minQuantity: undefined,
      maxQuantity: undefined,
    });

    return variantId;
  },
});

/**
 * Update a product variant
 */
export const update = mutation({
  args: {
    id: v.id("productVariants"),
    sku: v.optional(v.string()),
    unit: v.optional(v.string()),
    weightGrams: v.optional(v.number()),
    barcode: v.optional(v.string()),
    stockQuantity: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
    isApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    // Check SKU uniqueness if changing
    if (args.sku && args.sku !== variant.sku) {
      const existingSku = await ctx.db
        .query("productVariants")
        .withIndex("by_org_sku", (q) =>
          q.eq("organizationId", variant.organizationId).eq("sku", args.sku!)
        )
        .first();

      if (existingSku) {
        throw new Error(
          `SKU "${args.sku}" already exists in this organization`
        );
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.sku !== undefined && { sku: args.sku }),
      ...(args.unit !== undefined && { unit: args.unit }),
      ...(args.weightGrams !== undefined && { weightGrams: args.weightGrams }),
      ...(args.barcode !== undefined && { barcode: args.barcode }),
      ...(args.stockQuantity !== undefined && {
        stockQuantity: args.stockQuantity,
      }),
      ...(args.isAvailable !== undefined && { isAvailable: args.isAvailable }),
      ...(args.isApproved !== undefined && { isApproved: args.isApproved }),
    });

    return args.id;
  },
});

/**
 * Update variant pricing
 */
export const updatePricing = mutation({
  args: {
    variantId: v.id("productVariants"),
    price: v.number(),
    salePrice: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Variant not found");
    }

    // Get or create price set
    let priceSet = await ctx.db
      .query("priceSets")
      .withIndex("by_variant", (q) => q.eq("variantId", args.variantId))
      .first();

    if (!priceSet) {
      const priceSetId = await ctx.db.insert("priceSets", {
        variantId: args.variantId,
        organizationId: variant.organizationId,
      });
      priceSet = (await ctx.db.get(priceSetId))!;
    }

    // Get existing money amount
    const existingAmount = await ctx.db
      .query("moneyAmounts")
      .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet!._id))
      .first();

    if (existingAmount) {
      // Update existing
      await ctx.db.patch(existingAmount._id, {
        amount: args.price,
        saleAmount: args.salePrice,
        ...(args.currency && { currency: args.currency }),
      });
    } else {
      // Create new
      await ctx.db.insert("moneyAmounts", {
        priceSetId: priceSet._id,
        currency: args.currency ?? "UGX",
        amount: args.price,
        saleAmount: args.salePrice,
        minQuantity: undefined,
        maxQuantity: undefined,
      });
    }

    return args.variantId;
  },
});

// Update pricing with full tiered pricing support (multiple price rows with quantities)
export const updatePricingTiers = mutation({
  args: {
    variantId: v.id("productVariants"),
    prices: v.array(
      v.object({
        amount: v.number(),
        saleAmount: v.optional(v.number()),
        currency: v.string(),
        minQuantity: v.optional(v.number()),
        maxQuantity: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant) {
      throw new Error("Variant not found");
    }

    // Get or create price set
    let priceSet = await ctx.db
      .query("priceSets")
      .withIndex("by_variant", (q) => q.eq("variantId", args.variantId))
      .first();

    if (!priceSet) {
      const priceSetId = await ctx.db.insert("priceSets", {
        variantId: args.variantId,
        organizationId: variant.organizationId,
      });
      priceSet = (await ctx.db.get(priceSetId))!;
    }

    // Delete all existing money amounts for this price set
    const existingAmounts = await ctx.db
      .query("moneyAmounts")
      .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet!._id))
      .collect();

    for (const amt of existingAmounts) {
      await ctx.db.delete(amt._id);
    }

    // Insert all new price tiers
    for (const price of args.prices) {
      await ctx.db.insert("moneyAmounts", {
        priceSetId: priceSet._id,
        currency: price.currency,
        amount: price.amount,
        saleAmount: price.saleAmount,
        minQuantity: price.minQuantity,
        maxQuantity: price.maxQuantity,
      });
    }

    return args.variantId;
  },
});

/**
 * Update stock quantity
 */
export const updateStock = mutation({
  args: {
    id: v.id("productVariants"),
    stockQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    await ctx.db.patch(args.id, {
      stockQuantity: args.stockQuantity,
    });

    return args.id;
  },
});

/**
 * Adjust stock quantity (add or subtract)
 */
export const adjustStock = mutation({
  args: {
    id: v.id("productVariants"),
    adjustment: v.number(), // positive to add, negative to subtract
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    const newQuantity = Math.max(0, variant.stockQuantity + args.adjustment);

    await ctx.db.patch(args.id, {
      stockQuantity: newQuantity,
    });

    return { id: args.id, newQuantity };
  },
});

/**
 * Toggle variant availability
 */
export const toggleAvailable = mutation({
  args: { id: v.id("productVariants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    await ctx.db.patch(args.id, {
      isAvailable: !variant.isAvailable,
    });

    return { isAvailable: !variant.isAvailable };
  },
});

/**
 * Approve or reject a variant
 */
export const setApproval = mutation({
  args: {
    id: v.id("productVariants"),
    isApproved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    await ctx.db.patch(args.id, {
      isApproved: args.isApproved,
    });

    return args.id;
  },
});

/**
 * Delete a variant and its pricing
 */
export const remove = mutation({
  args: { id: v.id("productVariants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    // Delete price sets and money amounts
    const priceSets = await ctx.db
      .query("priceSets")
      .withIndex("by_variant", (q) => q.eq("variantId", args.id))
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

    // Delete the variant
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// =============================================================================
// CUSTOMER BROWSING QUERIES
// =============================================================================

/**
 * List variants for customer store browsing.
 * Only returns approved and available variants with full pricing info.
 * Used by mobile app for browsing a store's products.
 */
export const listForCustomerBrowsing = query({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.optional(v.id("categories")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get only available and approved variants
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_available", (q) =>
        q.eq("organizationId", args.organizationId).eq("isAvailable", true)
      )
      .filter((q) => q.eq(q.field("isApproved"), true))
      .take(limit);

    // Enrich with product and pricing info
    const enrichedVariants = await Promise.all(
      variants.map(async (variant) => {
        const product = await ctx.db.get(variant.productId);
        if (!product || !product.isActive) return null;

        // Filter by category if provided
        if (args.categoryId && product.categoryId !== args.categoryId) {
          return null;
        }

        // Filter by search if provided
        if (args.search && args.search.trim().length > 0) {
          const searchLower = args.search.toLowerCase();
          const nameMatch = product.name.toLowerCase().includes(searchLower);
          const skuMatch = variant.sku.toLowerCase().includes(searchLower);
          if (!nameMatch && !skuMatch) return null;
        }

        const priceSet = await ctx.db
          .query("priceSets")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .first();

        let price = 0;
        let salePrice: number | undefined;
        let currency = "UGX";
        let priceAmounts: Array<{
          amount: number;
          saleAmount?: number;
          currency: string;
          minQuantity?: number;
          maxQuantity?: number;
        }> = [];

        if (priceSet) {
          const moneyAmounts = await ctx.db
            .query("moneyAmounts")
            .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
            .collect();

          priceAmounts = moneyAmounts.map((ma) => ({
            amount: ma.amount,
            saleAmount: ma.saleAmount ?? undefined,
            currency: ma.currency,
            minQuantity: ma.minQuantity ?? undefined,
            maxQuantity: ma.maxQuantity ?? undefined,
          }));

          // Sort by minQuantity for tiered pricing display
          priceAmounts.sort((a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0));

          // Get base price (lowest tier)
          if (moneyAmounts.length > 0) {
            const basePrice = priceAmounts[0];
            price = basePrice.amount;
            salePrice = basePrice.saleAmount;
            currency = basePrice.currency;
          }
        }

        // Get primary image
        const primaryImage = await ctx.db
          .query("productImages")
          .withIndex("by_primary", (q) =>
            q.eq("productId", product._id).eq("isPrimary", true)
          )
          .first();

        // Calculate effective price for display
        const effectivePrice = salePrice && salePrice < price ? salePrice : price;

        return {
          _id: variant._id,
          sku: variant.sku,
          unit: variant.unit,
          stockQuantity: variant.stockQuantity,
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            imageUrl: getImageUrl(primaryImage?.r2Key),
          },
          price,
          salePrice,
          effectivePrice,
          currency,
          priceAmounts,
          hasDiscount: salePrice !== undefined && salePrice < price,
        };
      })
    );

    // Filter out nulls and return
    return enrichedVariants.filter((v) => v !== null);
  },
});

/**
 * Get variant details for customer viewing.
 * Returns full product info, all images, and pricing tiers.
 */
export const getForCustomer = query({
  args: {
    id: v.id("productVariants"),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) return null;

    // Only return if available and approved
    if (!variant.isAvailable || !variant.isApproved) return null;

    const product = await ctx.db.get(variant.productId);
    if (!product || !product.isActive) return null;

    // Get organization
    const organization = await ctx.db.get(variant.organizationId);

    // Get all product images
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect();

    // Get pricing
    const priceSet = await ctx.db
      .query("priceSets")
      .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
      .first();

    let priceAmounts: Array<{
      amount: number;
      saleAmount?: number;
      currency: string;
      minQuantity?: number;
      maxQuantity?: number;
    }> = [];

    if (priceSet) {
      const moneyAmounts = await ctx.db
        .query("moneyAmounts")
        .withIndex("by_priceSet", (q) => q.eq("priceSetId", priceSet._id))
        .collect();

      priceAmounts = moneyAmounts
        .map((ma) => ({
          amount: ma.amount,
          saleAmount: ma.saleAmount ?? undefined,
          currency: ma.currency,
          minQuantity: ma.minQuantity ?? undefined,
          maxQuantity: ma.maxQuantity ?? undefined,
        }))
        .sort((a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0));
    }

    // Get category and brand info
    const category = product.categoryId ? await ctx.db.get(product.categoryId) : null;
    const brand = product.brandId ? await ctx.db.get(product.brandId) : null;

    return {
      _id: variant._id,
      sku: variant.sku,
      unit: variant.unit,
      stockQuantity: variant.stockQuantity,
      weightGrams: variant.weightGrams,
      barcode: variant.barcode,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        images: images.map((img) => ({
          url: getImageUrl(img.r2Key),
          alt: img.alt,
          isPrimary: img.isPrimary,
        })),
        category: category ? { _id: category._id, name: category.name } : null,
        brand: brand ? { _id: brand._id, name: brand.name } : null,
      },
      organization: organization
        ? {
            _id: organization._id,
            name: organization.name,
            slug: organization.slug,
          }
        : null,
      priceAmounts,
      inStock: variant.stockQuantity > 0,
    };
  },
});
