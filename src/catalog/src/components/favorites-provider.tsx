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
  ready: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string, product?: CatalogProduct) => void;
  clear: () => void;
};

const STORAGE_KEY = "the-get-catalog-favorites";

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

type StoredFavorites = {
  ids: string[];
  products: Record<string, CatalogProduct>;
};

function loadFavorites(): StoredFavorites {
  if (typeof window === "undefined") {
    return { ids: [], products: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ids: [], products: {} };
    }
    const parsed = JSON.parse(raw) as string[] | Partial<StoredFavorites>;
    if (Array.isArray(parsed)) {
      return {
        ids: parsed.filter((id) => typeof id === "string"),
        products: {},
      };
    }

    const ids = Array.isArray(parsed.ids)
      ? parsed.ids.filter((id): id is string => typeof id === "string")
      : [];
    const products = parsed.products && typeof parsed.products === "object"
      ? parsed.products
      : {};
    return { ids, products };
  } catch {
    return { ids: [], products: {} };
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Record<string, CatalogProduct>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const local = loadFavorites();
      try {
        const response = await fetch("/api/catalog/favorites", { cache: "no-store" });
        const serverIds = response.ok ? ((await response.json()) as string[]) : [];
        if (!cancelled) {
          const nextIds = serverIds.length > 0 ? serverIds : local.ids;
          setIds(nextIds);
          setProducts(Object.fromEntries(
            nextIds.flatMap((id) => local.products[id] ? [[id, local.products[id]]] : []),
          ));
        }
      } catch {
        if (!cancelled) {
          setIds(local.ids);
          setProducts(local.products);
        }
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
    const persistedProducts = Object.fromEntries(
      ids.flatMap((id) => products[id] ? [[id, products[id]]] : []),
    );
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ids, products: persistedProducts } satisfies StoredFavorites),
    );
  }, [ids, products, ready]);

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

  const clear = useCallback(() => {
    setIds([]);
    setProducts({});
    void fetch("/api/catalog/favorites", { method: "DELETE" }).catch(() => undefined);
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, products, ready, has, toggle, clear }),
    [ids, products, ready, has, toggle, clear],
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
