"use client";

import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useState } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { NavigationBackButton } from "@/components/navigation-back-button";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog-products";
import type { ApiProductImage } from "@/lib/products-api";

export function ProductGallery({
  product,
  images,
  backHref,
}: {
  product: CatalogProduct;
  images: ApiProductImage[];
  backHref: string;
}) {
  const gallery = [
    product.imageUrl ? { id: "primary", imageUrl: product.imageUrl } : null,
    ...images.filter((image) => image.imageUrl && image.imageUrl !== product.imageUrl),
  ].filter((image): image is { id: string; imageUrl: string } => Boolean(image));
  const [selected, setSelected] = useState(gallery[0]?.imageUrl ?? "");
  const { has, toggle } = useFavorites();
  const favorite = has(product.id);
  const selectedIndex = Math.max(0, gallery.findIndex((image) => image.imageUrl === selected));
  const selectPrevious = () => setSelected(gallery[(selectedIndex - 1 + gallery.length) % gallery.length].imageUrl);
  const selectNext = () => setSelected(gallery[(selectedIndex + 1) % gallery.length].imageUrl);

  return (
    <div className="w-full min-w-0 max-w-full space-y-3">
      <div className="relative aspect-[4/5] w-full max-w-full overflow-hidden bg-[#f1f4f7] lg:aspect-[5/6]">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected} alt={product.name} className="block h-full w-full max-w-full object-cover" referrerPolicy="no-referrer" />
        ) : null}
        <NavigationBackButton
          label="Назад"
          fallbackHref={backHref}
          iconOnly
          className="absolute left-4 top-4 z-10 size-11 rounded-full border-0 bg-white/95 p-0 shadow-md hover:bg-white lg:hidden"
        />
        <button type="button" aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"} aria-pressed={favorite} className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/95 shadow-md transition-transform hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => toggle(product.id, product)}>
          <Heart className={favorite ? "size-6 fill-red-500 text-red-500" : "size-6 text-foreground"} strokeWidth={1.5} />
        </button>
        {gallery.length > 0 ? (
          <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
            {selectedIndex + 1} / {gallery.length}
          </div>
        ) : null}
        {gallery.length > 1 ? (
          <>
            <button type="button" aria-label="Предыдущее изображение" className="absolute left-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-md transition-transform hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={selectPrevious}>
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button type="button" aria-label="Следующее изображение" className="absolute right-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-md transition-transform hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={selectNext}>
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      {gallery.length > 1 ? (
        <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-2 sm:grid-cols-3">
          {gallery.map((image) => (
            <button key={image.id} type="button" aria-label="Показать изображение товара" aria-current={selected === image.imageUrl} className={cn("aspect-[4/5] min-w-0 overflow-hidden rounded-md border-2 border-transparent bg-[#f1f4f7] transition-opacity hover:opacity-90", selected === image.imageUrl && "border-foreground")} onClick={() => setSelected(image.imageUrl)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
