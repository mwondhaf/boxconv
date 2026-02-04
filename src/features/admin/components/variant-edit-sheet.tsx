'use client'

import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'

import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'

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

export interface VariantEditSheetProps {
  variantId: Id<'productVariants'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  isAdmin?: boolean
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

export function VariantEditSheet({
  variantId,
  open,
  onOpenChange,
  title = 'Edit Variant',
  isAdmin = false,
}: VariantEditSheetProps) {
  // Form state
  const [unit, setUnit] = React.useState('')
  const [stockQuantity, setStockQuantity] = React.useState('0')
  const [barcode, setBarcode] = React.useState('')
  const [weightGrams, setWeightGrams] = React.useState('')
  const [isAvailable, setIsAvailable] = React.useState(true)
  const [isApproved, setIsApproved] = React.useState(false)
  const [prices, setPrices] = React.useState<Array<PriceRow>>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Fetch variant data
  const variantData = useQuery(
    api.productVariants.get,
    variantId ? { id: variantId } : 'skip'
  )

  // Mutations
  const updateVariant = useMutation(api.productVariants.update)
  const updatePricingTiers = useMutation(api.productVariants.updatePricingTiers)
  const deleteVariant = useMutation(api.productVariants.remove)

  // Populate form when variant data loads
  React.useEffect(() => {
    if (!open || !variantData) return

    setUnit(variantData.unit)
    setStockQuantity(String(variantData.stockQuantity))
    setBarcode(variantData.barcode ?? '')
    setWeightGrams(
      variantData.weightGrams == null ? '' : String(variantData.weightGrams)
    )
    setIsAvailable(Boolean(variantData.isAvailable))
    setIsApproved(Boolean(variantData.isApproved))

    // Load pricing
    if (variantData.pricing?.amounts) {
      const rows: Array<PriceRow> = variantData.pricing.amounts.map((a) => ({
        id: generateId(),
        amount: String(a.amount),
        saleAmount: a.saleAmount != null ? String(a.saleAmount) : '',
        currency: a.currency,
        minQty: a.minQuantity != null ? String(a.minQuantity) : '',
        maxQty: a.maxQuantity != null ? String(a.maxQuantity) : '',
      }))
      setPrices(rows.length > 0 ? rows : [])
    } else {
      setPrices([])
    }
  }, [open, variantData])

  // Reset form when closing
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setUnit('')
      setStockQuantity('0')
      setBarcode('')
      setWeightGrams('')
      setIsAvailable(true)
      setIsApproved(false)
      setPrices([])
    }
    onOpenChange(nextOpen)
  }

  const canSubmit = unit.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!variantId || !canSubmit || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Update variant core data
      await updateVariant({
        id: variantId,
        unit: unit.trim(),
        stockQuantity: Number.parseInt(stockQuantity || '0', 10) || 0,
        barcode: barcode.trim() || undefined,
        weightGrams: weightGrams
          ? Number.parseInt(weightGrams, 10) || undefined
          : undefined,
        isAvailable,
        isApproved,
      })

      // Update all pricing tiers
      if (prices.length > 0) {
        const priceTiers = prices
          .map((p) => {
            const amount = Number.parseFloat(p.amount)
            if (Number.isNaN(amount) || amount <= 0) return null
            const saleAmt = Number.parseFloat(p.saleAmount)
            const minQty = Number.parseInt(p.minQty, 10)
            const maxQty = Number.parseInt(p.maxQty, 10)
            return {
              amount,
              saleAmount: Number.isNaN(saleAmt) ? undefined : saleAmt,
              currency: p.currency || 'UGX',
              minQuantity: Number.isNaN(minQty) ? undefined : minQty,
              maxQuantity: Number.isNaN(maxQty) ? undefined : maxQty,
            }
          })
          .filter((p): p is NonNullable<typeof p> => p !== null)

        if (priceTiers.length > 0) {
          await updatePricingTiers({
            variantId,
            prices: priceTiers,
          })
        }
      }

      toast.success('Variant updated successfully')
      handleOpenChange(false)
    } catch (error) {
      console.error('Failed to update variant:', error)
      toast.error('Failed to update variant')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!variantId) return

    if (!confirm('Delete this variant? This cannot be undone.')) return

    try {
      await deleteVariant({ id: variantId })
      toast.success('Variant deleted')
      handleOpenChange(false)
    } catch (error) {
      console.error('Failed to delete variant:', error)
      toast.error('Failed to delete variant')
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Vendor info */}
        {variantData?.organization && (
          <div className="mx-4 rounded-lg border bg-muted/50 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vendor
            </div>
            <div className="mt-1 font-medium">
              {variantData.organization.name}
            </div>
          </div>
        )}

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Prices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Prices</Label>
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
                  <p className="text-xs text-muted-foreground">No prices set.</p>
                ) : (
                  <div className="space-y-3">
                    {prices.map((p) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-5 items-end"
                      >
                        <div>
                          <Label className="text-xs">Amount</Label>
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
                            size="sm"
                            variant="ghost"
                            onClick={() => removePriceRow(p.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

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

              {/* Approval (Admin only) */}
              {isAdmin && (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <Label htmlFor="variant-approved" className="font-medium">
                      Approved
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Approved variants are visible to all customers
                    </p>
                  </div>
                  <Switch
                    id="variant-approved"
                    checked={isApproved}
                    onCheckedChange={setIsApproved}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>

          <SheetFooter>
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
                aria-label="Delete variant"
              >
                <Trash2 className="size-4" />
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default VariantEditSheet
