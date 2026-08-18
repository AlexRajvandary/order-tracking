"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/products";
import { mapApiProductToCatalog, type ApiProduct } from "@/lib/products-api";
import type { CatalogProduct } from "@/lib/catalog-products";

type FavoriteSheetProps = {
  trigger: ReactElement;
};

export function FavoriteSheet({ trigger }: FavoriteSheetProps) {
  const { ids, products: favoriteProducts, toggle } = useFavorites();
  const [loadedProducts, setLoadedProducts] = useState<Record<string, CatalogProduct>>({});

  useEffect(() => {
    let cancelled = false;
    const missingIds = ids.filter((id) => !favoriteProducts[id]);
    if (missingIds.length === 0) return () => { cancelled = true; };
    void Promise.all(
      missingIds.map(async (id) => {
        const response = await fetch(`/api/catalog/product/${encodeURIComponent(id)}`);
        if (!response.ok) return null;
        const product = (await response.json()) as ApiProduct;
        return [id, mapApiProductToCatalog(product)] as const;
      }),
    ).then((items) => {
      if (!cancelled) {
        setLoadedProducts((prev) => Object.fromEntries([
          ...Object.entries(prev),
          ...items.filter((item): item is readonly [string, CatalogProduct] => item !== null),
        ]));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ids, favoriteProducts]);

  const products = ids
    .map((id) => favoriteProducts[id] ?? loadedProducts[id])
    .filter((product): product is CatalogProduct => product !== undefined);

  return (
    <Sheet>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">Избранное</SheetTitle>
          <SheetDescription>
            {ids.length === 0 ? "Здесь появятся понравившиеся товары." : `${ids.length} товаров`}
          </SheetDescription>
        </SheetHeader>

        {ids.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-8 text-center">
            <Heart className="size-10 text-muted-foreground" />
            <Button render={<Link href="/" />}>К каталогу</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              <ul className="space-y-4 pb-4">
                {products.map((product) => (
                  <li key={product.id} className="flex items-center gap-3">
                    <div
                      className="size-16 shrink-0 overflow-hidden bg-muted"
                      style={{
                        background: product.imageUrl
                          ? undefined
                          : `linear-gradient(145deg, ${product.tint}, #0b1220 85%)`,
                      }}
                    >
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${product.id}`}
                        className="line-clamp-2 text-sm font-semibold leading-snug hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">{formatPrice(product)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Удалить из избранного"
                      onClick={() => toggle(product.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
