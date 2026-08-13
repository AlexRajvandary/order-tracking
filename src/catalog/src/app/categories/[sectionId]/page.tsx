import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { fetchBrands, parseBrandSlugs } from "@/lib/brands-api";
import {
  fetchCategoryTree,
  findChildCategory,
  findRootCategory,
  safeDecode,
} from "@/lib/categories-api";
import {
  fetchCatalogPage,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/products-api";
import {
  fetchShops,
  parseCsvParam,
} from "@/lib/shops-api";

type PageProps = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{
    page?: string;
    sub?: string;
    brands?: string;
    shops?: string;
  }>;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function buildBasePath(
  rootSlug: string,
  subSlug?: string,
  brandSlugs?: string[],
  shopSlugs?: string[],
) {
  const qs = new URLSearchParams();
  if (subSlug) qs.set("sub", subSlug);
  if (brandSlugs && brandSlugs.length > 0) qs.set("brands", brandSlugs.join(","));
  if (shopSlugs && shopSlugs.length > 0) qs.set("shops", shopSlugs.join(","));
  const search = qs.toString();
  return search ? `/categories/${rootSlug}?${search}` : `/categories/${rootSlug}`;
}

export default async function CategorySectionPage({
  params,
  searchParams,
}: PageProps) {
  const { sectionId } = await params;
  const {
    page: pageParam,
    sub: subParam,
    brands: brandsParam,
    shops: shopsParam,
  } = await searchParams;
  const page = parsePage(pageParam);
  const subSlug = subParam ? safeDecode(subParam) : undefined;
  const selectedBrandSlugs = parseBrandSlugs(brandsParam);
  const selectedShopSlugs = parseCsvParam(shopsParam);

  const [categoryTree, brands, shops] = await Promise.all([
    fetchCategoryTree({ includeProductCounts: true, productsActiveOnly: true }),
    fetchBrands().catch(() => []),
    fetchShops().catch(() => []),
  ]);

  const root = findRootCategory(categoryTree, sectionId);
  if (!root) notFound();

  const child = subSlug ? findChildCategory(root, subSlug) : undefined;

  const catalog = await fetchCatalogPage({
    rootCategorySlug: root.slug,
    rootCategoryName: root.name,
    page,
    pageSize: PRODUCTS_PAGE_SIZE,
    brandSlugs: selectedBrandSlugs,
    shopSlugs: selectedShopSlugs,
    categorySlug: child?.slug,
    categoryName: child?.name,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 sm:px-8 lg:px-10">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка…</p>}>
          <CatalogBrowser
            products={catalog.products}
            title={child?.name ?? root.name}
            subtitle={child ? root.name : undefined}
            backHref="/"
            backLabel="На главную"
            categoryTree={categoryTree}
            activeRootSlug={root.slug}
            activeChildSlug={child?.slug}
            brands={brands}
            selectedBrandSlugs={selectedBrandSlugs}
            shops={shops}
            selectedShopSlugs={selectedShopSlugs}
            pagination={{
              page: catalog.page,
              pageSize: catalog.pageSize,
              total: catalog.total,
              basePath: buildBasePath(
                root.slug,
                child?.slug,
                selectedBrandSlugs,
                selectedShopSlugs,
              ),
            }}
          />
        </Suspense>
      </main>
    </div>
  );
}
