"use client";

import Link from "next/link";
import { ArrowRight, Shirt, Tag } from "lucide-react";
import { useState } from "react";
import { categoryHref, type ApiCategory } from "@/lib/categories-api";

type FashionCategory = Pick<ApiCategory, "id" | "name" | "slug" | "description" | "imageUrl">;

type FashionCategorySectionProps = {
  title: string;
  subtitle: string;
  rootSlug: string;
  categories: FashionCategory[];
};

function iconForCategory(name: string) {
  return /кимон|одеж|куртк/i.test(name) ? Shirt : Tag;
}

export function FashionCategorySection({ title, subtitle, rootSlug, categories }: FashionCategorySectionProps) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const active = categories.find((category) => category.id === activeId) ?? categories[0];
  if (!active) return null;

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-[22px] font-bold tracking-tight text-[#111] sm:gap-3 sm:text-[30px]"><span className="inline-block h-[0.85em] w-1 shrink-0 rounded-full bg-[#F24676]" aria-hidden />{title}</h2>
          <p className="mt-1 text-sm text-[#666] sm:mt-2 sm:text-base">{subtitle}</p>
        </div>
        <Link href={categoryHref(rootSlug)} className="group inline-flex shrink-0 items-center gap-1 text-[13px] text-[#666] transition-colors hover:text-[#F24676] sm:text-[15px]">Смотреть все <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:grid-cols-[minmax(210px,0.34fr)_minmax(0,1fr)]">
        <nav className="hidden p-3 lg:block" aria-label={title}>
          <p className="px-3 pb-2 pt-2 text-[10px] font-semibold tracking-[0.14em] text-[#999] uppercase">Категории</p>
          <div className="space-y-1">{categories.map((category) => { const Icon = iconForCategory(category.name); const isActive = active.id === category.id; return <Link key={category.id} href={categoryHref(rootSlug, category.slug)} onMouseEnter={() => setActiveId(category.id)} onFocus={() => setActiveId(category.id)} className={`group flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm transition-colors ${isActive ? "bg-[#fff0f4] text-[#f24676]" : "text-[#222] hover:bg-[#fafafa]"}`}><Icon className="size-5 shrink-0" /><span className="min-w-0 flex-1 truncate font-medium">{category.name}</span><ArrowRight className={`size-4 shrink-0 transition-transform group-hover:translate-x-1 ${isActive ? "text-[#f24676]" : "text-[#222]"}`} /></Link>; })}</div>
        </nav>

        <div className="min-w-0 bg-[#f1f3f4]">
          <div className="grid min-h-[360px] lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-[1fr_auto]">
            <div className="relative min-h-[250px] overflow-hidden bg-[#dfe7e9] lg:min-h-[360px]">
              {active.imageUrl ? <img key={active.id} src={active.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#dcecf1] to-[#f7fafb]" aria-hidden />}
            </div>
            <div className="flex flex-col justify-center bg-[linear-gradient(135deg,#f8fafb_0%,#eef1f3_100%)] p-7 sm:p-10 lg:p-12"><h3 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">{active.name}</h3><p className="mt-4 max-w-xs text-sm leading-6 text-[#555]">{active.description || subtitle}</p><Link href={categoryHref(rootSlug, active.slug)} className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-[#17191d] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#f24676]">Смотреть товары <ArrowRight className="size-4" /></Link></div>
          </div>

          <div className="flex gap-3 overflow-x-auto border-t border-[#e5e7eb] bg-white p-3 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => { const isActive = active.id === category.id; return <Link key={category.id} href={categoryHref(rootSlug, category.slug)} onClick={() => setActiveId(category.id)} className={`flex min-w-[170px] items-center gap-3 rounded-xl border p-3 transition-colors ${isActive ? "border-[#f6b3c4] bg-[#fff0f4]" : "border-[#e5e7eb] bg-white"}`}><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f6f7] text-[#f24676]"><Tag className="size-4" /></span><span className="min-w-0 truncate text-sm font-medium">{category.name}</span><ArrowRight className="ml-auto size-4 shrink-0" /></Link>; })}
          </div>
        </div>
      </div>
    </section>
  );
}
