"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/products";
import { convertPriceToRub } from "@/lib/products-api";

export type CartItem = {
  lineId: string;
  source: "Internal" | "Rakuten";
  productId: string;
  externalId?: string;
  expectedUnitPrice: number;
  expectedCurrencyCode: string;
  slug: string;
  name: string;
  priceRub: number;
  imageUrl?: string;
  tint: string;
  selectedColor?: string;
  selectedSize?: string;
  quantity: number;
};

export type CartSelection = {
  selectedColor?: string;
  selectedSize?: string;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalRub: number;
  addItem: (product: Product, quantity?: number, selection?: CartSelection) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "the-get-catalog-cart";

const CartContext = createContext<CartContextValue | null>(null);

function cartLineId(source: string, productId: string, selectedColor?: string, selectedSize?: string) {
  return JSON.stringify([source, productId, selectedColor ?? "", selectedSize ?? ""]);
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.map(i => {
      const source = i.source ?? "Internal";
      return {
        ...i,
        source,
        lineId: cartLineId(source, i.productId, i.selectedColor, i.selectedSize),
        expectedUnitPrice: i.expectedUnitPrice ?? i.priceRub,
        expectedCurrencyCode: i.expectedCurrencyCode ?? "RUB",
      };
    }) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const localItems = loadCart();
      try {
        const response = await fetch("/api/catalog/cart", { cache: "no-store" });
        const rawServerItems = response.ok ? ((await response.json()) as Array<Record<string, unknown>>) : [];
        const serverItems = rawServerItems.map((value) => {
          const source = (value.source as "Internal" | "Rakuten") ?? "Internal";
          const productId = String(value.productId ?? value.id);
          const selectedColor = value.selectedColor ? String(value.selectedColor) : undefined;
          const selectedSize = value.selectedSize ? String(value.selectedSize) : undefined;
          return {
            source,
            lineId: cartLineId(source, productId, selectedColor, selectedSize),
            productId,
            externalId: value.externalId ? String(value.externalId) : undefined,
            slug: String(value.slug ?? value.id),
            name: String(value.name ?? ""),
            priceRub: convertPriceToRub(
              Number(value.price),
              String(value.currencyCode ?? "RUB"),
            ) ?? 0,
            expectedUnitPrice: Number(value.price),
            expectedCurrencyCode: String(value.currencyCode ?? "RUB"),
            imageUrl: value.imageUrl ? String(value.imageUrl) : undefined,
            tint: "#0f3d4c",
            selectedColor,
            selectedSize,
            quantity: Number(value.quantity),
          };
        });
        if (!cancelled) setItems(serverItems.length > 0 ? serverItems : localItems);
      } catch {
        if (!cancelled) setItems(localItems);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    void (async () => {
      await fetch("/api/catalog/cart", { method: "DELETE" }).catch(() => undefined);
      await Promise.all(
        items.map((item) =>
          fetch("/api/catalog/cart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: item.source, productId: item.productId, externalId: item.externalId, quantity: item.quantity, selectedColor: item.selectedColor, selectedSize: item.selectedSize }),
          }).catch(() => undefined),
        ),
      );
    })();
  }, [items, ready]);

  const addItem = useCallback((product: Product, quantity = 1, selection: CartSelection = {}) => {
    setItems((prev) => {
      const source = product.source ?? "Internal";
      const selectedColor = selection.selectedColor?.trim() || undefined;
      const selectedSize = selection.selectedSize?.trim() || undefined;
      const lineId = cartLineId(source, product.id, selectedColor, selectedSize);
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [
        ...prev,
        {
          source,
          lineId,
          productId: product.id,
          externalId: product.externalId,
          expectedUnitPrice: product.originalUnitPrice ?? product.priceRub,
          expectedCurrencyCode: product.originalCurrencyCode ?? "RUB",
          slug: product.slug,
          name: product.name,
          priceRub: product.priceRub,
          imageUrl: product.imageUrl,
          tint: product.tint,
          selectedColor,
          selectedSize,
          quantity,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.lineId !== lineId);
      }
      return prev.map((i) =>
        i.lineId === lineId ? { ...i, quantity } : i,
      );
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalRub = items.reduce((sum, i) => sum + i.priceRub * i.quantity, 0);
    return { items, itemCount, totalRub, addItem, removeItem, setQuantity, clear };
  }, [items, addItem, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

export function formatCartMoney(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
