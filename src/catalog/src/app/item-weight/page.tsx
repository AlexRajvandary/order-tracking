import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { ItemWeightDirectory } from "@/components/item-weight-directory";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Примерный вес товаров из Японии — The Get",
  description: "Ориентировочный вес одежды, обуви, сумок, аксессуаров, электроники и других товаров для примерной оценки доставки.",
};

export default async function ItemWeightPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Главная</Link>
          <span aria-hidden className="mx-2">/</span>
          <span aria-current="page">Примерный вес товаров</span>
        </nav>

        <header className="mt-7 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-5xl">Примерный вес товаров</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">Справочник поможет примерно оценить вес товара до оформления заказа.</p>
        </header>

        <div className="mt-7 flex max-w-4xl gap-3 rounded-2xl border border-[#D8DEE6] bg-[#EEF2F6] p-4 text-sm leading-6 text-[#4B5563] sm:p-5">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-[#3F4652]" />
          <p>Указанный вес является ориентировочным. Фактический вес товара может отличаться в зависимости от размера, материала, модели, комплектации и упаковки магазина.</p>
        </div>

        <ItemWeightDirectory initialQuery={q?.slice(0, 120) ?? ""} />
      </main>
    </div>
  );
}
