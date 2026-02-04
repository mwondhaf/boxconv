// Hooks - Organizations
export {
  useOrganizations,
  useOrganizationByClerkId,
  useOrganizationBySlug,
  useOrganization,
  useActiveOrganizations,
  useOrganizationsByCategory,
  useUpdateOrganizationBusinessData,
  useToggleOrganizationBusy,
  useOrganizationCategories,
  useOrganizationCategoriesFlat,
  useOrganizationCategory,
  useOrganizationCategoryBySlug,
  useCreateOrganizationCategory,
  useUpdateOrganizationCategory,
  useDeleteOrganizationCategory,
} from './hooks/use-organizations'

// Hooks - Catalog (Categories & Brands)
export {
  useCategory,
  useCategoryBySlug,
  useCategories,
  useRootCategories,
  useCategoriesByParent,
  useCategoryTree,
  useActiveCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useToggleCategoryActive,
  useBrand,
  useBrandBySlug,
  useBrands,
  useBrandsWithProductCounts,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  useSetCategoryThumbnail,
  useSetCategoryBanner,
  useRemoveCategoryThumbnail,
  useRemoveCategoryBanner,
} from './hooks/use-catalog'

// Components
export { AdminLayout } from './components/layout'
export { OrganizationsTable } from './components/organizations-table'
export { CreateOrganizationForm } from './components/create-organization-form'
export { AddMemberForm } from './components/add-member-form'
export { OrganizationDetailsDialog } from './components/organization-details-dialog'
export { VendorFormSheet, type VendorBusinessData, type VendorFormSheetProps } from './components/vendor-form-sheet'

// Components - Catalog
export { CategoriesTable, type Category } from './components/categories-table'
export { CategoryFormSheet, type CategoryData, type CategoryFormSheetProps } from './components/category-form-sheet'
export { CategoryImageUpload, type CategoryImageUploadProps } from './components/category-image-upload'
export { BrandsTable, type Brand } from './components/brands-table'
export { BrandFormSheet, type BrandData, type BrandFormSheetProps } from './components/brand-form-sheet'
export { ProductDetailSheet, type ProductDetailData, type ProductDetailSheetProps, type ProductImage } from './components/product-detail-sheet'

// Components - Products & Variants
export { ProductCard, type ProductCardProduct, type ProductCardProps } from './components/product-card'
export { ProductsBrowser } from './components/products-browser'
export { VariantCard, type VariantCardVariant, type VariantCardProps } from './components/variant-card'
export { VariantsBrowser } from './components/variants-browser'
export { VariantEditSheet, type VariantEditSheetProps } from './components/variant-edit-sheet'

// Pages
export { AdminOrganizationsPage } from './pages/organizations'
export { AdminVendorsPage } from './pages/vendors'
export { AdminProductsPage } from './pages/products'
export { AdminVariantsPage } from './pages/variants'
export { AdminCategoriesPage } from './pages/categories'
export { AdminBrandsPage } from './pages/brands'
// export { AdminDashboardPage } from './pages/dashboard'
// export { AdminOrdersPage } from './pages/orders'
// export { AdminRidersPage } from './pages/riders'
// export { AdminCustomersPage } from './pages/customers'
// export { AdminPromotionsPage } from './pages/promotions'
// export { AdminSettingsPage } from './pages/settings'

// API
export {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addOrganizationMember,
  removeOrganizationMember,
  updateMemberRole,
  searchUsers,
  setUserPlatformRole,
} from './api/organizations'

// Types
export type { Organization } from './components/organizations-table'
