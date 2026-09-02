import { authorizedJson, authorizedJsonFromUrl } from '@/shared/api/authorizedClient'
import type {
  BrandListResult,
  BulkUpdateProductsRequest,
  BulkUpdateProductsResult,
  Category,
  CategoryListResult,
  ClearCrawlerLogsResult,
  CrawlerJob,
  CrawlerJobListResult,
  CreateCategoryRequest,
  CreateCrawlerJobRequest,
  DeleteCategoryResult,
  ImportProductsRequest,
  ImportProductsResult,
  ListProductsParams,
  NotifyProductImportRequest,
  PatchProductRequest,
  UpdateProductRequest,
  Product,
  ProductListResult,
  RenameCategoryRequest,
  SetProductsVisibilityRequest,
  SetProductsVisibilityResult,
  ShopListResult,
  StorefrontAnnouncement,
  CreateTranslationJobRequest,
  TranslationJob,
} from '../types'

const PRODUCTS_API_BASE = '/api/products'

const USE_ADMIN_PRODUCTS_MOCK = import.meta.env.DEV && import.meta.env.VITE_MOCK_ADMIN_PRODUCTS !== 'false'

const MOCK_PRODUCTS: Product[] = Array.from({ length: 50 }, (_, index) => {
  const number = index + 1
  const timestamp = new Date(Date.UTC(2026, 0, 1 + index)).toISOString()
  return {
    id: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    name: `Тестовый товар ${number}`,
    nameRu: `Тестовый товар ${number}`,
    slug: `test-product-${number}`,
    description: `Описание тестового товара ${number}`,
    sku: `MOCK-${String(number).padStart(4, '0')}`,
    brand: `Бренд ${number % 5 + 1}`,
    brandId: null,
    brandSlug: null,
    condition: number % 7 === 0 ? 'used' : 'new',
    shopId: null,
    shopSlug: null,
    shopName: number % 2 === 0 ? 'Maketto.jp' : 'ZOZO.jp',
    categoryId: null,
    categorySlug: null,
    categoryName: number % 2 === 0 ? 'Одежда' : 'Аксессуары',
    price: 1000 + number * 250,
    currencyCode: 'RUB',
    originalPrice: 1200 + number * 300,
    originalCurrencyCode: 'JPY',
    imageUrl: '/assets/womens-dresses-wide.png',
    sourceUrl: `https://example.com/mock-product-${number}`,
    isActive: number % 9 !== 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
})

function buildListUrl(params: ListProductsParams = {}) {
  const search = new URLSearchParams()
  if (params.search) search.set('search', params.search)
  if (params.activeOnly != null) search.set('activeOnly', String(params.activeOnly))
  if (params.category) search.set('category', params.category)
  if (params.categoryId) search.set('categoryId', params.categoryId)
  if (params.includeCategoryChildren) search.set('includeCategoryChildren', 'true')
  if (params.brand) search.set('brand', params.brand)
  if (params.shop) search.set('shop', params.shop)
  if (params.condition) search.set('condition', params.condition)
  if (params.priceMin != null) search.set('priceMin', String(params.priceMin))
  if (params.priceMax != null) search.set('priceMax', String(params.priceMax))
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 20))
  const qs = search.toString()
  return qs ? `${PRODUCTS_API_BASE}?${qs}` : PRODUCTS_API_BASE
}

export function listProducts(params?: ListProductsParams, signal?: AbortSignal) {
  if (USE_ADMIN_PRODUCTS_MOCK) {
    const search = params?.search?.toLocaleLowerCase() ?? ''
    let items = MOCK_PRODUCTS.filter((product) => {
      if (search && !`${product.name} ${product.nameRu} ${product.sku}`.toLocaleLowerCase().includes(search)) return false
      if (params?.activeOnly != null && product.isActive !== params.activeOnly) return false
      if (params?.brand && !params.brand.split(',').includes(product.brand ?? '')) return false
      if (params?.shop && !params.shop.split(',').includes(product.shopName ?? '')) return false
      if (params?.condition && !params.condition.split(',').includes(product.condition)) return false
      if (params?.priceMin != null && product.price < params.priceMin) return false
      if (params?.priceMax != null && product.price > params.priceMax) return false
      return true
    })
    const total = items.length
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 20
    const start = (page - 1) * pageSize
    items = items.slice(start, start + pageSize)
    return Promise.resolve({ items, total, page, pageSize })
  }
  return authorizedJsonFromUrl<ProductListResult>(buildListUrl(params), { signal })
}

export function getProduct(id: string, signal?: AbortSignal) {
  return authorizedJsonFromUrl<Product>(`${PRODUCTS_API_BASE}/${id}`, { signal })
}

export function listCategories(productsActiveOnly?: boolean | null, signal?: AbortSignal) {
  const search = new URLSearchParams({
    activeOnly: 'true',
    includeProductCounts: 'true',
  })
  if (productsActiveOnly != null) {
    search.set('productsActiveOnly', String(productsActiveOnly))
  }
  return authorizedJsonFromUrl<CategoryListResult>(
    `${PRODUCTS_API_BASE}/categories?${search}`,
    { signal },
  )
}

