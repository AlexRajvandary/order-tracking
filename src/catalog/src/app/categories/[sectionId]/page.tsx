import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import {
  fetchCategoryTree,
  findChildCategory,
  findRootCategory,
  safeDecode,
} from "@/lib/categories-api";
import {
  fetchBagsCatalogPage,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/products-api";

type PageProps = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ page?: string; sub?: string }>;
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
  const { page: pageParam, sub: subParam } = await searchParams;
  const page = parsePage(pageParam);
  const subSlug = subParam ? safeDecode(subParam) : undefined;

  const categoryTree = await fetchCategoryTree();
  const root = findRootCategory(categoryTree, sectionId);
  if (!root) notFound();

  const child = subSlug ? findChildCategory(root, subSlug) : undefined;

  // Products are only wired for bags until Product.CategoryId exists.
  const catalog =
    root.slug === "bags"
      ? await fetchBagsCatalogPage({ page, pageSize: PRODUCTS_PAGE_SIZE })
      : { products: [], total: 0, page: 1, pageSize: PRODUCTS_PAGE_SIZE };

  const basePath = child
    ? `/categories/${root.slug}?sub=${encodeURIComponent(child.slug)}`
    : `/categories/${root.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6">
        <CatalogBrowser
          products={catalog.products}
          title={child?.name ?? root.name}
          subtitle={child ? root.name : undefined}
          backHref="/"
          backLabel="На главную"
          categoryTree={categoryTree}
          activeRootSlug={root.slug}
          activeChildSlug={child?.slug}
          pagination={
            root.slug === "bags"
              ? {
                  page: catalog.page,
                  pageSize: catalog.pageSize,
                  total: catalog.total,
                  basePath,
                }
              : undefined
          }
        />
      </main>
    </div>
  );
}
