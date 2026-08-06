import { authorizedJsonFromUrl } from '@/shared/api/authorizedClient'
import type {
  CategoryListResult,
  ListProductsParams,
  PatchProductRequest,
  Product,
  ProductListResult,
} from '../types'

const PRODUCTS_API_BASE = '/api/products'

function buildListUrl(params: ListProductsParams = {}) {
  const search = new URLSearchParams()
  if (params.search) search.set('search', params.search)
  if (params.activeOnly != null) search.set('activeOnly', String(params.activeOnly))
  if (params.category) search.set('category', params.category)
  if (params.categoryId) search.set('categoryId', params.categoryId)
  if (params.includeCategoryChildren) search.set('includeCategoryChildren', 'true')
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

export function patchProduct(id: string, body: PatchProductRequest) {
  return authorizedJsonFromUrl<Product>(`${PRODUCTS_API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
