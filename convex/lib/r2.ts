import { getPublicUrl } from "../r2";

/**
 * Get an image URL from an R2 key.
 * Returns undefined if the key is undefined.
 *
 * @param r2Key - The R2 object key (optional)
 * @returns The public URL or undefined
 */
export function getImageUrl(r2Key: string | undefined): string | undefined {
  if (!r2Key) return undefined;
  return getPublicUrl(r2Key);
}
