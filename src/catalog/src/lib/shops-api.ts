export type ApiShop = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ApiShopListResult = {
  items: ApiShop[];
};

export type ProductConditionFilter = "new" | "used";

function productsApiBaseUrl(): string {
  return (
    process.env.PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    "https://89-127-208-99.sslip.io"
  );
}

export async function fetchShops(): Promise<ApiShop[]> {
  const url = `${productsApiBaseUrl()}/api/products/shops?activeOnly=true`;
  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shops API ${res.status}: ${url}`);
  }

  const data = (await res.json()) as ApiShopListResult;
  return data.items ?? [];
}

export function parseCsvParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : raw.split(",");
  return values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parseConditionParam(
  raw: string | undefined,
): ProductConditionFilter[] {
  return parseCsvParam(raw).filter(
    (v): v is ProductConditionFilter => v === "new" || v === "used",
  );
}
