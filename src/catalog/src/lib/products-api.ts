import type { CatalogProduct } from "@/lib/catalog-products";

export type ApiProduct = {
  id: string;
  name: string;
  nameRu: string | null;
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
  localImageUrl: string | null;
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

export type ApiExternalProduct = {
  id: string; source: "Rakuten"; externalId: string; name: string;
  description: string | null; price: number; currencyCode: string;
  imageUrl: string | null; sourceUrl: string | null; affiliateUrl: string | null;
  shopName: string | null; available: boolean; rating: number | null; reviewCount: number | null;
};

type ApiExternalProductListResult = {
  items: ApiExternalProduct[]; total: number; page: number; pageSize: number; totalPages: number;
};

export type ApiProductVariant = {
  id: string;
  productId: string;
  size: string | null;
  price: number | null;
  currencyCode: string | null;
  isAvailable: boolean | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ApiProductImage = {
  id: string;
  productId: string;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

const DEFAULT_PAGE_SIZE = 10;
export const PRODUCTS_PAGE_SIZE = 50;
const JPY_PER_RUB = 1.6;

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

function convertPriceToRub(
  price: number | null | undefined,
  currencyCode: string | null | undefined,
): number | undefined {
  if (price == null) return undefined;

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return undefined;

  return currencyCode?.trim().toUpperCase() === "JPY"
    ? Math.round(numericPrice / JPY_PER_RUB)
    : numericPrice;
}

export function mapApiProductToCatalog(
  p: ApiProduct,
  sectionId = p.categorySlug ?? "catalog",
  categorySlug = p.categorySlug ?? sectionId,
  categoryName = p.categoryName ?? "Товары",
): CatalogProduct {
  const priceRub = convertPriceToRub(p.price, p.currencyCode) ?? 0;
  const oldPriceRub = convertPriceToRub(
    p.originalPrice,
    p.originalCurrencyCode ?? p.currencyCode,
  );
  const discount = discountPercent(priceRub, oldPriceRub);
  const description = p.description?.trim() || p.name;
  const shortDescription = description.split("\n")[0] ?? p.name;

  return {
    source: "Internal",
    originalUnitPrice: p.price,
    originalCurrencyCode: p.currencyCode,
    id: p.id,
    slug: p.slug,
    name: p.nameRu?.trim() || p.name,
    category: categoryName,
    sectionId,
    categorySlug: p.categorySlug ?? categorySlug,
    priceRub,
    currency: "RUB",
    shortDescription,
    description,
    tags: [categoryName.toLowerCase(), ...(discount ? [discount] : [])],
    tint: "#0f3d4c",
    inStock: p.isActive,
    imageUrl: p.localImageUrl || p.imageUrl,
    brand: p.brand ?? undefined,
    brandId: p.brandId ?? undefined,
    brandSlug: p.brandSlug ?? undefined,
    condition: p.condition === "used" ? "used" : "new",
    shopSlug: p.shopSlug ?? undefined,
    shopName: p.shopName ?? undefined,
    sourceUrl: p.sourceUrl ?? undefined,
    oldPriceRub,
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
  sort?: "mixed";
  shuffleSeed?: number;
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
  if (options?.sort) params.set("sort", options.sort);
  if (options?.shuffleSeed != null) {
    params.set("shuffleSeed", String(options.shuffleSeed));
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
  /** Stable seed used to mix products across a root category and its children. */
  shuffleSeed?: number;
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
    sort: options.shuffleSeed != null && includeCategoryChildren ? "mixed" : undefined,
    shuffleSeed: includeCategoryChildren ? options.shuffleSeed : undefined,
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

export function mapRakutenProductToCatalog(product: ApiExternalProduct): CatalogProduct {
  const description = product.description?.trim() || product.name;
  return {
    id: product.id, slug: product.id, source: "Rakuten", externalId: product.externalId,
    originalUnitPrice: product.price, originalCurrencyCode: product.currencyCode,
    affiliateUrl: product.affiliateUrl ?? undefined, name: product.name,
    category: "Коллекционные карточные игры", sectionId: "tcg", categorySlug: "tcg",
    priceRub: convertPriceToRub(product.price, product.currencyCode) ?? 0, currency: "RUB",
    shortDescription: description.split("\n")[0] ?? product.name, description,
    tags: ["rakuten", "кки"], tint: "#bf0000", inStock: product.available,
    imageUrl: product.imageUrl ?? undefined, shopName: product.shopName ?? undefined,
    sourceUrl: product.sourceUrl ?? undefined, rating: product.rating ?? undefined,
    reviewsCount: product.reviewCount ?? undefined,
  };
}

export async function fetchRakutenCategoryPage(options: { genreId: number; page?: number; pageSize?: number }): Promise<ApiExternalProductListResult> {
  const params = new URLSearchParams({ genreId: String(options.genreId), page: String(options.page ?? 1), pageSize: String(Math.min(options.pageSize ?? 20, 30)) });
  const response = await fetch(`${productsApiBaseUrl()}/api/products/external/rakuten/search?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Rakuten catalog API ${response.status}`);
  return (await response.json()) as ApiExternalProductListResult;
}

export async function fetchRakutenSearch(keyword: string, pageSize = 10): Promise<ApiExternalProductListResult> {
  const params = new URLSearchParams({ keyword, page: "1", pageSize: String(Math.min(pageSize, 30)) });
  const response = await fetch(`${productsApiBaseUrl()}/api/products/external/rakuten/search?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Rakuten search API ${response.status}`);
  return (await response.json()) as ApiExternalProductListResult;
}

export async function fetchRakutenItem(itemCode: string): Promise<ApiExternalProduct | null> {
  const params = new URLSearchParams({ itemCode });
  const response = await fetch(`${productsApiBaseUrl()}/api/products/external/rakuten/item?${params}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Rakuten item API ${response.status}`);
  return (await response.json()) as ApiExternalProduct;
}

export async function fetchProductRelations(productId: string): Promise<{
  variants: ApiProductVariant[];
  images: ApiProductImage[];
}> {
  const base = `${productsApiBaseUrl()}/api/products/${encodeURIComponent(productId)}`;
  const [variantsResponse, imagesResponse] = await Promise.all([
    fetch(`${base}/variants`, { cache: "no-store" }),
    fetch(`${base}/images`, { cache: "no-store" }),
  ]);

  return {
    variants: variantsResponse.ok ? await variantsResponse.json() : [],
    images: imagesResponse.ok ? await imagesResponse.json() : [],
  };
}

export async function fetchAllCatalogPage(options?: {
  page?: number;
  pageSize?: number;
  brandSlugs?: string[];
  shopSlugs?: string[];
  shuffleSeed?: number;
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
    sort: "mixed",
    shuffleSeed: options?.shuffleSeed,
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
