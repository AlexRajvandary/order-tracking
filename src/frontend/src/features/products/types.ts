export type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  sku: string | null
  brand: string | null
  brandId: string | null
  brandSlug: string | null
  condition: string
  shopId: string | null
  shopSlug: string | null
  shopName: string | null
  categoryId: string | null
  categorySlug: string | null
  categoryName: string | null
  price: number
  currencyCode: string
  originalPrice: number | null
  originalCurrencyCode: string | null
  imageUrl: string
  sourceUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export type ProductListResult = {
  items: Product[]
  total: number
  page: number
  pageSize: number
}

export type Category = {
  id: string
  parentId: string | null
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  isPopular: boolean
  isActive: boolean
  children: Category[]
}

export type CategoryListResult = {
  items: Category[]
}

export type Brand = {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  sortOrder: number
  isActive: boolean
}

export type BrandListResult = {
  items: Brand[]
}

export type Shop = {
  id: string
  name: string
  slug: string
  websiteUrl: string | null
  description: string | null
  sortOrder: number
  isActive: boolean
}

export type ShopListResult = {
  items: Shop[]
}

export type ProductConditionFilter = 'new' | 'used'

export type ListProductsParams = {
  search?: string | null
  activeOnly?: boolean | null
  category?: string | null
  categoryId?: string | null
  includeCategoryChildren?: boolean
  brand?: string | null
  shop?: string | null
  condition?: string | null
  priceMin?: number | null
  priceMax?: number | null
  page?: number
  pageSize?: number
}

export type PatchProductRequest = {
  name?: string
  price?: number
  originalPrice?: number | null
  clearOriginalPrice?: boolean
  isActive?: boolean
}

export type SetProductsVisibilityRequest = {
  isActive: boolean
  productIds?: string[]
  search?: string | null
  activeOnly?: boolean | null
  brand?: string | null
  shop?: string | null
  condition?: string | null
  categoryId?: string
  category?: string
  includeCategoryChildren?: boolean
  priceMin?: number | null
  priceMax?: number | null
  matchFilters?: boolean
}

export type SetProductsVisibilityResult = {
  updatedCount: number
}

export type ImportProductItem = {
  name?: string | null
  price?: number | null
  imageUrl?: string | null
  slug?: string | null
  description?: string | null
  sku?: string | null
  brand?: string | null
  brandId?: string | null
  brandSlug?: string | null
  currencyCode?: string | null
  originalPrice?: number | null
  originalCurrencyCode?: string | null
  sourceUrl?: string | null
  condition?: string | null
  shopId?: string | null
  shopName?: string | null
  shopSlug?: string | null
  categoryId?: string | null
  categories?: string[] | null
  category?: string | null
  categoryName?: string | null
  categorySlug?: string | null
  parentCategoryId?: string | null
  parentCategory?: string | null
  parentCategoryName?: string | null
  parentCategorySlug?: string | null
  isActive?: boolean
  [key: string]: unknown
}

export type ImportProductsRequest = {
  products: ImportProductItem[]
  createMissingCategories?: boolean
}

export type ImportProductIssue = {
  index: number
  name: string | null
  status: 'failed' | 'skipped'
  message: string
}

export type ImportProductsResult = {
  total: number
  insertedCount: number
  skippedCount: number
  failedCount: number
  categoriesCreatedCount: number
  brandsCreatedCount: number
  shopsCreatedCount: number
  issues: ImportProductIssue[]
}

export type NotifyProductImportRequest = {
  importId: string
  insertedCount: number
}
