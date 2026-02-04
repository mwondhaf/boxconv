import { internalMutation } from "../_generated/server";

/**
 * Migration: Clean up old image fields from categories.
 *
 * This migration removes the old `thumbnailUrl`, `bannerUrl`, `hasThumbnail`, `hasBanner`
 * fields if they exist, keeping only `thumbnailR2Key` and `bannerR2Key`.
 *
 * Run this migration via the Convex dashboard or CLI:
 * npx convex run migrations/migrateImages:migrateCategories
 */
export const migrateCategories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();

    let migratedCount = 0;

    for (const category of categories) {
      const doc = category as Record<string, unknown>;

      // Check if old fields exist
      const hasOldFields =
        "thumbnailUrl" in doc ||
        "bannerUrl" in doc ||
        "hasThumbnail" in doc ||
        "hasBanner" in doc;

      if (!hasOldFields) {
        continue;
      }

      // Remove old fields by setting them to undefined
      const updates: Record<string, unknown> = {};

      if ("thumbnailUrl" in doc) {
        updates.thumbnailUrl = undefined;
      }
      if ("bannerUrl" in doc) {
        updates.bannerUrl = undefined;
      }
      if ("hasThumbnail" in doc) {
        updates.hasThumbnail = undefined;
      }
      if ("hasBanner" in doc) {
        updates.hasBanner = undefined;
      }

      await ctx.db.patch(category._id, updates);
      migratedCount++;
    }

    console.log(`Migrated ${migratedCount} categories`);
  },
});

/**
 * Migration: Clean up old image fields from productImages.
 *
 * This migration removes the old `url` and `storageId` fields if they exist,
 * keeping only `r2Key`.
 *
 * Run this migration via the Convex dashboard or CLI:
 * npx convex run migrations/migrateImages:migrateProductImages
 */
export const migrateProductImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("productImages").collect();

    let migratedCount = 0;

    for (const image of images) {
      const doc = image as Record<string, unknown>;

      // Check if old fields exist
      const hasOldFields = "url" in doc || "storageId" in doc;

      if (!hasOldFields) {
        continue;
      }

      // Remove old fields by setting them to undefined
      const updates: Record<string, unknown> = {};

      if ("url" in doc) {
        updates.url = undefined;
      }
      if ("storageId" in doc) {
        updates.storageId = undefined;
      }

      await ctx.db.patch(image._id, updates);
      migratedCount++;
    }

    console.log(`Migrated ${migratedCount} product images`);
  },
});

/**
 * Dry run: Check what would be migrated without making changes.
 *
 * Run this first to see what data needs migration:
 * npx convex run migrations/migrateImages:dryRun
 */
export const dryRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check categories
    const categories = await ctx.db.query("categories").collect();
    let categoriesWithOldFields = 0;

    for (const category of categories) {
      const doc = category as Record<string, unknown>;
      if (
        "thumbnailUrl" in doc ||
        "bannerUrl" in doc ||
        "hasThumbnail" in doc ||
        "hasBanner" in doc
      ) {
        categoriesWithOldFields++;
        console.log(`Category "${doc.name}" has old image fields:`, {
          hasThumbnailUrl: "thumbnailUrl" in doc,
          hasBannerUrl: "bannerUrl" in doc,
          hasHasThumbnail: "hasThumbnail" in doc,
          hasHasBanner: "hasBanner" in doc,
          hasThumbnailR2Key: "thumbnailR2Key" in doc,
          hasBannerR2Key: "bannerR2Key" in doc,
        });
      }
    }

    // Check product images
    const images = await ctx.db.query("productImages").collect();
    let imagesWithOldFields = 0;
    let imagesWithoutR2Key = 0;

    for (const image of images) {
      const doc = image as Record<string, unknown>;
      if ("url" in doc || "storageId" in doc) {
        imagesWithOldFields++;
      }
      if (!("r2Key" in doc && doc.r2Key)) {
        imagesWithoutR2Key++;
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Categories needing migration: ${categoriesWithOldFields}`);
    console.log(`Product images needing migration: ${imagesWithOldFields}`);
    console.log(`Product images missing r2Key: ${imagesWithoutR2Key}`);
  },
});
