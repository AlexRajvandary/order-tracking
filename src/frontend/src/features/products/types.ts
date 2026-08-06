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

export type ListProductsParams = {
  search?: string | null
  activeOnly?: boolean | null
  category?: string | null
  categoryId?: string | null
  includeCategoryChildren?: boolean
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
  categoryId?: string
  category?: string
  includeCategoryChildren?: boolean
}

export type SetProductsVisibilityResult = {
  updatedCount: number
}
