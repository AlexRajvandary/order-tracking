import { authorizedJsonFromUrl } from '@/shared/api/authorizedClient'
import type {
  BrandListResult,
  CategoryListResult,
  ListProductsParams,
  PatchProductRequest,
  Product,
  ProductListResult,
  SetProductsVisibilityRequest,
  SetProductsVisibilityResult,
  ShopListResult,
} from '../types'

const PRODUCTS_API_BASE = '/api/products'

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
  return authorizedJsonFromUrl<ProductListResult>(buildListUrl(params), { signal })
}

export function listCategories(signal?: AbortSignal) {
  return authorizedJsonFromUrl<CategoryListResult>(
    `${PRODUCTS_API_BASE}/categories?activeOnly=true`,
    { signal },
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

export function setProductsVisibility(body: SetProductsVisibilityRequest) {
  return authorizedJsonFromUrl<SetProductsVisibilityResult>(
    `${PRODUCTS_API_BASE}/bulk-visibility`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}
