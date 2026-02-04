// =============================================================================
// Vendor Feature Module Exports
// =============================================================================

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

// Layout
export { VendorLayout } from "./components/layout";

// Operating Hours
export {
  type BusinessHours,
  type DayHours,
  DEFAULT_BUSINESS_HOURS,
  formatBusinessHours,
  isStoreOpen,
  OperatingHoursForm,
  type OperatingHoursFormProps,
  parseBusinessHours,
} from "./components/operating-hours-form";
// Order Detail Sheet
export {
  OrderDetailSheet,
  type OrderDetailSheetProps,
} from "./components/order-detail-sheet";
// Orders Table
export {
  type FulfillmentType,
  type Order,
  type OrderStatus,
  OrdersTable,
  type PaymentStatus,
} from "./components/orders-table";
// Product Card
export {
  ProductCard,
  type ProductCardProduct,
  type ProductCardProps,
} from "./components/product-card";
// Product Form
export {
  type ProductData,
  ProductFormSheet,
  type ProductFormSheetProps,
} from "./components/product-form-sheet";
// Product Image Upload
export {
  type ProductImage,
  ProductImageUpload,
  type ProductImageUploadProps,
  SingleImageUpload,
  type SingleImageUploadProps,
} from "./components/product-image-upload";
// Products Browser
export { ProductsBrowser } from "./components/products-browser";
// Products Table
export {
  type Product,
  ProductsTable,
} from "./components/products-table";
// Variant Card
export {
  VariantCard,
  type VariantCardProps,
  type VariantCardVariant,
} from "./components/variant-card";
// Variant Create Sheet
export {
  VariantCreateSheet,
  type VariantCreateSheetProps,
} from "./components/variant-create-sheet";
// Variant Edit Sheet
export {
  VariantEditSheet,
  type VariantEditSheetProps,
} from "./components/variant-edit-sheet";
// Variants Browser
export { VariantsBrowser } from "./components/variants-browser";

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

// Order Hooks
export {
  canCancelOrder,
  FULFILLMENT_TYPE_ICONS,
  FULFILLMENT_TYPE_LABELS,
  formatCurrency,
  formatRelativeTime,
  getNextOrderStatuses,
  isOrderActive,
  ORDER_STATUS_COLORS,
  // Utilities
  ORDER_STATUS_LABELS,
  useActiveOrders,
  useAssignRider,
  useAssignRiderAndDispatch,
  useCancelOrder,
  // Order mutations
  useConfirmOrder,
  useCustomerOrders,
  useMarkDelivered,
  useMarkReady,
  // Rider queries
  useOnlineRiders,
  useOrder,
  useOrderByDisplayId,
  useOrderTracking,
  // Order queries
  useOrganizationOrders,
  usePendingOrdersCount,
  useStartPreparing,
  useTodaysSummary,
  useUpdateOrderStatus,
} from "./hooks/use-orders";
// Product Hooks
export {
  useActiveCategories,
  // Product image mutations
  useAddProductImage,
  useAdjustStock,
  // Brand queries
  useBrand,
  useBrands,
  useBrandsWithProductCounts,
  useCategories,
  useCategoriesByParent,
  // Category queries
  useCategory,
  useCategoryTree,
  // Brand mutations
  useCreateBrand,
  // Category mutations
  useCreateCategory,
  // Product mutations
  useCreateProduct,
  // Product variant mutations
  useCreateProductVariant,
  useDeleteAllProductImages,
  useDeleteBrand,
  useDeleteCategory,
  useDeleteProduct,
  useDeleteProductImage,
  useDeleteProductVariant,
  useOrganizationVariants,
  usePrimaryProductImage,
  // Product queries
  useProduct,
  useProductBySlug,
  // Product image queries
  useProductImages,
  useProducts,
  useProductsByCategory,
  // Product variant queries
  useProductVariant,
  useProductVariants,
  useRootCategories,
  useSetPrimaryImage,
  useSetVariantApproval,
  useToggleCategoryActive,
  useToggleProductActive,
  useToggleVariantAvailable,
  useUpdateBrand,
  useUpdateCategory,
  useUpdateProduct,
  useUpdateProductImage,
  useUpdateProductVariant,
  useUpdateStock,
  useUpdateVariantPricing,
  useVariantBySku,
} from "./hooks/use-products";

// -----------------------------------------------------------------------------
// Pages
// -----------------------------------------------------------------------------

export { VendorCustomersPage } from "./pages/customers";
export { VendorDashboardPage } from "./pages/dashboard";
export { VendorOrdersPage } from "./pages/orders";
export { VendorProductsPage } from "./pages/products";
export { VendorVariantsPage } from "./pages/variants";
