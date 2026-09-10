import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ItemWeightDirectory } from "@/components/item-weight-directory";
import { NavigationBackButton } from "@/components/navigation-back-button";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Примерный вес товаров из Японии — The Get",
  description: "Ориентировочный вес одежды, обуви, сумок, аксессуаров, электроники и других товаров для примерной оценки доставки.",
};

export default function ItemWeightPage() {
  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <NavigationBackButton label="Назад к товару" fallbackHref="/" className="mb-5 -ml-2" />
        <section className="grid min-w-0 items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)] lg:gap-12">
          <div className="min-w-0">
            <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Главная</Link>
              <span aria-hidden className="mx-2">/</span>
              <span aria-current="page">Примерный вес товаров</span>
            </nav>

            <header className="mt-7 max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-5xl">Примерный вес товаров</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">Справочник поможет примерно оценить вес товара до оформления заказа.</p>
            </header>
          </div>

          <div className="hidden min-w-0 justify-end md:flex">
            <Image
              src="/catalog-assets/item-weight-hero.png"
              alt="Коробка на весах"
              width={420}
              height={420}
              priority
              className="h-auto w-full max-w-[250px] object-contain lg:max-w-[330px]"
            />
          </div>
               </section>

        <ItemWeightDirectory />
      </main>
    </div>
  );
}
