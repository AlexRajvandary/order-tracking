export type ApiCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isPopular: boolean;
  isActive: boolean;
  productCount: number;
  children: ApiCategory[];
};

export type ApiCategoryListResult = {
  items: ApiCategory[];
  totalProductCount: number;
};

function productsApiBaseUrl(): string {
  return (
    process.env.PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    "https://89-127-208-99.sslip.io"
  );
}

export async function fetchCategoryTree(options?: {
  popularOnly?: boolean;
}): Promise<ApiCategory[]> {
  const params = new URLSearchParams({ activeOnly: "true" });
  if (options?.popularOnly) params.set("popularOnly", "true");

  const url = `${productsApiBaseUrl()}/api/products/categories?${params}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Categories API ${res.status}: ${url}`);
  }

  const data = (await res.json()) as ApiCategoryListResult;
  return data.items ?? [];
}

export function findRootCategory(
  tree: ApiCategory[],
  slug: string,
): ApiCategory | undefined {
  const key = safeDecode(slug);
  return tree.find((c) => c.slug === key);
}

export function findChildCategory(
  root: ApiCategory,
  childSlug: string,
): ApiCategory | undefined {
  const key = safeDecode(childSlug);
  return root.children.find((c) => c.slug === key);
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function categoryHref(rootSlug: string, childSlug?: string): string {
  if (!childSlug) return `/categories/${rootSlug}`;
  // Cyrillic path segments break on some proxies → keep sub in query string.
  return `/categories/${rootSlug}?sub=${encodeURIComponent(childSlug)}`;
}
