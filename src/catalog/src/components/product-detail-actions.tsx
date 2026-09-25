"use client";

import { ExternalLink, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { CheckoutSheet } from "@/components/checkout-sheet";
import type { CatalogProduct } from "@/lib/catalog-products";
import type { ApiProductColor, ApiProductSize } from "@/lib/products-api";

export function ProductDetailActions({
  product,
  colors,
  sizes,
}: {
  product: CatalogProduct;
  colors: ApiProductColor[];
  sizes: ApiProductSize[];
}) {
  const { addItem } = useCart();
  const selectableSizes = sizes;
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id ?? "");
  const [selectedSizeId, setSelectedSizeId] = useState(selectableSizes[0]?.id ?? "");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const selectedColor = colors.find((color) => color.id === selectedColorId);
  const selectedSize = selectableSizes.find((size) => size.id === selectedSizeId);
  const canPurchase = product.inStock
    && (colors.length === 0 || Boolean(selectedColor))
    && (selectableSizes.length === 0 || Boolean(selectedSize));

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
    selectedColor: selectedColor?.name,
    selectedSize: selectedSize?.name,
  }];

  return (
    <div className="space-y-5">
      {colors.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Цвет</span>
            {selectedColor ? <span className="text-muted-foreground">{selectedColor.name}</span> : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {colors.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setSelectedColorId(color.id)}
                aria-pressed={selectedColorId === color.id}
                className={`h-11 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selectedColorId === color.id ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"}`}
              >
                {color.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {selectableSizes.length > 0 ? (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Размер</span>
            {selectableSizes.some((size) => size.specifications && Object.keys(size.specifications).length > 0) ? (
              <button type="button" className="text-muted-foreground underline underline-offset-4" onClick={() => setShowSizeGuide((value) => !value)}>
                {showSizeGuide ? "Скрыть таблицу" : "Таблица размеров →"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {selectableSizes.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setSelectedSizeId(size.id)}
                aria-pressed={selectedSizeId === size.id}
                className={`h-11 min-w-12 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selectedSizeId === size.id ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"}`}
              >
                {size.shortName || size.name}
              </button>
            ))}
          </div>
          {showSizeGuide ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-max text-left text-xs">
                <thead className="bg-muted/60"><tr><th className="px-3 py-2 font-medium">Размер</th><th className="px-3 py-2 font-medium">Параметры</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {selectableSizes.map((size) => (
                    <tr key={size.id}>
                      <td className="px-3 py-2 font-medium">{size.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {size.specifications && Object.keys(size.specifications).length > 0
                          ? Object.entries(size.specifications).map(([name, value]) => `${name}: ${value}`).join(" · ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
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
        <Button type="button" size="lg" variant="outline" className="h-12 min-w-0 rounded-lg px-2" disabled={!canPurchase} onClick={() => addItem(product, quantity, { selectedColor: selectedColor?.name, selectedSize: selectedSize?.name })}>
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
      {selectedColor || selectedSize ? (
        <p className="text-center text-xs text-muted-foreground">
          {[selectedColor ? `Цвет: ${selectedColor.name}` : null, selectedSize ? `размер: ${selectedSize.name}` : null].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
