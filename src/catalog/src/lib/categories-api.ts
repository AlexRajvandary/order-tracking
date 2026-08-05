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
  children: ApiCategory[];
};

export type ApiCategoryListResult = {
  items: ApiCategory[];
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
  return tree.find((c) => c.slug === slug);
}

export function findChildCategory(
  root: ApiCategory,
  childSlug: string,
): ApiCategory | undefined {
  return root.children.find((c) => c.slug === childSlug);
}

export function categoryHref(rootSlug: string, childSlug?: string): string {
  if (childSlug) return `/categories/${rootSlug}/${childSlug}`;
  return `/categories/${rootSlug}`;
}
