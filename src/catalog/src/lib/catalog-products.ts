// Hardcoded category mocks — disabled with categories.ts / bags-collection.
// import type { CategoryItem, CategorySection } from "@/lib/categories";
// import { categorySections } from "@/lib/categories";
// import { BAGS_COLLECTION } from "@/lib/bags-collection";
import { formatPrice, type Product } from "@/lib/products";

export type CatalogProduct = Product & {
  sectionId: string;
  categorySlug: string;
};

// --- legacy in-memory product builders (unused) ---
// function buildProduct(...) { ... }
// const PER_CATEGORY = 9;

export function listProductsForCategoryItem(
  _sectionId: string,
  _itemSlug: string,
): CatalogProduct[] {
  // Bags: Products API (fetchBagsCatalogPage). Other sections: disabled.
  return [];
}

export function listProductsForSection(_sectionId: string): CatalogProduct[] {
  return [];
}

export function findCatalogProductBySlug(
  _slug: string,
): CatalogProduct | undefined {
  // Demo / legacy slug lookup disabled — product pages resolve via Products API.
  return undefined;
}

export { formatPrice };
