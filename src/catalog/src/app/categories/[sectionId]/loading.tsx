"use client";

import { CatalogBrowser } from "@/components/catalog-browser";
import { ProductGridSkeleton } from "@/components/product-grid-skeleton";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCatalogNavigationSnapshot } from "@/lib/catalog-navigation-snapshot";

function InitialCatalogSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="grid gap-x-6 gap-y-6 min-[992px]:grid-cols-[240px_minmax(0,1fr)] min-[992px]:grid-rows-[auto_auto] min-[992px]:gap-y-8 min-[1200px]:grid-cols-[260px_minmax(0,1fr)] min-[1200px]:gap-x-7">
          <aside className="hidden w-full min-w-0 min-[992px]:row-span-2 min-[992px]:grid min-[992px]:[grid-template-rows:subgrid]" aria-label="Загрузка дерева категорий">
            <Skeleton className="h-9 w-[200%]" />
            <div className="space-y-3">
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="flex items-center gap-3 px-2 py-1">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 min-[992px]:row-span-2 min-[992px]:grid min-[992px]:[grid-template-rows:subgrid]">
            <div className="mb-3 flex flex-wrap items-center gap-2 min-[992px]:mb-0">
              <Button type="button" variant="outline" size="sm" className="h-9 min-[992px]:hidden" disabled>
                Категории
              </Button>
              <div className="ml-auto flex gap-2">
                {['Цена', 'Магазин', 'Бренд', 'Сортировка'].map((label) => (
                  <Button key={label} type="button" variant="outline" size="sm" className="h-9" disabled>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <ProductGridSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CategoryLoading() {
  const previous = getCatalogNavigationSnapshot();

  if (!previous) return <InitialCatalogSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 sm:px-8 lg:px-10">
        <CatalogBrowser {...previous} products={[]} productsLoading />
      </main>
    </div>
  );
}
