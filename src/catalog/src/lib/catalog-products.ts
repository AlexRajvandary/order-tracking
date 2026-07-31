import type { CategoryItem, CategorySection } from "@/lib/categories";
import { categorySections } from "@/lib/categories";
import { BAGS_COLLECTION } from "@/lib/bags-collection";
import { formatPrice, type Product } from "@/lib/products";

export type CatalogProduct = Product & {
  sectionId: string;
  categorySlug: string;
};

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

const ADJECTIVES = [
  "Premium",
  "Classic",
  "Limited",
  "Studio",
  "Archive",
  "Daily",
  "Pro",
  "Lite",
  "Select",
  "Signature",
];

const TINTS = [
  "#1f6f5b",
  "#c45c26",
  "#2a4a6b",
  "#6b3a4a",
  "#3d3a2f",
  "#4a5d4e",
  "#1a2332",
  "#0f3d4c",
  "#5c3d2e",
  "#2f4550",
];

function buildProduct(
  section: CategorySection,
  item: CategoryItem,
  index: number,
): CatalogProduct {
  const seed = hashString(`${section.id}:${item.slug}:${index}`);
  const adj = ADJECTIVES[seed % ADJECTIVES.length];
  const priceRub = 2500 + (seed % 55) * 700;
  const inStock = seed % 7 !== 0;

  return {
    id: `${section.id}-${item.slug}-${index + 1}`,
    slug: `${item.slug}-${index + 1}`,
    name: `${adj} ${item.label}`,
    category: item.label,
    sectionId: section.id,
    categorySlug: item.slug,
    priceRub,
    currency: "RUB",
    shortDescription: `Демо-товар из категории «${item.label}» · ${section.title}.`,
    description: `In-memory позиция для витрины каталога. Раздел «${section.title}», подкатегория «${item.label}». Данные появятся после подключения API.`,
    tags: [section.title.toLowerCase(), item.label.toLowerCase(), inStock ? "в наличии" : "под заказ"],
    tint: TINTS[seed % TINTS.length],
    inStock,
  };
}

const PER_CATEGORY = 9;

export function listProductsForCategoryItem(
  sectionId: string,
  itemSlug: string,
): CatalogProduct[] {
  if (sectionId === "bags") {
    return BAGS_COLLECTION.filter((p) => p.categorySlug === itemSlug);
  }
  const section = categorySections.find((s) => s.id === sectionId);
  if (!section) return [];
  const item = section.items.find((i) => i.slug === itemSlug);
  if (!item) return [];
  return Array.from({ length: PER_CATEGORY }, (_, index) =>
    buildProduct(section, item, index),
  );
}

export function listProductsForSection(sectionId: string): CatalogProduct[] {
  if (sectionId === "bags") {
    return [...BAGS_COLLECTION];
  }
  const section = categorySections.find((s) => s.id === sectionId);
  if (!section) return [];
  return section.items.flatMap((item) =>
    Array.from({ length: 4 }, (_, index) => buildProduct(section, item, index)),
  );
}

export function findCatalogProductBySlug(slug: string): CatalogProduct | undefined {
  const fromBags = BAGS_COLLECTION.find((p) => p.slug === slug || p.id === slug);
  if (fromBags) return fromBags;

  for (const section of categorySections) {
    if (section.id === "bags") continue;
    for (const item of section.items) {
      const found = listProductsForCategoryItem(section.id, item.slug).find(
        (p) => p.slug === slug || p.id === slug,
      );
      if (found) return found;
    }
  }
  return undefined;
}

export { formatPrice };
