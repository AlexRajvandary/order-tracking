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
  productCount: number
  children: Category[]
}

export type CategoryListResult = {
  items: Category[]
  totalProductCount: number
}

export type CreateCategoryRequest = { name: string; parentId?: string | null }
export type RenameCategoryRequest = { name: string }
export type DeleteCategoryResult = {
  deletedCategoriesCount: number
  unassignedProductsCount: number
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

export type StorefrontAnnouncement = {
  text: string
  updatedAt: string
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
  categoryId?: string
  clearCategory?: boolean
  shopId?: string
  clearShop?: boolean
}

export type UpdateProductRequest = {
  name: string
  slug?: string | null
  description?: string | null
  sku?: string | null
  brand?: string | null
  brandId?: string | null
  price: number
  currencyCode?: string | null
  originalPrice?: number | null
  originalCurrencyCode?: string | null
  imageUrl: string
  sourceUrl?: string | null
  isActive: boolean
  condition?: string | null
  shopId?: string | null
  categoryId?: string | null
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

export type BulkUpdateProductsRequest = {
  productIds?: string[]
  matchFilters?: boolean
  search?: string | null
  activeOnly?: boolean | null
  brand?: string | null
  shop?: string | null
  condition?: string | null
  category?: string | null
  includeCategoryChildren?: boolean
  priceMin?: number | null
  priceMax?: number | null
  updateCategory?: boolean
  newCategoryId?: string | null
  updateShop?: boolean
  newShopId?: string | null
}

export type BulkUpdateProductsResult = { updatedCount: number }

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

export type CrawlerJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type CrawlerParser = 'maketto' | 'zozo'

export type CrawlerJobLog = {
  id: string
  createdAt: string
  level: 'info' | 'warning' | 'error' | string
  message: string
}

export type CrawlerJob = {
  id: string
  parser: CrawlerParser
  url: string
  requestedPages: number
  categoryId: string
  categoryName: string
  categoryPath: string
  status: CrawlerJobStatus
  processedPages: number
  lastPage: number
  progressPercent: number
  productsFound: number
  importedCount: number
  skippedCount: number
  failedCount: number
  attemptCount: number
  createdBy: string | null
  lastError: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  heartbeatAt: string | null
  logs: CrawlerJobLog[]
}

export type CrawlerJobListResult = { items: CrawlerJob[] }
export type ClearCrawlerLogsResult = { deletedCount: number }
export type CreateCrawlerJobRequest = {
  parser: CrawlerParser
  url: string
  pages: number
  categoryId: string
}

export type NotifyProductImportRequest = {
  importId: string
  insertedCount: number
}
