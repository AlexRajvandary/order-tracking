"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ITEM_WEIGHT_GROUPS,
  WEIGHT_CATEGORIES,
  type WeightCategoryId,
  type WeightItem,
  type WeightValue,
} from "@/data/item-weights";
import { cn } from "@/lib/utils";

function formatWeight(value: WeightValue | undefined) {
  if (!value) return "—";
  return value.replace(/^(\d+(?:–\d+)?)(.*)$/, "$1 г$2");
}

function GenderValues({ item }: { item: WeightItem }) {
  return (
    <>
      <span><span className="text-muted-foreground md:hidden">Мужские: </span>{formatWeight(item.male)}</span>
      <span><span className="text-muted-foreground md:hidden">Женские: </span>{formatWeight(item.female)}</span>
      <span><span className="text-muted-foreground md:hidden">Детские: </span>{formatWeight(item.child)}</span>
    </>
  );
}

export function ItemWeightDirectory({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<"all" | WeightCategoryId>("all");
  const resultsRef = useRef<HTMLDivElement>(null);
  const normalized = query.trim().toLocaleLowerCase("ru-RU");

  const groups = useMemo(() => ITEM_WEIGHT_GROUPS.flatMap((group) => {
    if (category !== "all" && group.category !== category) return [];
    const categoryLabel = WEIGHT_CATEGORIES.find((item) => item.id === group.category)?.label ?? "";
    const wholeGroupMatches = normalized && `${categoryLabel} ${group.title}`.toLocaleLowerCase("ru-RU").includes(normalized);
    const items = !normalized || wholeGroupMatches
      ? group.items
      : group.items.filter((item) => item.name.toLocaleLowerCase("ru-RU").includes(normalized));
    return items.length ? [{ ...group, items }] : [];
  }), [category, normalized]);

  const count = groups.reduce((sum, group) => sum + group.items.length, 0);

  function selectCategory(next: "all" | WeightCategoryId) {
    setCategory(next);
    window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <>
      <section aria-label="Поиск по справочнику" className="mt-8 space-y-5">
        <div className="relative max-w-2xl">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти товар, например джинсы или рюкзак"
            aria-label="Найти товар"
            className="h-11 rounded-xl bg-background pr-11 pl-10"
          />
          {query ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Очистить поиск" onClick={() => setQuery("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full">
              <X />
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Категории товаров">
          {WEIGHT_CATEGORIES.map((item) => (
            <Button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              variant={category === item.id ? "default" : "outline"}
              className="h-9 rounded-full px-4"
              onClick={() => selectCategory(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      <div ref={resultsRef} className="scroll-mt-6 pt-8">
        <p className="mb-5 text-sm tabular-nums text-muted-foreground">Найдено позиций: {count}</p>
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-5 py-16 text-center">
            <p className="font-medium">Ничего не найдено. Попробуйте изменить запрос.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group, groupIndex) => {
              const headingId = `weight-${group.category}-${groupIndex}`;
              return (
              <section key={`${group.category}-${group.title}`} aria-labelledby={headingId} className="overflow-hidden rounded-2xl border bg-background">
                <div className="border-b bg-muted/35 px-5 py-4 sm:px-6">
                  <h2 id={headingId} className="text-lg font-semibold">{group.title}</h2>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-background text-left text-muted-foreground">
                      <tr className="border-b">
                        <th scope="col" className="w-[46%] px-6 py-3 font-medium">Тип товара</th>
                        {group.gendered ? <><th scope="col" className="px-4 py-3 font-medium">Мужские</th><th scope="col" className="px-4 py-3 font-medium">Женские</th><th scope="col" className="px-4 py-3 font-medium">Детские</th></> : <th scope="col" className="px-6 py-3 text-right font-medium">Примерный вес</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {group.items.map((item) => (
                        <tr key={item.name} className="transition-colors hover:bg-muted/25">
                          <th scope="row" className="px-6 py-3.5 text-left font-medium">{item.name}</th>
                          {group.gendered ? <><td className="px-4 py-3.5 tabular-nums">{formatWeight(item.male)}</td><td className="px-4 py-3.5 tabular-nums">{formatWeight(item.female)}</td><td className="px-4 py-3.5 tabular-nums">{formatWeight(item.child)}</td></> : <td className="px-6 py-3.5 text-right font-medium tabular-nums">{formatWeight(item.weight)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y md:hidden">
                  {group.items.map((item) => (
                    <article key={item.name} className="px-5 py-4">
                      <h3 className="font-medium">{item.name}</h3>
                      <div className={cn("mt-2 text-sm tabular-nums", group.gendered ? "grid grid-cols-1 gap-1" : "font-semibold")}>
                        {group.gendered ? <GenderValues item={item} /> : formatWeight(item.weight)}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
