"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/product-grid-skeleton";
import { useFavorites } from "@/components/favorites-provider";
import { mapApiProductToCatalog, type ApiProduct } from "@/lib/products-api";
import type { CatalogProduct } from "@/lib/catalog-products";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Избранное</h1>
          {ids.length > 0 ? (
            <Button type="button" variant="outline" onClick={clear}>
              <Trash2 data-icon="inline-start" />
              Очистить избранное
            </Button>
          ) : null}
        </div>
        {loading ? <ProductGridSkeleton count={5} /> : products.length === 0 ? (
          <div className="border border-border px-5 py-16 text-center text-sm text-muted-foreground">
            Вы ещё не добавили товары в избранное.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
