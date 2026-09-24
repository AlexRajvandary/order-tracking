"use client";

import { ExternalLink, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { CheckoutSheet } from "@/components/checkout-sheet";
import type { CatalogProduct } from "@/lib/catalog-products";
import type { ApiProductVariant } from "@/lib/products-api";

export function ProductDetailActions({
  product,
  variants,
  showSizes = false,
}: {
  product: CatalogProduct;
  variants: ApiProductVariant[];
  showSizes?: boolean;
}) {
  const { addItem } = useCart();
  const sizedVariants = variants.filter((variant): variant is ApiProductVariant & { size: string } => Boolean(variant.size));
  const [selectedSize, setSelectedSize] = useState(sizedVariants.find((variant) => variant.isAvailable !== false)?.size ?? "");
  const [quantity, setQuantity] = useState(1);
  const canPurchase = product.inStock && (!showSizes || sizedVariants.length === 0 || Boolean(selectedSize));

  const checkoutItems = [{
    source: product.source,
    productId: product.id,
    externalId: product.externalId,
    expectedUnitPrice: product.originalUnitPrice,
    expectedCurrencyCode: product.originalCurrencyCode,
    name: product.name,
    quantity,
    priceRub: product.priceRub,
    imageUrl: product.imageUrl,
    tint: product.tint,
  }];

  return (
    <div className="space-y-5">
      {showSizes ? (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Размер</span>
            <button type="button" className="text-muted-foreground underline underline-offset-4">Таблица размеров →</button>
          </div>
          {sizedVariants.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sizedVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedSize(variant.size)}
                  disabled={variant.isAvailable === false}
                  aria-pressed={selectedSize === variant.size}
                  className={`h-11 min-w-12 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35 ${selectedSize === variant.size ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"}`}
                >
                  {variant.size}
                </button>
              ))}
            </div>
          ) : <div className="h-10" />}
        </>
      ) : null}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Количество</span>
        <div className="flex h-10 items-center rounded-lg border border-border">
          <button type="button" aria-label="Уменьшить количество" className="flex h-full min-w-10 items-center justify-center rounded-l-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <button type="button" aria-label="Увеличить количество" className="flex h-full min-w-10 items-center justify-center rounded-r-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setQuantity((value) => value + 1)}>
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_1.15fr] gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:static lg:grid-cols-2 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <Button type="button" size="lg" variant="outline" className="h-12 min-w-0 rounded-lg px-2" disabled={!canPurchase} onClick={() => addItem(product, quantity)}>
          <ShoppingBag className="hidden min-[360px]:block" data-icon="inline-start" />
          В корзину
        </Button>
        <CheckoutSheet
          items={checkoutItems}
          trigger={<Button type="button" size="lg" className="h-12 w-full min-w-0 rounded-lg px-2" disabled={!canPurchase}>Купить</Button>}
        />
      </div>
      {product.source === "Rakuten" && (product.affiliateUrl || product.sourceUrl) ? (
        <Button
          render={<a href={product.affiliateUrl || product.sourceUrl} target="_blank" rel="noreferrer" />}
          size="lg"
          variant="outline"
          className="h-11 w-full rounded-lg"
        >
          <ExternalLink data-icon="inline-start" />
          Смотреть на Rakuten
        </Button>
      ) : null}
      {showSizes ? (
        <p className="text-center text-xs text-muted-foreground">
          {selectedSize ? `Выбран размер: ${selectedSize}` : "Размер можно выбрать позже"}
        </p>
      ) : null}
    </div>
  );
}
