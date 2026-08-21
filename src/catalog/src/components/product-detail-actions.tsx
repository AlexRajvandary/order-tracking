"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import type { CatalogProduct } from "@/lib/catalog-products";
import type { ApiProductVariant } from "@/lib/products-api";

export function ProductDetailActions({ product, variants }: { product: CatalogProduct; variants: ApiProductVariant[] }) {
  const { addItem } = useCart();
  const sizes = variants.map((variant) => variant.size).filter((size): size is string => Boolean(size));
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-t border-border pt-5 text-sm">
        <span className="font-medium">Размер</span>
        <button type="button" className="text-muted-foreground underline underline-offset-4">Таблица размеров →</button>
      </div>
      {sizes.length > 0 ? <div className="flex flex-wrap gap-2">{sizes.map((size) => <button key={size} type="button" onClick={() => setSelectedSize(size)} className={`min-w-12 border px-3 py-2 text-sm ${selectedSize === size ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}>{size}</button>)}</div> : <div className="h-10" />}
      <div className="flex items-center justify-between border-t border-border pt-5 text-sm">
        <span className="font-medium">Количество</span>
        <div className="flex h-9 items-center border border-border">
          <button type="button" aria-label="Уменьшить количество" className="px-3" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus className="size-4" /></button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <button type="button" aria-label="Увеличить количество" className="px-3" onClick={() => setQuantity((value) => value + 1)}><Plus className="size-4" /></button>
        </div>
      </div>
      <Button type="button" size="lg" className="h-11 w-full rounded-none" onClick={() => addItem(product, quantity)}><ShoppingBag data-icon="inline-start" /> Купить</Button>
      <p className="text-center text-xs text-muted-foreground">{selectedSize ? `Выбран размер: ${selectedSize}` : "Размер можно выбрать позже"}</p>
    </div>
  );
}
