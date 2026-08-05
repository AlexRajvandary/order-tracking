import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { getCategorySection } from "@/lib/categories";
import { listProductsForSection } from "@/lib/catalog-products";
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
  const section = getCategorySection(sectionId);
  if (!section) notFound();

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  if (sectionId === "bags") {
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
            title={section.title}
            subtitle="Товары из Products API"
            backHref="/"
            backLabel="На главную"
            subcategoryOptions={section.items.map((item) => ({
              slug: item.slug,
              label: item.label,
            }))}
            pagination={{
              page: bags.page,
              pageSize: bags.pageSize,
              total: bags.total,
              basePath: `/categories/${section.id}`,
            }}
          />
        </main>
      </div>
    );
  }

  const products = listProductsForSection(sectionId);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <CatalogBrowser
          products={products}
          title={section.title}
          subtitle="Все подкатегории · демо-каталог"
          backHref="/"
          backLabel="На главную"
          subcategoryOptions={section.items.map((item) => ({
            slug: item.slug,
            label: item.label,
          }))}
        />
      </main>
    </div>
  );
}
