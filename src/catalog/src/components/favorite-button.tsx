"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/components/favorites-provider";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog-products";

type FavoriteButtonProps = {
  productId: string;
  product?: CatalogProduct;
  className?: string;
};

export function FavoriteButton({ productId, product, className }: FavoriteButtonProps) {
  const { has, toggle } = useFavorites();
  const active = has(productId);

  return (
    <button
      type="button"
      aria-label={active ? "Убрать из избранного" : "Добавить в избранное"}
      aria-pressed={active}
      className={cn(
        "absolute top-2 right-2 z-10 flex size-10 items-center justify-center bg-transparent p-0",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId, product);
      }}
    >
      <Heart
        className={cn(
          "size-7 drop-shadow-sm transition-colors",
          active ? "fill-red-500 text-red-500" : "fill-white text-white",
        )}
        strokeWidth={1.75}
      />
    </button>
  );
}
