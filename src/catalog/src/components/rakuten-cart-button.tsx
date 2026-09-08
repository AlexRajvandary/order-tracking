"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import type { CatalogProduct } from "@/lib/catalog-products";

export function RakutenCartButton({ product }: { product: CatalogProduct }) {
  const { addItem } = useCart();
  return <Button type="button" className="mx-4 mb-4" disabled={!product.inStock} onClick={() => addItem(product)}>
    <ShoppingBag className="size-4" /> В корзину
  </Button>;
}
