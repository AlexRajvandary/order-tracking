import { Suspense } from "react";
import { HomeCategories } from "@/components/home/home-categories";
import { HomeHero } from "@/components/home/home-hero";
import {
  HomeProducts,
  HomeProductsSkeleton,
} from "@/components/home/home-products";
import { HomeShops } from "@/components/home/home-shops";
import { SiteHeader } from "@/components/site-header";
import { fetchCategoryTree } from "@/lib/categories-api";
import { fetchCatalogPage } from "@/lib/products-api";
import { fetchShops } from "@/lib/shops-api";

export default async function AlternativeHomePage() {
  const categoriesPromise = fetchCategoryTree({
    includeProductCounts: true,
    productsActiveOnly: true,
  });
  const shopsPromise = fetchShops();
  const productsPromise = fetchCatalogPage({
    rootCategorySlug: "одежда",
    rootCategoryName: "Одежда",
    page: 1,
    pageSize: 5,
  });

  const [categoriesResult, shopsResult] = await Promise.allSettled([
    categoriesPromise,
    shopsPromise,
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pt-5 pb-16 sm:px-8 sm:pt-8 sm:pb-20 lg:px-10 lg:pb-24">
        <HomeHero />

        <div className="space-y-16 pt-16 sm:space-y-20 sm:pt-20 lg:space-y-24 lg:pt-24">
          <HomeCategories
            categories={
              categoriesResult.status === "fulfilled"
                ? categoriesResult.value
                : []
            }
            failed={categoriesResult.status === "rejected"}
          />

          <Suspense fallback={<HomeProductsSkeleton />}>
            <HomeProducts result={productsPromise} />
          </Suspense>

          <HomeShops
            shops={shopsResult.status === "fulfilled" ? shopsResult.value : []}
            failed={shopsResult.status === "rejected"}
          />
        </div>
      </main>
    </div>
  );
}
