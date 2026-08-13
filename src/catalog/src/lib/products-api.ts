import type { CatalogProduct } from "@/lib/catalog-products";

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  brand: string | null;
  brandId: string | null;
  brandSlug: string | null;
  condition: string;
  shopId: string | null;
  shopSlug: string | null;
  shopName: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  price: number;
  currencyCode: string;
  originalPrice: number | null;
  originalCurrencyCode: string | null;
  imageUrl: string;
  /** URL of this product on the source shop website */
  sourceUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type ApiProductListResult = {
  items: ApiProduct[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 10;

function productsApiBaseUrl(): string {
  return (
    process.env.PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    "https://89-127-208-99.sslip.io"
  );
}

function discountPercent(
  price: number,
  originalPrice: number | null | undefined,
): string | undefined {
  if (originalPrice == null || originalPrice <= price) return undefined;
  const pct = Math.round(((originalPrice - price) / originalPrice) * 100);
  return pct > 0 ? `−${pct}%` : undefined;
}

export function mapApiProductToCatalog(
  p: ApiProduct,
  sectionId = p.categorySlug ?? "catalog",
  categorySlug = p.categorySlug ?? sectionId,
  categoryName = p.categoryName ?? "Товары",
): CatalogProduct {
  const discount = discountPercent(Number(p.price), p.originalPrice);
  const description = p.description?.trim() || p.name;
  const shortDescription = description.split("\n")[0] ?? p.name;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: categoryName,
    sectionId,
    categorySlug: p.categorySlug ?? categorySlug,
    priceRub: Number(p.price),
    currency: "RUB",
    shortDescription,
    description,
    tags: [categoryName.toLowerCase(), ...(discount ? [discount] : [])],
    tint: "#0f3d4c",
    inStock: p.isActive,
    imageUrl: p.imageUrl,
    brand: p.brand ?? undefined,
    brandId: p.brandId ?? undefined,
    brandSlug: p.brandSlug ?? undefined,
    condition: p.condition === "used" ? "used" : "new",
    shopSlug: p.shopSlug ?? undefined,
    shopName: p.shopName ?? undefined,
    sourceUrl: p.sourceUrl ?? undefined,
    oldPriceRub: p.originalPrice != null ? Number(p.originalPrice) : undefined,
    discountPercent: discount,
  };
}

export async function fetchProductsPage(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
  /** Comma-separated or list of brand slugs */
  brandSlugs?: string[];
  shopSlugs?: string[];
  conditions?: Array<"new" | "used">;
  categorySlug?: string;
  includeCategoryChildren?: boolean;
}): Promise<ApiProductListResult> {
  const page = options?.page && options.page > 0 ? options.page : 1;
  const pageSize =
    options?.pageSize && options.pageSize > 0
      ? options.pageSize
      : DEFAULT_PAGE_SIZE;

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (options?.search) params.set("search", options.search);
  if (options?.activeOnly != null) {
    params.set("activeOnly", String(options.activeOnly));
  }
  if (options?.brandSlugs && options.brandSlugs.length > 0) {
    params.set("brand", options.brandSlugs.join(","));
  }
  if (options?.shopSlugs && options.shopSlugs.length > 0) {
    params.set("shop", options.shopSlugs.join(","));
  }
  if (options?.conditions && options.conditions.length > 0) {
    params.set("condition", options.conditions.join(","));
  }
  if (options?.categorySlug) {
    params.set("category", options.categorySlug);
  }
  if (options?.includeCategoryChildren) {
    params.set("includeCategoryChildren", "true");
  }

  const url = `${productsApiBaseUrl()}/api/products?${params}`;
  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Products API ${res.status}: ${url}`);
  }

  return (await res.json()) as ApiProductListResult;
}

export async function fetchProductById(
  id: string,
): Promise<ApiProduct | null> {
  const url = `${productsApiBaseUrl()}/api/products/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Products API ${res.status}: ${url}`);
  }

  return (await res.json()) as ApiProduct;
}

export async function fetchProductBySlug(
  slug: string,
): Promise<ApiProduct | null> {
  const url = `${productsApiBaseUrl()}/api/products/by-slug/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Products API ${res.status}: ${url}`);
  }

  return (await res.json()) as ApiProduct;
}

export async function fetchCatalogPage(options: {
  rootCategorySlug: string;
  rootCategoryName: string;
  page?: number;
  pageSize?: number;
  brandSlugs?: string[];
  shopSlugs?: string[];
  conditions?: Array<"new" | "used">;
  /** Child subcategory slug, or omit for the whole root category tree. */
  categorySlug?: string;
  categoryName?: string;
}): Promise<{
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const categorySlug = options.categorySlug || options.rootCategorySlug;
  const categoryName = options.categoryName || options.rootCategoryName;
  const includeCategoryChildren = !options.categorySlug;

  const result = await fetchProductsPage({
    page: options.page,
    pageSize,
    brandSlugs: options.brandSlugs,
    shopSlugs: options.shopSlugs,
    conditions: options.conditions,
    categorySlug,
    includeCategoryChildren,
    activeOnly: true,
  });

  return {
    products: result.items.map((product) =>
      mapApiProductToCatalog(
        product,
        options.rootCategorySlug,
        product.categorySlug ?? categorySlug,
        product.categoryName ?? categoryName,
      ),
    ),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function fetchAllCatalogPage(options?: {
  page?: number;
  pageSize?: number;
  brandSlugs?: string[];
  shopSlugs?: string[];
}): Promise<{
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const result = await fetchProductsPage({
    page: options?.page,
    pageSize: options?.pageSize ?? DEFAULT_PAGE_SIZE,
    brandSlugs: options?.brandSlugs,
    shopSlugs: options?.shopSlugs,
    activeOnly: true,
  });

  return {
    products: result.items.map((product) => mapApiProductToCatalog(product)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

/** Compatibility wrapper for older imports. */
export function fetchBagsCatalogPage(options?: Omit<
  Parameters<typeof fetchCatalogPage>[0],
  "rootCategorySlug" | "rootCategoryName"
>) {
  return fetchCatalogPage({
    ...options,
    rootCategorySlug: "bags",
    rootCategoryName: "Сумки",
  });
}

export { DEFAULT_PAGE_SIZE as PRODUCTS_PAGE_SIZE };
