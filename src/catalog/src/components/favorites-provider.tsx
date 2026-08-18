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
import type { CatalogProduct } from "@/lib/catalog-products";

type FavoritesContextValue = {
  ids: string[];
  products: Record<string, CatalogProduct>;
  has: (productId: string) => boolean;
  toggle: (productId: string, product?: CatalogProduct) => void;
};

const STORAGE_KEY = "the-get-catalog-favorites";

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function loadFavorites(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Record<string, CatalogProduct>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const localIds = loadFavorites();
      try {
        const response = await fetch("/api/catalog/favorites", { cache: "no-store" });
        const serverIds = response.ok ? ((await response.json()) as string[]) : [];
        if (!cancelled) setIds(serverIds.length > 0 ? serverIds : localIds);
      } catch {
        if (!cancelled) setIds(localIds);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, ready]);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  const toggle = useCallback((productId: string, product?: CatalogProduct) => {
    const favorite = !ids.includes(productId);
    setIds((prev) =>
      favorite ? [...prev, productId] : prev.filter((id) => id !== productId),
    );
    if (favorite && product) {
      setProducts((prev) => ({ ...prev, [productId]: product }));
    } else if (!favorite) {
      setProducts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
    void fetch(`/api/catalog/favorites`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, favorite }),
    }).catch(() => undefined);
  }, [ids]);

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, products, has, toggle }),
    [ids, products, has, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
