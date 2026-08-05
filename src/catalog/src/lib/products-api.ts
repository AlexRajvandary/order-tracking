import type { CatalogProduct } from "@/lib/catalog-products";

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  brand: string | null;
  price: number;
  currencyCode: string;
  originalPrice: number | null;
  originalCurrencyCode: string | null;
  imageUrl: string;
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
  sectionId = "bags",
  categorySlug = "женские-сумки",
): CatalogProduct {
  const discount = discountPercent(Number(p.price), p.originalPrice);
  const description = p.description?.trim() || p.name;
  const shortDescription = description.split("\n")[0] ?? p.name;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: "Сумки",
    sectionId,
    categorySlug,
    priceRub: Number(p.price),
    currency: "RUB",
    shortDescription,
    description,
    tags: ["сумки", ...(discount ? [discount] : [])],
    tint: "#0f3d4c",
    inStock: p.isActive,
    imageUrl: p.imageUrl,
    brand: p.brand ?? undefined,
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

  const url = `${productsApiBaseUrl()}/api/products?${params}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Products API ${res.status}: ${url}`);
  }

  return (await res.json()) as ApiProductListResult;
}

export async function fetchProductBySlug(
  slug: string,
): Promise<ApiProduct | null> {
  const url = `${productsApiBaseUrl()}/api/products/by-slug/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Products API ${res.status}: ${url}`);
  }

  return (await res.json()) as ApiProduct;
}

export async function fetchBagsCatalogPage(options?: {
  page?: number;
  pageSize?: number;
  brandSlugs?: string[];
}): Promise<{
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const result = await fetchProductsPage({
    page: options?.page,
    pageSize,
    brandSlugs: options?.brandSlugs,
    // Until Category exists on the API, bags are the only seeded products.
    // Prefer listing all active items over a brittle name search.
    activeOnly: true,
  });

  return {
    products: result.items.map((p) => mapApiProductToCatalog(p)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

export { DEFAULT_PAGE_SIZE as PRODUCTS_PAGE_SIZE };
