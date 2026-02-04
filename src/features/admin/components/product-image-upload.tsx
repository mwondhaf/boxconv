'use client'

import * as React from 'react'
import { ImageIcon, Loader2, Star, Trash2, Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useMutation } from 'convex/react'
import { useUploadFile } from '@convex-dev/r2/react'
import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'

import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface ProductImage {
  _id: Id<'productImages'>
  productId: Id<'products'>
  url: string
  alt?: string
  isPrimary: boolean
  _creationTime: number
}

export interface ProductImageUploadProps {
  productId: Id<'products'>
  productName: string
  images: Array<ProductImage>
  maxImages?: number
  onUploaded?: () => void
  onDeleted?: () => void
  className?: string
}

export interface SingleImageUploadProps {
  productId: Id<'products'>
  productName: string
  hasImage: boolean
  previewUrl?: string
  onUploaded?: () => void
  onDeleted?: () => void
  className?: string
}

// =============================================================================
// Single Image Upload Component (Simple version like boxkubox front)
// =============================================================================

export function SingleImageUpload({
  productId,
  productName,
  hasImage,
  previewUrl,
  onUploaded,
  onDeleted,
  className,
}: SingleImageUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // R2 upload hook
  const uploadFile = useUploadFile(api.r2)
  const addImage = useMutation(api.productImages.add)
  const deleteAllImages = useMutation(api.productImages.removeAllForProduct)

  const onDrop = React.useCallback(
    async (acceptedFiles: Array<File>) => {
      const file = acceptedFiles[0]
      if (!file) return

      setIsUploading(true)
      setError(null)

      try {
        // Upload to R2
        const r2Key = await uploadFile(file)

        // Add image record to Convex
        await addImage({
          productId,
          r2Key,
          isPrimary: true,
        })

        onUploaded?.()
      } catch (e) {
        console.error('Upload failed:', e)
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
    },
    [uploadFile, addImage, productId, onUploaded]
  )

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteAllImages({ productId })
      onDeleted?.()
    } catch (e) {
      console.error('Delete failed:', e)
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/*': [] },
    maxFiles: 1,
    disabled: hasImage || isUploading,
  })

  let label = 'Click or drag an image to upload'
  if (isUploading) {
    label = 'Uploading…'
  } else if (isDragActive) {
    label = 'Drop the image here'
  }

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label>Product image</Label>
      {hasImage && previewUrl ? (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="h-16 w-16 rounded bg-center bg-cover border"
            style={{ backgroundImage: `url(${previewUrl})` }}
          />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Only one image is allowed.
            </span>
            <Button
              disabled={isDeleting}
              onClick={handleDelete}
              size="sm"
              type="button"
              variant="outline"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          {...getRootProps()}
          className={cn(
            'flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground text-xs hover:bg-muted/30 transition-colors',
            isDragActive && 'border-primary bg-primary/5',
            isUploading && 'cursor-not-allowed opacity-50'
          )}
        >
          <input
            {...getInputProps()}
            aria-label={`Upload image for ${productName}`}
          />
          <div className="flex items-center gap-2">
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {label}
          </div>
        </button>
      )}
      {error && (
        <div className="text-destructive text-xs" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Multi-Image Upload Component (Advanced version with gallery)
// =============================================================================

export function ProductImageUpload({
  productId,
  productName,
  images,
  maxImages = 5,
  onUploaded,
  onDeleted,
  className,
}: ProductImageUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<Id<'productImages'> | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // R2 upload hook
  const uploadFile = useUploadFile(api.r2)
  const addImage = useMutation(api.productImages.add)
  const deleteImage = useMutation(api.productImages.remove)
  const setPrimaryImage = useMutation(api.productImages.setPrimary)

  const canUpload = images.length < maxImages

  const onDrop = React.useCallback(
    async (acceptedFiles: Array<File>) => {
      if (!canUpload) return

      setIsUploading(true)
      setError(null)

      try {
        // Upload files one by one
        for (const file of acceptedFiles) {
          if (images.length >= maxImages) break

          // Upload to R2
          const r2Key = await uploadFile(file)

          // Add image record to Convex
          await addImage({
            productId,
            r2Key,
            isPrimary: images.length === 0, // First image is primary
          })
        }

        onUploaded?.()
      } catch (e) {
        console.error('Upload failed:', e)
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
    },
    [uploadFile, addImage, productId, images.length, maxImages, canUpload, onUploaded]
  )

  const handleDelete = async (imageId: Id<'productImages'>) => {
    setDeletingId(imageId)
    setError(null)

    try {
      await deleteImage({ id: imageId })
      onDeleted?.()
    } catch (e) {
      console.error('Delete failed:', e)
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetPrimary = async (imageId: Id<'productImages'>) => {
    try {
      await setPrimaryImage({ id: imageId })
    } catch (e) {
      console.error('Set primary failed:', e)
      setError(e instanceof Error ? e.message : 'Failed to set primary image')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'image/*': [] },
    maxFiles: maxImages - images.length,
    disabled: !canUpload || isUploading,
  })

  // Sort images: primary first
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1
    return a._creationTime - b._creationTime
  })

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="flex items-center justify-between">
        <Label>Product images</Label>
        <span className="text-muted-foreground text-xs">
          {images.length} / {maxImages}
        </span>
      </div>

      {/* Image Gallery */}
      {sortedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sortedImages.map((image) => (
            <div
              key={image._id}
              className={cn(
                'relative group aspect-square rounded-lg border overflow-hidden bg-muted/30',
                image.isPrimary && 'ring-2 ring-primary'
              )}
            >
              <img
                src={image.url}
                alt={image.alt || productName}
                className="w-full h-full object-cover"
              />

              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="size-2.5 fill-current" />
                  Primary
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && (
                  <Button
                    size="icon-xs"
                    variant="secondary"
                    onClick={() => handleSetPrimary(image._id)}
                    title="Set as primary"
                  >
                    <Star className="size-3" />
                  </Button>
                )}
                <Button
                  size="icon-xs"
                  variant="destructive"
                  onClick={() => handleDelete(image._id)}
                  disabled={deletingId === image._id}
                  title="Delete image"
                >
                  {deletingId === image._id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dropzone */}
      {canUpload && (
        <button
          type="button"
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-muted-foreground text-sm hover:bg-muted/30 transition-colors cursor-pointer',
            isDragActive && 'border-primary bg-primary/5',
            isUploading && 'cursor-not-allowed opacity-50',
            !canUpload && 'cursor-not-allowed opacity-50'
          )}
        >
          <input
            {...getInputProps()}
            aria-label={`Upload images for ${productName}`}
          />
          <div className="rounded-full bg-muted p-3">
            {isUploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImageIcon className="size-6" />
            )}
          </div>
          <div className="text-center">
            {isUploading ? (
              <p>Uploading…</p>
            ) : isDragActive ? (
              <p>Drop images here</p>
            ) : (
              <>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, GIF up to 10MB
                </p>
              </>
            )}
          </div>
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="text-destructive text-xs" role="alert">
          {error}
        </div>
      )}

      {/* Max images reached message */}
      {!canUpload && images.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Maximum {maxImages} images reached. Delete an image to upload more.
        </p>
      )}
    </div>
  )
}

export default ProductImageUpload
