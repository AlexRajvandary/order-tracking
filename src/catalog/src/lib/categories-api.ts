import { unstable_cache } from "next/cache";

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

type FetchCategoryTreeOptions = {
  popularOnly?: boolean;
  includeProductCounts?: boolean;
  productsActiveOnly?: boolean;
};

const fetchCachedCategoryTree = unstable_cache(
  async (
    popularOnly: boolean,
    includeProductCounts: boolean,
    productsActiveOnly: boolean | null,
  ): Promise<ApiCategory[]> => {
    const params = new URLSearchParams({ activeOnly: "true" });
    if (popularOnly) params.set("popularOnly", "true");
    if (includeProductCounts) params.set("includeProductCounts", "true");
    if (productsActiveOnly != null) {
      params.set("productsActiveOnly", String(productsActiveOnly));
    }

    const url = `${productsApiBaseUrl()}/api/products/categories?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Categories API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as ApiCategoryListResult;
    return (data.items ?? []).map(normalizeCategoryTitle);
  },
  ["catalog-category-tree"],
  { revalidate: 3600 },
);

export async function fetchCategoryTree(
  options?: FetchCategoryTreeOptions,
): Promise<ApiCategory[]> {
  try {
    return await fetchCachedCategoryTree(
      options?.popularOnly ?? false,
      options?.includeProductCounts ?? false,
      options?.productsActiveOnly ?? null,
    );
  } catch {
    return [];
  }
}

function normalizeCategoryTitle(category: ApiCategory): ApiCategory {
  return {
    ...category,
    name: category.slug === "tcg" ? "Коллекционные карточные игры" : category.name,
    children: category.children.map(normalizeCategoryTitle),
  };
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
