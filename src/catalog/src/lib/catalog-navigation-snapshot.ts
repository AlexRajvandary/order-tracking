import type { CatalogBrowserProps } from "@/components/catalog-browser";

export type CatalogNavigationSnapshot = Omit<
  CatalogBrowserProps,
  "products" | "productsLoading"
>;

let snapshot: CatalogNavigationSnapshot | null = null;

export function rememberCatalogNavigation(
  value: CatalogNavigationSnapshot,
): void {
  if (typeof window === "undefined") return;
  snapshot = value;
}

export function getCatalogNavigationSnapshot(): CatalogNavigationSnapshot | null {
  if (typeof window === "undefined") return null;
  return snapshot;
}
