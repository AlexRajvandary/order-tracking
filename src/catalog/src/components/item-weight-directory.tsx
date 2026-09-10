"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

export function ItemWeightDirectory() {
  const [category, setCategory] = useState<"all" | WeightCategoryId>("all");
  const resultsRef = useRef<HTMLDivElement>(null);
  const groups = category === "all"
    ? ITEM_WEIGHT_GROUPS
    : ITEM_WEIGHT_GROUPS.filter((group) => group.category === category);

  const count = groups.reduce((sum, group) => sum + group.items.length, 0);

  function selectCategory(next: "all" | WeightCategoryId) {
    setCategory(next);
    window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <>
      <section aria-label="Категории справочника" className="mt-8">
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
      </div>
    </>
  );
}
