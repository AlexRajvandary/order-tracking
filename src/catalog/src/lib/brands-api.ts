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

function productsApiBaseUrl(): string {
  return (
    process.env.PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    "https://89-127-208-99.sslip.io"
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

export function parseBrandSlugs(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : raw.split(",");
  return values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}
