"use client";

import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import * as React from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface CategoryImageUploadProps {
  categoryId: Id<"categories">;
  categoryName: string;
  imageType: "thumbnail" | "banner";
  currentUrl?: string;
  onUploaded?: () => void;
  onDeleted?: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CategoryImageUpload({
  categoryId,
  categoryName,
  imageType,
  currentUrl,
  onUploaded,
  onDeleted,
  className,
}: CategoryImageUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // R2 upload hook
  const uploadFile = useUploadFile(api.r2);

  // Mutations based on image type
  const setThumbnail = useMutation(api.categoryImages.setThumbnail);
  const setBanner = useMutation(api.categoryImages.setBanner);
  const removeThumbnail = useMutation(api.categoryImages.removeThumbnail);
  const removeBanner = useMutation(api.categoryImages.removeBanner);

  const hasImage = currentUrl !== undefined && currentUrl !== "";

  const onDrop = React.useCallback(
    async (acceptedFiles: Array<File>) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      setIsUploading(true);
      setError(null);

      try {
        // Upload to R2
        const r2Key = await uploadFile(file);

        // Set image URL in category based on type
        if (imageType === "thumbnail") {
          await setThumbnail({ categoryId, r2Key });
        } else {
          await setBanner({ categoryId, r2Key });
        }

        onUploaded?.();
      } catch (e) {
        console.error("Upload failed:", e);
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile, setThumbnail, setBanner, categoryId, imageType, onUploaded]
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      if (imageType === "thumbnail") {
        await removeThumbnail({ categoryId });
      } else {
        await removeBanner({ categoryId });
      }
      onDeleted?.();
    } catch (e) {
      console.error("Delete failed:", e);
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: isUploading,
  });

  const label = imageType === "thumbnail" ? "Thumbnail" : "Banner";
  const description = imageType === "thumbnail" ? "200×200px" : "1200×400px";

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{description}</span>
      </div>

      {hasImage && currentUrl ? (
        <div className="group relative min-w-0">
          <div className="h-16 w-full overflow-hidden rounded-lg border bg-muted">
            <img
              alt={`${categoryName} ${label}`}
              className="size-full object-cover"
              src={currentUrl}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              className="size-7"
              size="icon"
              type="button"
              variant="secondary"
              {...getRootProps()}
              disabled={isUploading}
            >
              <input
                {...getInputProps()}
                aria-label={`Replace ${label.toLowerCase()} for ${categoryName}`}
              />
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
            </Button>
            <Button
              className="size-7"
              disabled={isDeleting}
              onClick={handleDelete}
              size="icon"
              type="button"
              variant="destructive"
            >
              {isDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          {...getRootProps()}
          className={cn(
            "flex h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:bg-muted/30",
            isDragActive && "border-primary bg-primary/5",
            isUploading && "cursor-not-allowed opacity-50"
          )}
        >
          <input
            {...getInputProps()}
            aria-label={`Upload ${label.toLowerCase()} for ${categoryName}`}
          />
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
          <span className="text-[10px]">
            {isUploading ? "Uploading…" : "Upload"}
          </span>
        </button>
      )}

      {error && (
        <p className="truncate text-[10px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default CategoryImageUpload;
