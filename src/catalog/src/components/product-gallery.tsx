"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useFavorites } from "@/components/favorites-provider";
import type { CatalogProduct } from "@/lib/catalog-products";
import type { ApiProductImage } from "@/lib/products-api";

export function ProductGallery({ product, images }: { product: CatalogProduct; images: ApiProductImage[] }) {
  const gallery = [
    product.imageUrl ? { id: "primary", imageUrl: product.imageUrl } : null,
    ...images.filter((image) => image.imageUrl && image.imageUrl !== product.imageUrl),
  ].filter((image): image is { id: string; imageUrl: string } => Boolean(image));
  const [selected, setSelected] = useState(gallery[0]?.imageUrl ?? "");
  const { has, toggle } = useFavorites();
  const favorite = has(product.id);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f1f4f7] lg:aspect-[5/6]">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected} alt={product.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : null}
        <button type="button" aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"} className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/95 shadow-sm" onClick={() => toggle(product.id, product)}>
          <Heart className={favorite ? "size-6 fill-red-500 text-red-500" : "size-6 text-foreground"} strokeWidth={1.5} />
        </button>
      </div>
      {gallery.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {gallery.map((image) => (
            <button key={image.id} type="button" className={`aspect-square overflow-hidden bg-[#f1f4f7] ${selected === image.imageUrl ? "ring-2 ring-foreground ring-offset-1" : ""}`} onClick={() => setSelected(image.imageUrl)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
