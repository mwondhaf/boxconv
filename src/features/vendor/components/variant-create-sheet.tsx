'use client'

import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { useOrganization } from '@clerk/tanstack-react-start'
import { toast } from 'sonner'

import { api } from 'convex/_generated/api'
import type { Doc, Id } from 'convex/_generated/dataModel'

import { useOrganizationByClerkId } from '~/features/admin'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Separator } from '~/components/ui/separator'

// =============================================================================
// Types
// =============================================================================

interface PriceRow {
  id: string
  amount: string
  saleAmount: string
  currency: string
  minQty: string
  maxQty: string
}

export interface VariantCreateSheetProps {
  productId: Id<'products'> | null
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// =============================================================================
// Helpers
// =============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// =============================================================================
// Component
// =============================================================================

export function VariantCreateSheet({
  productId,
  productName,
  open,
  onOpenChange,
  onSuccess,
}: VariantCreateSheetProps) {
  // Get current organization from Clerk
  const { organization: clerkOrg, isLoaded: clerkLoaded } = useOrganization()

  // Fetch Convex organization by Clerk ID
  const convexOrg = useOrganizationByClerkId(clerkOrg?.id)

  // Check if convex org query is still loading
  // undefined = loading, null = not found, object = found
  const isConvexOrgLoading = clerkOrg?.id && convexOrg === undefined

  // Mutation to ensure organization exists (for org members only)
  const ensureMyOrganization = useMutation(api.organizations.ensureMyOrganization)

  // Track the resolved organization (either from query or after ensuring)
  const [resolvedOrg, setResolvedOrg] = React.useState<Doc<'organizations'> | null>(null)

  // Update resolved org when convexOrg changes
  React.useEffect(() => {
    if (convexOrg) {
      setResolvedOrg(convexOrg)
    }
  }, [convexOrg])

  // Form state
  const [sku, setSku] = React.useState('')
  const [unit, setUnit] = React.useState('')
  const [stockQuantity, setStockQuantity] = React.useState('0')
  const [barcode, setBarcode] = React.useState('')
  const [weightGrams, setWeightGrams] = React.useState('')
  const [isAvailable, setIsAvailable] = React.useState(true)
  const [prices, setPrices] = React.useState<Array<PriceRow>>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Mutations
  const createVariant = useMutation(api.productVariants.create)

  // Reset form when sheet opens
  React.useEffect(() => {
    if (!open) return

    // Generate a default SKU based on product name
    const slugified = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 20)
    setSku(`${slugified}-${Date.now().toString(36).slice(-4)}`)
    setUnit('')
    setStockQuantity('0')
    setBarcode('')
    setWeightGrams('')
    setIsAvailable(true)
    setPrices([
      {
        id: generateId(),
        amount: '',
        saleAmount: '',
        currency: 'UGX',
        minQty: '',
        maxQty: '',
      },
    ])
  }, [open, productName])

