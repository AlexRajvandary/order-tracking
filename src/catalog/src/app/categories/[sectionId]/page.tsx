import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
// Hardcoded categories.ts grids — disabled.
// import { getCategorySection } from "@/lib/categories";
// import { listProductsForSection } from "@/lib/catalog-products";
import {
  fetchBagsCatalogPage,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/products-api";

type PageProps = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ page?: string }>;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function CategorySectionPage({
  params,
  searchParams,
}: PageProps) {
  const { sectionId } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  // Only bags are live (Products API). Other hardcoded sections are disabled.
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
          subtitle="Товары из Products API"
          backHref="/"
          backLabel="На главную"
          pagination={{
            page: bags.page,
            pageSize: bags.pageSize,
            total: bags.total,
            basePath: `/categories/bags`,
          }}
        />
      </main>
    </div>
  );
}
