"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/product-grid-skeleton";
import { useFavorites } from "@/components/favorites-provider";
import { mapApiProductToCatalog, type ApiProduct } from "@/lib/products-api";

export default function FavoritesPage() {
  const { ids } = useFavorites();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      ids.map(async (id) => {
        const response = await fetch(`/api/catalog/product/${encodeURIComponent(id)}`);
        return response.ok ? ((await response.json()) as ApiProduct) : null;
      }),
    )
      .then((items) => {
        if (!cancelled) setProducts(items.filter((item): item is ApiProduct => item !== null));
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8 sm:px-8 lg:px-10">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">Избранное</h1>
        {loading ? <ProductGridSkeleton count={5} /> : products.length === 0 ? (
          <div className="border border-border px-5 py-16 text-center text-sm text-muted-foreground">
            Вы ещё не добавили товары в избранное.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={mapApiProductToCatalog(product)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
