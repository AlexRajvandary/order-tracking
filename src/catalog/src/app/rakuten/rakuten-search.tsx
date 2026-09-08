"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/components/cart-provider";
import type { CatalogProduct } from "@/lib/catalog-products";

type ExternalItem = { id: string; externalId: string; name: string; description?: string; price: number; currencyCode: string; imageUrl?: string; sourceUrl?: string; affiliateUrl?: string; shopName?: string; available: boolean };
type Result = { items: ExternalItem[]; page: number; totalPages: number; total: number };

function map(item: ExternalItem): CatalogProduct {
  return { id: item.id, slug: item.id, source: "Rakuten", externalId: item.externalId,
    originalUnitPrice: item.price, originalCurrencyCode: item.currencyCode,
    name: item.name, category: "Rakuten", sectionId: "rakuten", categorySlug: "rakuten",
    priceRub: item.currencyCode === "JPY" ? Math.round(item.price / 1.6) : item.price, currency: "RUB",
    shortDescription: item.description || item.name, description: item.description || item.name,
    tags: [], tint: "#bf0000", inStock: item.available, imageUrl: item.imageUrl,
    sourceUrl: item.sourceUrl, affiliateUrl: item.affiliateUrl, shopName: item.shopName };
}

export function RakutenSearch() {
  const [keyword, setKeyword] = useState(""); const [result, setResult] = useState<Result>();
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const { addItem } = useCart();
  async function search(page = 1) {
    if (!keyword.trim()) return; setLoading(true); setError("");
    try { const response = await fetch(`/api/catalog-rakuten?keyword=${encodeURIComponent(keyword)}&page=${page}&pageSize=20`);
      const text = await response.text(); let data: Result & { detail?: string; title?: string };
      try { data = JSON.parse(text) as Result & { detail?: string; title?: string }; }
      catch { throw new Error(`Сервер вернул некорректный ответ (HTTP ${response.status})`); }
      if (!response.ok) throw new Error(data.detail || data.title || "Поиск недоступен"); setResult(data); }
    catch (e) { setError(e instanceof Error ? e.message : "Поиск недоступен"); } finally { setLoading(false); }
  }
  return <div className="space-y-8">
    <form className="flex gap-3" onSubmit={e => { e.preventDefault(); void search(); }}>
      <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Найти товар на Rakuten"
        className="h-11 flex-1 border border-input bg-white px-4 outline-none focus:ring-2 focus:ring-[#bf0000]/30" />
      <Button type="submit" disabled={loading || !keyword.trim()}>{loading ? "Ищем…" : "Найти"}</Button>
    </form>
    {error ? <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {result ? <><p className="text-sm text-muted-foreground">Найдено: {result.total}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{result.items.map(raw => { const product = map(raw); return <div key={raw.id} className="space-y-2"><ProductCard product={product} /><Button className="w-full" disabled={!raw.available} onClick={() => addItem(product)}>В корзину</Button></div>; })}</div>
      <div className="flex items-center justify-center gap-4"><Button variant="outline" disabled={loading || result.page <= 1} onClick={() => void search(result.page - 1)}>Назад</Button><span>{result.page} / {result.totalPages}</span><Button variant="outline" disabled={loading || result.page >= result.totalPages} onClick={() => void search(result.page + 1)}>Далее</Button></div></> : null}
  </div>;
}
