export type StorefrontAnnouncement = {
  text: string;
  updatedAt: string;
};

function productsApiBaseUrl(): string {
  return (
    process.env.PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_PRODUCTS_API_BASE_URL?.replace(/\/$/, "") ||
    "https://89-127-208-99.sslip.io"
  );
}

export async function fetchStorefrontAnnouncement(): Promise<StorefrontAnnouncement | null> {
  try {
    const response = await fetch(
      `${productsApiBaseUrl()}/api/products/storefront-announcement`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as StorefrontAnnouncement;
    return data.text?.trim() ? data : null;
  } catch {
    return null;
  }
}
