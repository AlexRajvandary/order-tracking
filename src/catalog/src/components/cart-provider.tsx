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

export type CartItem = {
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
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalRub: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "the-get-catalog-cart";

const CartContext = createContext<CartContextValue | null>(null);

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
    return Array.isArray(parsed) ? parsed.map(i => ({ ...i, source: i.source ?? "Internal", expectedUnitPrice: i.expectedUnitPrice ?? i.priceRub, expectedCurrencyCode: i.expectedCurrencyCode ?? "RUB" })) : [];
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
        const serverItems = rawServerItems.map((value) => ({
          source: (value.source as "Internal" | "Rakuten") ?? "Internal",
          productId: String(value.productId ?? value.id), externalId: value.externalId ? String(value.externalId) : undefined,
          slug: String(value.slug ?? value.id), name: String(value.name ?? ""),
          priceRub: String(value.currencyCode) === "JPY" ? Math.round(Number(value.price) / 1.6) : Number(value.price),
          expectedUnitPrice: Number(value.price), expectedCurrencyCode: String(value.currencyCode ?? "RUB"),
          imageUrl: value.imageUrl ? String(value.imageUrl) : undefined, tint: "#0f3d4c", quantity: Number(value.quantity),
        }));
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
            body: JSON.stringify({ source: item.source, productId: item.productId, externalId: item.externalId, quantity: item.quantity }),
          }).catch(() => undefined),
        ),
      );
    })();
  }, [items, ready]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const source = product.source ?? "Internal";
      const existing = prev.find((i) => i.productId === product.id && i.source === source);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && i.source === source
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [
        ...prev,
        {
          source,
          productId: product.id,
          externalId: product.externalId,
          expectedUnitPrice: product.originalUnitPrice ?? product.priceRub,
          expectedCurrencyCode: product.originalCurrencyCode ?? "RUB",
          slug: product.slug,
          name: product.name,
          priceRub: product.priceRub,
          imageUrl: product.imageUrl,
          tint: product.tint,
          quantity,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }
      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
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
