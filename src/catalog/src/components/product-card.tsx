import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { FavoriteButton } from "@/components/favorite-button";
import type { CatalogProduct } from "@/lib/catalog-products";
import { formatPrice } from "@/lib/products";

type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden rounded-none bg-transparent py-0 ring-0">
      <Link href={`/products/${product.id}`} className="flex min-h-0 flex-1 flex-col">
        <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-muted">
          {product.imageUrl ? (
            // External marketplace URLs — load directly, no Next.js image proxy.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(145deg, ${product.tint}, oklch(0.22 0 0) 80%)`,
              }}
            />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-3">
          <p className="h-4 truncate text-[10px] leading-4 font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {product.brand ?? "\u00A0"}
          </p>
          <CardTitle className="h-11 line-clamp-2 text-[15px] leading-[1.375rem] font-medium">
            {product.name}
          </CardTitle>
          <p className="mt-auto pt-2 text-lg font-bold tracking-tight text-foreground">
            {formatPrice(product)}
          </p>
        </div>
      </Link>

      <FavoriteButton productId={product.id} />
    </Card>
  );
}
