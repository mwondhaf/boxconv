// =============================================================================
// Vendor Feature Module Exports
// =============================================================================

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

// Layout
export { VendorLayout } from './components/layout'

// Operating Hours
export {
  OperatingHoursForm,
  parseBusinessHours,
  isStoreOpen,
  formatBusinessHours,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
  type DayHours,
  type OperatingHoursFormProps,
} from './components/operating-hours-form'

// Product Image Upload
export {
  ProductImageUpload,
  SingleImageUpload,
  type ProductImage,
  type ProductImageUploadProps,
  type SingleImageUploadProps,
} from './components/product-image-upload'

// Product Form
export {
  ProductFormSheet,
  type ProductData,
  type ProductFormSheetProps,
} from './components/product-form-sheet'

// Products Table
export {
  ProductsTable,
  type Product,
} from './components/products-table'

// Products Browser
export { ProductsBrowser } from './components/products-browser'

// Product Card
export {
  ProductCard,
  type ProductCardProduct,
  type ProductCardProps,
} from './components/product-card'

// Variant Card
export {
  VariantCard,
  type VariantCardVariant,
  type VariantCardProps,
} from './components/variant-card'

// Variant Edit Sheet
export {
  VariantEditSheet,
  type VariantEditSheetProps,
} from './components/variant-edit-sheet'

// Variant Create Sheet
export {
  VariantCreateSheet,
  type VariantCreateSheetProps,
} from './components/variant-create-sheet'

// Variants Browser
export { VariantsBrowser } from './components/variants-browser'

// Orders Table
export {
  OrdersTable,
  type Order,
  type OrderStatus,
  type FulfillmentType,
  type PaymentStatus,
} from './components/orders-table'

// Order Detail Sheet
export {
  OrderDetailSheet,
  type OrderDetailSheetProps,
} from './components/order-detail-sheet'

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

// Product Hooks
export {
  // Product queries
  useProduct,
  useProductBySlug,
  useProducts,
  useProductsByCategory,
  // Product mutations
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductActive,
  // Product image queries
  useProductImages,
  usePrimaryProductImage,
  // Product image mutations
  useAddProductImage,
  useUpdateProductImage,
  useSetPrimaryImage,
  useDeleteProductImage,
  useDeleteAllProductImages,
  // Category queries
  useCategory,
  useCategories,
  useRootCategories,
  useCategoriesByParent,
  useCategoryTree,
  useActiveCategories,
  // Category mutations
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useToggleCategoryActive,
  // Brand queries
  useBrand,
  useBrands,
  useBrandsWithProductCounts,
  // Brand mutations
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  // Product variant queries
  useProductVariant,
  useProductVariants,
  useOrganizationVariants,
  useVariantBySku,
  // Product variant mutations
  useCreateProductVariant,
  useUpdateProductVariant,
  useUpdateVariantPricing,
  useUpdateStock,
  useAdjustStock,
  useToggleVariantAvailable,
  useSetVariantApproval,
  useDeleteProductVariant,
} from './hooks/use-products'

// Order Hooks
export {
  // Order queries
  useOrganizationOrders,
  usePendingOrdersCount,
  useTodaysSummary,
  useOrder,
  useOrderByDisplayId,
  useOrderTracking,
  useCustomerOrders,
  useActiveOrders,
  // Order mutations
  useConfirmOrder,
  useStartPreparing,
  useMarkReady,
  useMarkDelivered,
  useCancelOrder,
  useUpdateOrderStatus,
  useAssignRiderAndDispatch,
  // Rider queries
  useOnlineRiders,
  useAssignRider,
  // Utilities
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  FULFILLMENT_TYPE_LABELS,
  FULFILLMENT_TYPE_ICONS,
  getNextOrderStatuses,
  canCancelOrder,
  isOrderActive,
  formatCurrency,
  formatRelativeTime,
} from './hooks/use-orders'

// -----------------------------------------------------------------------------
// Pages
// -----------------------------------------------------------------------------

export { VendorDashboardPage } from './pages/dashboard'
export { VendorProductsPage } from './pages/products'
export { VendorVariantsPage } from './pages/variants'
export { VendorOrdersPage } from './pages/orders'
export { VendorCustomersPage } from './pages/customers'
