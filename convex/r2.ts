import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (_ctx, _bucket) => {
    // TODO: Add proper authentication check
  },
  onUpload: async (_ctx, bucket, key) => {
    console.log(`File uploaded to bucket ${bucket} with key: ${key}`);
  },
});

// Re-export commonly used methods
export const deleteObject = r2.deleteObject.bind(r2);
export const getMetadata = r2.getMetadata.bind(r2);

/**
 * Get a public (non-expiring) URL for an R2 object.
 * Requires R2_PUBLIC_BASE_URL environment variable.
 *
 * @param r2Key - The R2 object key
 * @returns The public URL
 */
export function getPublicUrl(r2Key: string): string {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!publicBaseUrl) {
    throw new Error(
      "R2_PUBLIC_BASE_URL environment variable is not set. " +
        "Please configure it with your R2 public domain (e.g., https://cdn.boxkubox.com)"
    );
  }

  // Remove trailing slash from base URL if present
  const baseUrl = publicBaseUrl.replace(/\/$/, "");

  // Remove leading slash from key if present
  const cleanKey = r2Key.replace(/^\//, "");

  return `${baseUrl}/${cleanKey}`;
}
