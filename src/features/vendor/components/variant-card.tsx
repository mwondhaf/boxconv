"use client";

import type { Id } from "convex/_generated/dataModel";
import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

// =============================================================================
// Types
// =============================================================================

export interface PriceAmount {
  amount: number;
  saleAmount?: number;
  currency: string;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface VariantCardVariant {
  _id: Id<"productVariants">;
  productId: Id<"products">;
  organizationId: Id<"organizations">;
  sku: string;
  unit: string;
  stockQuantity: number;
  isAvailable: boolean;
  isApproved: boolean;
  product?: {
    _id: Id<"products">;
    name: string;
    slug: string;
    imageUrl?: string;
  } | null;
  price?: number;
  salePrice?: number;
  currency?: string;
  priceAmounts?: Array<PriceAmount>;
}

export interface VariantCardProps {
  variant: VariantCardVariant;
  onSelect?: (variant: VariantCardVariant) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatPrice(amount: number | undefined, currency = "UGX"): string {
  if (amount === undefined) return "—";
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatQuantityRange(
  minQty: number | undefined | null,
  maxQty: number | undefined | null
): string {
  if (minQty == null && maxQty == null) {
    return "Any qty";
  }
  if (minQty != null && maxQty != null) {
    return `${minQty.toLocaleString()}–${maxQty.toLocaleString()}`;
  }
  if (minQty != null) {
    return `≥${minQty.toLocaleString()}`;
  }
  return `≤${(maxQty as number).toLocaleString()}`;
}

// =============================================================================
// Component
// =============================================================================

export function VariantCard({ variant, onSelect }: VariantCardProps) {
  const imageUrl = variant.product?.imageUrl;
  const title = `${variant.product?.name ?? "Variant"} — ${variant.unit}`;

  const renderAllPrices = (): ReactNode => {
    const priceAmounts = variant.priceAmounts ?? [];

    // If we have detailed price amounts, display all of them
    if (priceAmounts.length > 0) {
      // Sort by minQuantity ascending
      const sorted = [...priceAmounts].sort((a, b) => {
        const aMin = a.minQuantity ?? 0;
        const bMin = b.minQuantity ?? 0;
        return aMin - bMin;
      });

      return (
        <div className="mt-1 grid grid-cols-1 gap-1">
          {sorted.map((p, idx) => {
            const key = `${p.currency}-${p.amount}-${p.minQuantity ?? "null"}-${p.maxQuantity ?? "null"}-${idx}`;
            const hasSale =
              p.saleAmount != null &&
              p.saleAmount > 0 &&
              p.saleAmount < p.amount;

            return (
              <div className="text-xs" key={key}>
                {hasSale ? (
                  <>
                    <span className="mr-1 text-muted-foreground line-through">
                      {formatPrice(p.amount, p.currency)}
                    </span>
                    <span className="font-medium text-green-600">
                      {formatPrice(p.saleAmount, p.currency)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    {formatPrice(p.amount, p.currency)}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  · {formatQuantityRange(p.minQuantity, p.maxQuantity)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback to legacy single price/salePrice
    const price = variant.price;
    const salePrice = variant.salePrice;
    const currency = variant.currency || "UGX";

    if (price === undefined || price === 0) {
      return (
        <span className="text-muted-foreground text-xs">No price set</span>
      );
    }

    if (salePrice && salePrice < price) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs line-through">
            {formatPrice(price, currency)}
          </span>
          <span className="font-medium text-green-600 text-xs">
            {formatPrice(salePrice, currency)}
          </span>
        </div>
      );
    }

    return (
      <span className="text-muted-foreground text-xs">
        {formatPrice(price, currency)}
      </span>
    );
  };

  const renderHeaderBadges = () => {
    return (
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {variant.isApproved && (
          <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
            Approved
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden py-0">
      <button
        aria-label={`Select ${title}`}
        className="block w-full cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect?.(variant)}
        type="button"
      >
        {imageUrl ? (
          <div
            aria-label={title}
            className="aspect-4/3 w-full rounded-t-lg bg-center bg-contain bg-muted bg-no-repeat"
            role="img"
            style={{
              backgroundImage: `url(${imageUrl})`,
            }}
            title={title}
          >
            <span className="sr-only">{title}</span>
          </div>
        ) : (
          <div className="aspect-4/3 w-full rounded-t-lg bg-muted" />
        )}
        <div className="px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3
              className="min-w-0 truncate font-medium text-sm"
              title={variant.product?.name ?? "—"}
            >
              {variant.product?.name ?? "—"}
            </h3>
            <span
              className={`shrink-0 text-xs ${
                variant.isAvailable ? "text-green-600" : "text-amber-600"
              }`}
            >
              {variant.isAvailable ? "Available" : "Unavailable"}
            </span>
          </div>
          <div className="text-muted-foreground text-xs">
            {variant.sku} · {variant.unit}
          </div>
          {renderAllPrices()}
          <div className="mt-1 text-muted-foreground text-xs">
            Stock: {variant.stockQuantity}
          </div>
        </div>
      </button>
      {renderHeaderBadges()}
    </Card>
  );
}

export default VariantCard;
