"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/product-grid-skeleton";
import { useFavorites } from "@/components/favorites-provider";
import { mapApiProductToCatalog, type ApiProduct } from "@/lib/products-api";
import type { CatalogProduct } from "@/lib/catalog-products";
import { Button } from "@/components/ui/button";
import { CustomerAreaNavigation } from "@/components/customer-area-navigation";
import { AccountBreadcrumbs } from "@/components/account-breadcrumbs";

export default function FavoritesPage() {
  const { ids, products: storedProducts, ready, clear } = useFavorites();
  const [loadedProducts, setLoadedProducts] = useState<Record<string, CatalogProduct>>({});
  const [resolvedRequestKey, setResolvedRequestKey] = useState("");
  const missingIds = useMemo(
    () => ids.filter((id) => !storedProducts[id]),
    [ids, storedProducts],
  );
  const requestKey = missingIds.join("|");
  const loading = !ready || (missingIds.length > 0 && resolvedRequestKey !== requestKey);

  useEffect(() => {
    let cancelled = false;
    if (missingIds.length === 0) {
      return () => { cancelled = true; };
    }

    void Promise.all(
      missingIds.map(async (id) => {
        const response = await fetch(`/api/catalog/product/${encodeURIComponent(id)}`);
        return response.ok ? ((await response.json()) as ApiProduct) : null;
      }),
    )
      .then((items) => {
        if (!cancelled) {
          setLoadedProducts((previous) => ({
            ...previous,
            ...Object.fromEntries(
              items
                .filter((item): item is ApiProduct => item !== null)
                .map((item) => [item.id, mapApiProductToCatalog(item)]),
            ),
          }));
        }
      })
      .catch(() => {
        // Keep any products restored from local storage visible.
      })
      .finally(() => {
        if (!cancelled) setResolvedRequestKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [missingIds, requestKey]);

  const products = ids
    .map((id) => storedProducts[id] ?? loadedProducts[id])
    .filter((product): product is CatalogProduct => product !== undefined);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <SiteHeader />
      <AccountBreadcrumbs />
      <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-4 px-4 py-6 pb-24 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 lg:px-10">
        <CustomerAreaNavigation />
        <section className="min-w-0 py-2 lg:px-4">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-[30px] font-semibold tracking-tight text-[#111] sm:text-[34px]">Избранное</h1>
          {ids.length > 0 ? (
            <Button type="button" variant="outline" onClick={clear}>
              <Trash2 data-icon="inline-start" />
              Очистить избранное
            </Button>
          ) : null}
        </div>
        {loading ? <ProductGridSkeleton count={5} /> : products.length === 0 ? (
          <div className="mt-12 flex max-w-[840px] flex-col items-start gap-6 sm:gap-8 lg:flex-row lg:items-center lg:gap-14">
            <Image
              src="/assets/favorites-empty.png"
              alt=""
              width={512}
              height={512}
              className="h-auto w-[240px] max-w-full shrink-0 object-contain sm:w-[280px] lg:w-[320px] lg:max-w-[40%]"
            />
            <div className="w-full">
              <h2 className="text-xl font-semibold text-[#111]">В избранном пока пусто</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500 sm:text-base">
                Сохраняйте понравившиеся товары, чтобы вернуться к ним позже.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white transition hover:bg-[#1a1a1a] sm:w-auto"
              >
                Перейти к товарам
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        </section>
      </main>
    </div>
  );
}
