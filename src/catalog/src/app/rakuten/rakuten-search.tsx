"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { mapRakutenProductToCatalog, type ApiExternalProduct } from "@/lib/products-api";

type Result = { items: ApiExternalProduct[]; page: number; totalPages: number; total: number };

export function RakutenSearch({ initialKeyword = "" }: { initialKeyword?: string }) {
  const [keyword, setKeyword] = useState(initialKeyword); const [result, setResult] = useState<Result>();
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function search(page = 1) {
    if (!keyword.trim()) return; setLoading(true); setError("");
    try { const response = await fetch(`/api/catalog-rakuten?keyword=${encodeURIComponent(keyword)}&page=${page}&pageSize=20`);
      const text = await response.text(); let data: Result & { detail?: string; title?: string };
      try { data = JSON.parse(text) as Result & { detail?: string; title?: string }; }
      catch { throw new Error(`Сервер вернул некорректный ответ (HTTP ${response.status})`); }
      if (!response.ok) throw new Error(data.detail || data.title || "Поиск недоступен"); setResult(data); }
    catch (e) { setError(e instanceof Error ? e.message : "Поиск недоступен"); } finally { setLoading(false); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { if (initialKeyword.trim()) void search(1); }, 0);
    return () => window.clearTimeout(timer);
    // The initial URL query is intentionally executed once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="space-y-8">
    <form className="flex gap-3" onSubmit={e => { e.preventDefault(); void search(); }}>
      <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Найти товар на Rakuten"
        className="h-11 flex-1 border border-input bg-white px-4 outline-none focus:ring-2 focus:ring-[#bf0000]/30" />
      <Button type="submit" disabled={loading || !keyword.trim()}>{loading ? "Ищем…" : "Найти"}</Button>
    </form>
    {error ? <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {result ? <><p className="text-sm text-muted-foreground">Найдено: {result.total}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{result.items.map(raw => { const product = mapRakutenProductToCatalog(raw); return <ProductCard key={raw.id} product={product} />; })}</div>
      <div className="flex items-center justify-center gap-4"><Button variant="outline" disabled={loading || result.page <= 1} onClick={() => void search(result.page - 1)}>Назад</Button><span>{result.page} / {result.totalPages}</span><Button variant="outline" disabled={loading || result.page >= result.totalPages} onClick={() => void search(result.page + 1)}>Далее</Button></div></> : null}
  </div>;
}
