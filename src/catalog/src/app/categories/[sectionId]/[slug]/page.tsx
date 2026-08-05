import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { findCategoryItem } from "@/lib/categories";
import { listProductsForCategoryItem } from "@/lib/catalog-products";
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
  const found = findCategoryItem(sectionId, slug);
  if (!found) notFound();

  const { section, item } = found;
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
            title={item.label}
            subtitle={`${section.title} · Products API`}
            imageUrl={item.imageUrl}
            backHref={`/categories/${section.id}`}
            backLabel={section.title}
            pagination={{
              page: bags.page,
              pageSize: bags.pageSize,
              total: bags.total,
              basePath: `/categories/${section.id}/${item.slug}`,
            }}
          />
        </main>
      </div>
    );
  }

  const products = listProductsForCategoryItem(sectionId, slug);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <CatalogBrowser
          products={products}
          title={item.label}
          subtitle={`${section.title} · демо-каталог`}
          imageUrl={item.imageUrl}
          backHref={`/categories/${section.id}`}
          backLabel={section.title}
        />
      </main>
    </div>
  );
}
