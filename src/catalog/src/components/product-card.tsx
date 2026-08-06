import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import type { CatalogProduct } from "@/lib/catalog-products";
import { formatPrice } from "@/lib/products";

type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="flex min-h-0 flex-1 flex-col">
        <div className="relative aspect-[3/4] shrink-0 overflow-hidden bg-muted">
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
          <p className="h-4 truncate text-xs font-medium leading-4 text-muted-foreground">
            {product.brand ?? "\u00A0"}
          </p>
          <CardTitle className="h-[2.75rem] line-clamp-2 text-base leading-snug">
            {product.name}
          </CardTitle>
          <p className="mt-auto pt-2 text-lg font-semibold tracking-tight text-foreground">
            {formatPrice(product)}
          </p>
        </div>
      </Link>

      <FavoriteButton productId={product.id} />
      <div className="mt-auto px-3 pb-3">
        <AddToCartButton
          product={product}
          className="h-11 w-full rounded-lg border border-solid border-[#D1D5DB] bg-white text-[#111827] shadow-none hover:border-[#111827] hover:bg-[#111827] hover:text-white hover:-translate-y-px"
        />
      </div>
    </Card>
  );
}
