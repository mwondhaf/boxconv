"use client";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";

// =============================================================================
// Types
// =============================================================================

interface PriceRow {
  id: string;
  amount: string;
  saleAmount: string;
  currency: string;
  minQty: string;
  maxQty: string;
}

export interface VariantEditSheetProps {
  variantId: Id<"productVariants"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// =============================================================================
// Component
// =============================================================================

export function VariantEditSheet({
  variantId,
  open,
  onOpenChange,
  title = "Edit Variant",
}: VariantEditSheetProps) {
  // Form state
  const [unit, setUnit] = React.useState("");
  const [stockQuantity, setStockQuantity] = React.useState("0");
  const [barcode, setBarcode] = React.useState("");
  const [weightGrams, setWeightGrams] = React.useState("");
  const [isAvailable, setIsAvailable] = React.useState(true);

  const [prices, setPrices] = React.useState<Array<PriceRow>>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch variant data
  const variantData = useQuery(
    api.productVariants.get,
    variantId ? { id: variantId } : "skip"
  );

  // Mutations
  const updateVariant = useMutation(api.productVariants.update);
  const updatePricingTiers = useMutation(
    api.productVariants.updatePricingTiers
  );
  const deleteVariant = useMutation(api.productVariants.remove);

  // Populate form when variant data loads
  React.useEffect(() => {
    if (!(open && variantData)) return;

    setUnit(variantData.unit);
    setStockQuantity(String(variantData.stockQuantity));
    setBarcode(variantData.barcode ?? "");
    setWeightGrams(
      variantData.weightGrams == null ? "" : String(variantData.weightGrams)
    );
    setIsAvailable(Boolean(variantData.isAvailable));

    // Load pricing
    if (variantData.pricing?.amounts) {
      const rows: Array<PriceRow> = variantData.pricing.amounts.map((a) => ({
        id: generateId(),
        amount: String(a.amount),
        saleAmount: a.saleAmount != null ? String(a.saleAmount) : "",
        currency: a.currency,
        minQty: a.minQuantity != null ? String(a.minQuantity) : "",
        maxQty: a.maxQuantity != null ? String(a.maxQuantity) : "",
      }));
      setPrices(rows.length > 0 ? rows : []);
    } else {
      setPrices([]);
    }
  }, [open, variantData]);

  // Reset form when closing
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setUnit("");
      setStockQuantity("0");
      setBarcode("");
      setWeightGrams("");
      setIsAvailable(true);

      setPrices([]);
    }
    onOpenChange(nextOpen);
  };

  const canSubmit = unit.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(variantId && canSubmit) || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Update variant core data
      await updateVariant({
        id: variantId,
        unit: unit.trim(),
        stockQuantity: Number.parseInt(stockQuantity || "0", 10) || 0,
        barcode: barcode.trim() || undefined,
        weightGrams: weightGrams
          ? Number.parseInt(weightGrams, 10) || undefined
          : undefined,
        isAvailable,
      });

      // Update all pricing tiers
      if (prices.length > 0) {
        const priceTiers = prices
          .map((p) => {
            const amount = Number.parseFloat(p.amount);
            if (Number.isNaN(amount) || amount <= 0) return null;
            const saleAmt = Number.parseFloat(p.saleAmount);
            const minQty = Number.parseInt(p.minQty, 10);
            const maxQty = Number.parseInt(p.maxQty, 10);
            return {
              amount,
              saleAmount: Number.isNaN(saleAmt) ? undefined : saleAmt,
              currency: p.currency || "UGX",
              minQuantity: Number.isNaN(minQty) ? undefined : minQty,
              maxQuantity: Number.isNaN(maxQty) ? undefined : maxQty,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        if (priceTiers.length > 0) {
          await updatePricingTiers({
            variantId,
            prices: priceTiers,
          });
        }
      }

      toast.success("Variant updated successfully");
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to update variant:", error);
      toast.error("Failed to update variant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!variantId) return;

    if (!confirm("Delete this variant? This cannot be undone.")) return;

    try {
      await deleteVariant({ id: variantId });
      toast.success("Variant deleted");
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to delete variant:", error);
      toast.error("Failed to delete variant");
    }
  };

  const addPriceRow = () => {
    setPrices((prev) => [
      ...prev,
      {
        id: generateId(),
        amount: "",
        saleAmount: "",
        currency: "UGX",
        minQty: "",
        maxQty: "",
      },
    ]);
  };

  const updatePriceRow = (id: string, patch: Partial<PriceRow>) => {
    setPrices((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const removePriceRow = (id: string) => {
    setPrices((prev) => prev.filter((row) => row.id !== id));
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Vendor info */}
        {variantData?.organization && (
          <div className="mx-4 rounded-lg border bg-muted/50 p-3">
            <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Vendor
            </div>
            <div className="mt-1 font-medium">
              {variantData.organization.name}
            </div>
          </div>
        )}

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Prices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-sm">Prices</Label>
                  <Button
                    onClick={addPriceRow}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add price
                  </Button>
                </div>
                {prices.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No prices set.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {prices.map((p) => (
                      <div
                        className="grid grid-cols-2 items-end gap-2 sm:grid-cols-5"
                        key={p.id}
                      >
                        <div>
                          <Label className="text-xs">Amount</Label>
                          <Input
                            disabled={isSubmitting}
                            inputMode="decimal"
                            onChange={(e) =>
                              updatePriceRow(p.id, { amount: e.target.value })
                            }
                            placeholder="0"
                            type="number"
                            value={p.amount}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sale</Label>
                          <Input
                            disabled={isSubmitting}
                            inputMode="decimal"
                            onChange={(e) =>
                              updatePriceRow(p.id, {
                                saleAmount: e.target.value,
                              })
                            }
                            placeholder="Optional"
                            type="number"
                            value={p.saleAmount}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Min qty</Label>
                          <Input
                            disabled={isSubmitting}
                            inputMode="numeric"
                            min={0}
                            onChange={(e) =>
                              updatePriceRow(p.id, { minQty: e.target.value })
                            }
                            placeholder="0"
                            type="number"
                            value={p.minQty}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max qty</Label>
                          <Input
                            disabled={isSubmitting}
                            inputMode="numeric"
                            min={0}
                            onChange={(e) =>
                              updatePriceRow(p.id, { maxQty: e.target.value })
                            }
                            placeholder="0"
                            type="number"
                            value={p.maxQty}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => removePriceRow(p.id)}
                            size="sm"
                            type="button"
                            variant="ghost"
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
                  disabled={isSubmitting}
                  id="variant-unit"
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g., 1kg, 500g, pack"
                  required
                  value={unit}
                />
              </div>

              {/* Stock Quantity */}
              <div className="space-y-2">
                <Label htmlFor="variant-stock">Stock quantity</Label>
                <Input
                  disabled={isSubmitting}
                  id="variant-stock"
                  inputMode="numeric"
                  min={0}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  type="number"
                  value={stockQuantity}
                />
              </div>

              {/* Barcode */}
              <div className="space-y-2">
                <Label htmlFor="variant-barcode">Barcode (optional)</Label>
                <Input
                  disabled={isSubmitting}
                  id="variant-barcode"
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Barcode"
                  value={barcode}
                />
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <Label htmlFor="variant-weight">Weight (grams, optional)</Label>
                <Input
                  disabled={isSubmitting}
                  id="variant-weight"
                  inputMode="numeric"
                  min={0}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  placeholder="e.g., 500"
                  type="number"
                  value={weightGrams}
                />
              </div>

              <Separator />

              {/* Availability */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <div>
                  <Label className="font-medium" htmlFor="variant-available">
                    Available
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Customers can purchase this variant
                  </p>
                </div>
                <Switch
                  checked={isAvailable}
                  disabled={isSubmitting}
                  id="variant-available"
                  onCheckedChange={setIsAvailable}
                />
              </div>
            </div>
          </div>

          <SheetFooter>
            <div className="flex w-full items-center justify-between">
              <Button
                aria-label="Delete variant"
                disabled={isSubmitting}
                onClick={handleDelete}
                size="icon"
                type="button"
                variant="destructive"
              >
                <Trash2 className="size-4" />
              </Button>
              <div className="flex gap-2">
                <Button
                  disabled={isSubmitting}
                  onClick={() => handleOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default VariantEditSheet;
