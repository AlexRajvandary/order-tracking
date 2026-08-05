import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
// Hardcoded categories.ts — disabled.
// import { findCategoryItem } from "@/lib/categories";
// import { listProductsForCategoryItem } from "@/lib/catalog-products";
import {
  fetchBagsCatalogPage,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/products-api";

type PageProps = {
  params: Promise<{ sectionId: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function CategoryItemPage({
  params,
  searchParams,
}: PageProps) {
  const { sectionId, slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  // Hardcoded subcategory grids disabled; bags list lives at /categories/bags.
  if (sectionId !== "bags") {
    notFound();
  }

  const bags = await fetchBagsCatalogPage({
    page,
    pageSize: PRODUCTS_PAGE_SIZE,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <CatalogBrowser
          products={bags.products}
          title="Сумки"
          subtitle="Products API"
          backHref="/categories/bags"
          backLabel="Сумки"
          pagination={{
            page: bags.page,
            pageSize: bags.pageSize,
            total: bags.total,
            basePath: `/categories/bags/${slug}`,
          }}
        />
      </main>
    </div>
  );
}
