"use client";

import { useState } from "react";
import { CheckIcon, ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/products";

type AddToCartButtonProps = {
  product: Product;
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function AddToCartButton({
  product,
  size = "default",
  className,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  if (!product.inStock) {
    return (
      <Button size={size} className={className} disabled>
        Нет в наличии
      </Button>
    );
  }

  return (
    <Button
      size={size}
      className={className}
      onClick={() => {
        addItem(product);
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 1400);
      }}
    >
      {justAdded ? (
        <>
          <CheckIcon data-icon="inline-start" />
          В корзине
        </>
      ) : (
        <>
          <ShoppingBagIcon data-icon="inline-start" />
          В корзину
        </>
      )}
    </Button>
  );
}
