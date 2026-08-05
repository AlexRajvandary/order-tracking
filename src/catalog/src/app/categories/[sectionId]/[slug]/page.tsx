import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import {
  fetchCategoryTree,
  findChildCategory,
  findRootCategory,
} from "@/lib/categories-api";
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

  const categoryTree = await fetchCategoryTree();
  const root = findRootCategory(categoryTree, sectionId);
  if (!root) notFound();

  const child = findChildCategory(root, slug);
  if (!child) notFound();

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
          title={child.name}
          subtitle={root.name}
          imageUrl={child.imageUrl ?? undefined}
          backHref={`/categories/${root.slug}`}
          backLabel={root.name}
          categoryTree={categoryTree}
          activeRootSlug={root.slug}
          activeChildSlug={child.slug}
          pagination={
            sectionId === "bags"
              ? {
                  page: catalog.page,
                  pageSize: catalog.pageSize,
                  total: catalog.total,
                  basePath: `/categories/${root.slug}/${child.slug}`,
                }
              : undefined
          }
        />
      </main>
    </div>
  );
}