  // Reset form when closing
  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (!nextOpen) {
      setSku('')
      setUnit('')
      setStockQuantity('0')
      setBarcode('')
      setWeightGrams('')
      setIsAvailable(true)
      setPrices([])
    }
    onOpenChange(nextOpen)
  }

  const canSubmit =
    sku.trim().length > 0 &&
    unit.trim().length > 0 &&
    prices.length > 0 &&
    prices.some((p) => {
      const amt = Number.parseFloat(p.amount)
      return !Number.isNaN(amt) && amt > 0
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productId) {
      toast.error('No product selected')
      return
    }

    if (!clerkOrg) {
      toast.error('No organization selected. Please select an organization.')
      return
    }

    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Get the organization ID - use existing or ensure it exists
      let orgId: Id<'organizations'>

      if (resolvedOrg?._id) {
        // Already have the organization
        orgId = resolvedOrg._id
      } else if (convexOrg?._id) {
        // Organization exists in Convex
        orgId = convexOrg._id
      } else if (convexOrg === null) {
        // Organization doesn't exist in Convex yet, but user is a member of Clerk org
        // Use ensureMyOrganization to create the Convex record (verified by auth)
        try {
          const ensuredOrg = await ensureMyOrganization({
            clerkOrgId: clerkOrg.id,
            name: clerkOrg.name,
            slug: clerkOrg.slug ?? clerkOrg.id,
            logo: clerkOrg.imageUrl || undefined,
          })

          if (!ensuredOrg?._id) {
            toast.error('Failed to set up organization. Please try again.')
            setIsSubmitting(false)
            return
          }

          setResolvedOrg(ensuredOrg)
          orgId = ensuredOrg._id
        } catch (ensureError) {
          console.error('Failed to ensure organization:', ensureError)
          toast.error('Failed to set up organization. Please contact an administrator.')
          setIsSubmitting(false)
          return
        }
      } else {
        toast.error('Organization not found. Please select an organization.')
        setIsSubmitting(false)
        return
      }

      // Get the first valid price
      const firstPrice = prices.find((p) => {
        const amt = Number.parseFloat(p.amount)
        return !Number.isNaN(amt) && amt > 0
      })

      if (!firstPrice) {
        toast.error('Please enter a valid price')
        setIsSubmitting(false)
        return
      }

      const parsedPrice = Number.parseFloat(firstPrice.amount)
      const parsedSalePrice = firstPrice.saleAmount.trim()
        ? Number.parseFloat(firstPrice.saleAmount)
        : undefined

      await createVariant({
        productId,
        organizationId: orgId,
        sku: sku.trim(),
        unit: unit.trim(),
        stockQuantity: Number.parseInt(stockQuantity || '0', 10) || 0,
        barcode: barcode.trim() || undefined,
        weightGrams: weightGrams
          ? Number.parseInt(weightGrams, 10) || undefined
          : undefined,
        isAvailable,
        isApproved: false, // Vendor-created variants need admin approval
        price: parsedPrice,
        salePrice:
          parsedSalePrice !== undefined && !Number.isNaN(parsedSalePrice)
            ? parsedSalePrice
            : undefined,
        currency: firstPrice.currency || 'UGX',
      })

      toast.success('Product added to your store! Awaiting admin approval.')
      handleOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add product'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addPriceRow = () => {
    setPrices((prev) => [
      ...prev,
      {
        id: generateId(),
        amount: '',
        saleAmount: '',
        currency: 'UGX',
        minQty: '',
        maxQty: '',
      },
    ])
  }

  const updatePriceRow = (id: string, patch: Partial<PriceRow>) => {
    setPrices((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )
  }

  const removePriceRow = (id: string) => {
    setPrices((prev) => prev.filter((row) => row.id !== id))
  }

  // Show loading state while Clerk is loading or Convex org is being fetched
  const isOrgLoading = !clerkLoaded || isConvexOrgLoading
  // Has org if Clerk org is selected (we can ensure Convex org on submit if needed)
  const hasOrg = clerkOrg !== null && clerkOrg !== undefined && !isConvexOrgLoading

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add to My Store</SheetTitle>
        </SheetHeader>

        {/* Product info */}
        <div className="mx-4 rounded-lg border bg-muted/50 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Product
          </div>
          <div className="mt-1 font-medium">{productName}</div>
        </div>



        {/* No organization warning - show if Clerk is loaded and no org selected */}
        {clerkLoaded && !clerkOrg && (
          <div className="mx-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No organization selected. Please select an organization to add products to your store.
            </p>
          </div>
        )}



        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 overflow-y-auto p-4">
            {isOrgLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prices */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Prices *</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={addPriceRow}
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add price
                    </Button>
                  </div>
                  {prices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Add at least one price.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {prices.map((p) => (
                        <div
                          key={p.id}
                          className="grid grid-cols-2 gap-2 sm:grid-cols-5 items-end"
                        >
                          <div>
                            <Label className="text-xs">Amount *</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={p.amount}
                              onChange={(e) =>
                                updatePriceRow(p.id, { amount: e.target.value })
                              }
                              disabled={isSubmitting}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Sale</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="Optional"
                              value={p.saleAmount}
                              onChange={(e) =>
                                updatePriceRow(p.id, { saleAmount: e.target.value })
                              }
                              disabled={isSubmitting}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Min qty</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder="0"
                              value={p.minQty}
                              onChange={(e) =>
                                updatePriceRow(p.id, { minQty: e.target.value })
                              }
                              disabled={isSubmitting}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max qty</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder="0"
                              value={p.maxQty}
                              onChange={(e) =>
                                updatePriceRow(p.id, { maxQty: e.target.value })
                              }
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removePriceRow(p.id)}
                              disabled={prices.length <= 1}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* SKU */}
                <div className="space-y-2">
                  <Label htmlFor="variant-sku">SKU *</Label>
                  <Input
                    id="variant-sku"
                    placeholder="e.g., MILK-1L-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this variant in your store
                  </p>
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <Label htmlFor="variant-unit">Unit *</Label>
                  <Input
                    id="variant-unit"
                    placeholder="e.g., 1kg, 500g, pack"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Stock Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="variant-stock">Stock quantity</Label>
                  <Input
                    id="variant-stock"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-2">
                  <Label htmlFor="variant-barcode">Barcode (optional)</Label>
                  <Input
                    id="variant-barcode"
                    placeholder="Barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <Label htmlFor="variant-weight">Weight (grams, optional)</Label>
                  <Input
                    id="variant-weight"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="e.g., 500"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <Separator />

                {/* Availability */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <Label htmlFor="variant-available" className="font-medium">
                      Available
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Customers can purchase this variant
                    </p>
                  </div>
                  <Switch
                    id="variant-available"
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Approval Notice */}
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> New variants require admin approval
                    before they appear in the store.
                  </p>
                </div>
              </div>
            )}
          </div>

          <SheetFooter>
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting || !hasOrg}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Adding...
                  </>
                ) : (
                  'Add to Store'
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default VariantCreateSheet
