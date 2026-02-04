"use client";

import type { Id } from "convex/_generated/dataModel";
import * as React from "react";
import { ProductsBrowser } from "../components/products-browser";
import { VariantCreateSheet } from "../components/variant-create-sheet";

// =============================================================================
// VendorProductsPage Component
// =============================================================================

export function VendorProductsPage() {
  // State for variant creation sheet
  const [createSheet, setCreateSheet] = React.useState<{
    open: boolean;
    productId: Id<"products"> | null;
    productName: string;
  }>({
    open: false,
    productId: null,
    productName: "",
  });

  // Handler for adding a variant
  const handleAddVariant = (productId: Id<"products">, productName: string) => {
    setCreateSheet({
      open: true,
      productId,
      productName,
    });
  };

  // Handler for closing the sheet
  const handleSheetOpenChange = (open: boolean) => {
    setCreateSheet((prev) => ({
      ...prev,
      open,
    }));
  };

  // Handler for successful variant creation
  const handleVariantCreated = () => {
    // Could navigate to variants page or show additional feedback
    // For now, just closing the sheet is handled by the sheet itself
  };

  return (
    <>
      <ProductsBrowser onAddVariant={handleAddVariant} />

      <VariantCreateSheet
        onOpenChange={handleSheetOpenChange}
        onSuccess={handleVariantCreated}
        open={createSheet.open}
        productId={createSheet.productId}
        productName={createSheet.productName}
      />
    </>
  );
}

export default VendorProductsPage;