export function createCategory(body: CreateCategoryRequest) {
  return authorizedJsonFromUrl<Category>(`${PRODUCTS_API_BASE}/categories`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function renameCategory(id: string, body: RenameCategoryRequest) {
  return authorizedJsonFromUrl<Category>(`${PRODUCTS_API_BASE}/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteCategory(id: string) {
  return authorizedJsonFromUrl<DeleteCategoryResult>(
    `${PRODUCTS_API_BASE}/categories/${id}`,
    { method: 'DELETE' },
  )
}

export function listBrands(signal?: AbortSignal) {
  return authorizedJsonFromUrl<BrandListResult>(
    `${PRODUCTS_API_BASE}/brands?activeOnly=true`,
    { signal },
  )
}

export function listShops(signal?: AbortSignal) {
  return authorizedJsonFromUrl<ShopListResult>(
    `${PRODUCTS_API_BASE}/shops?activeOnly=true`,
    { signal },
  )
}

export function patchProduct(id: string, body: PatchProductRequest) {
  return authorizedJsonFromUrl<Product>(`${PRODUCTS_API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function updateProduct(id: string, body: UpdateProductRequest) {
  return authorizedJsonFromUrl<Product>(`${PRODUCTS_API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function getStorefrontAnnouncement(signal?: AbortSignal) {
  return authorizedJsonFromUrl<StorefrontAnnouncement>(
    `${PRODUCTS_API_BASE}/storefront-announcement`,
    { signal },
  )
}

export function updateStorefrontAnnouncement(text: string) {
  return authorizedJsonFromUrl<StorefrontAnnouncement>(
    `${PRODUCTS_API_BASE}/storefront-announcement`,
    {
      method: 'PUT',
      body: JSON.stringify({ text }),
    },
  )
}

export function importProducts(body: ImportProductsRequest) {
  return authorizedJsonFromUrl<ImportProductsResult>(`${PRODUCTS_API_BASE}/import`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function listCrawlerJobs(signal?: AbortSignal) {
  return authorizedJsonFromUrl<CrawlerJobListResult>(
    `${PRODUCTS_API_BASE}/crawler-jobs?limit=50`,
    { signal },
  )
}

export function getCrawlerJob(id: string, signal?: AbortSignal) {
  return authorizedJsonFromUrl<CrawlerJob>(`${PRODUCTS_API_BASE}/crawler-jobs/${id}`, {
    signal,
  })
}

export function clearCrawlerLogs() {
  return authorizedJsonFromUrl<ClearCrawlerLogsResult>(
    `${PRODUCTS_API_BASE}/crawler-jobs/logs`,
    { method: 'DELETE' },
  )
}

export function createCrawlerJob(body: CreateCrawlerJobRequest) {
  return authorizedJsonFromUrl<CrawlerJob>(`${PRODUCTS_API_BASE}/crawler-jobs`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function cancelCrawlerJob(id: string) {
  return authorizedJsonFromUrl<CrawlerJob>(`${PRODUCTS_API_BASE}/crawler-jobs/${id}/cancel`, {
    method: 'POST',
  })
}

export function notifyProductImport(body: NotifyProductImportRequest) {
  return authorizedJson<void>('/products/import-notification', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const TRANSLATION_JOBS_API_BASE = '/api/admin/translation-jobs'

export function listTranslationJobs(signal?: AbortSignal) {
  return authorizedJsonFromUrl<TranslationJob[]>(TRANSLATION_JOBS_API_BASE, { signal })
}

export function createTranslationJob(body: CreateTranslationJobRequest) {
  return authorizedJsonFromUrl<TranslationJob>(TRANSLATION_JOBS_API_BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function pauseTranslationJob(id: string) {
  return authorizedJsonFromUrl<TranslationJob>(`${TRANSLATION_JOBS_API_BASE}/${id}/pause`, {
    method: 'POST',
  })
}

export function resumeTranslationJob(id: string) {
  return authorizedJsonFromUrl<TranslationJob>(`${TRANSLATION_JOBS_API_BASE}/${id}/resume`, {
    method: 'POST',
  })
}

export function cancelTranslationJob(id: string) {
  return authorizedJsonFromUrl<TranslationJob>(`${TRANSLATION_JOBS_API_BASE}/${id}/cancel`, {
    method: 'POST',
  })
}

export function setProductsVisibility(body: SetProductsVisibilityRequest) {
  return authorizedJsonFromUrl<SetProductsVisibilityResult>(
    `${PRODUCTS_API_BASE}/bulk-visibility`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export function bulkUpdateProducts(body: BulkUpdateProductsRequest) {
  return authorizedJsonFromUrl<BulkUpdateProductsResult>(`${PRODUCTS_API_BASE}/bulk`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
