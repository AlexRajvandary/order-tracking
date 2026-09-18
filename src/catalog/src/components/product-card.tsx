import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { FavoriteButton } from "@/components/favorite-button";
import type { CatalogProduct } from "@/lib/catalog-products";
import { formatPrice } from "@/lib/products";

type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  const href = product.source === "Rakuten" && product.externalId
    ? `/products/rakuten~${encodeURIComponent(product.externalId)}`
    : `/products/${product.id}`;
  const crew = product.tcgCard?.characters.find((character) =>
    character.franchise === "one-piece" && character.onePieceSpecification?.crew,
  )?.onePieceSpecification?.crew;

  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden rounded-none bg-transparent py-0 ring-0">
      <Link href={href} className="flex min-h-0 flex-1 flex-col">
        <div
          className="relative flex aspect-[4/5] shrink-0 items-center justify-center overflow-hidden bg-white"
        >
          {product.imageUrl ? (
            // External marketplace URLs — load directly, no Next.js image proxy.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-contain object-center"
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
          <div className="flex h-4 min-w-0 items-center justify-between gap-2 text-[10px] leading-4 font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            <span className="truncate">{product.tcgCard?.characterName ?? product.shopName ?? product.brand ?? "\u00A0"}</span>
            {crew ? <span className="max-w-[48%] shrink-0 truncate text-right">{crew}</span> : null}
          </div>
          <CardTitle className="h-11 line-clamp-2 text-[15px] leading-[1.375rem] font-medium">
            {product.name}
          </CardTitle>
          {product.priceRub > 0 ? (
            <p className="mt-auto pt-2 text-lg font-bold tracking-tight text-foreground">
              {formatPrice(product)}
            </p>
          ) : null}
        </div>
      </Link>

      <FavoriteButton productId={product.id} product={product} />
    </Card>
  );
}
