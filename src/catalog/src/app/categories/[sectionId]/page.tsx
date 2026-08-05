import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import {
  fetchCategoryTree,
  findRootCategory,
} from "@/lib/categories-api";
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

  const categoryTree = await fetchCategoryTree();
  const root = findRootCategory(categoryTree, sectionId);
  if (!root) notFound();

  // Products are only wired for bags until Product.CategoryId exists.
  const catalog =
    sectionId === "bags"
      ? await fetchBagsCatalogPage({ page, pageSize: PRODUCTS_PAGE_SIZE })
      : { products: [], total: 0, page: 1, pageSize: PRODUCTS_PAGE_SIZE };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <CatalogBrowser
          products={catalog.products}
          title={root.name}
          imageUrl={root.imageUrl ?? undefined}
          backHref="/"
          backLabel="На главную"
          categoryTree={categoryTree}
          activeRootSlug={root.slug}
          pagination={
            sectionId === "bags"
              ? {
                  page: catalog.page,
                  pageSize: catalog.pageSize,
                  total: catalog.total,
                  basePath: `/categories/${root.slug}`,
                }
              : undefined
          }
        />
      </main>
    </div>
  );
}
