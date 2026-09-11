export type ApiBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ApiBrandListResult = {
  items: ApiBrand[];
};

export type ApiCatalogFacets = {
  brands: ApiBrand[];
  shops: import("@/lib/shops-api").ApiShop[];
};

function productsApiBaseUrl(): string {
  return (
    process.env.PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    "https://api.the-get.ru"
  );
}

export async function fetchBrands(): Promise<ApiBrand[]> {
  const url = `${productsApiBaseUrl()}/api/products/brands?activeOnly=true`;
  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Brands API ${res.status}: ${url}`);
  }

  const data = (await res.json()) as ApiBrandListResult;
  return data.items ?? [];
}

export async function fetchCatalogFacets(
  categoryId?: string,
  categorySlug?: string,
  includeCategoryChildren = true,
): Promise<ApiCatalogFacets> {
  const params = new URLSearchParams({
    activeOnly: "true",
    includeCategoryChildren: String(includeCategoryChildren),
  });
  if (categorySlug) params.set("category", categorySlug);
  if (categoryId) params.set("categoryId", categoryId);

  const url = `${productsApiBaseUrl()}/api/products/facets?${params}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Product facets API ${res.status}: ${url}`);

  const data = (await res.json()) as ApiCatalogFacets;
  return { brands: data.brands ?? [], shops: data.shops ?? [] };
}

export function parseBrandSlugs(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : raw.split(",");
  return values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}
