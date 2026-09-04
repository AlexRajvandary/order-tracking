import type { Metadata } from "next";
import { IndividualRequestForm } from "@/components/individual-request-form";
import { SiteHeader } from "@/components/site-header";
import { StorefrontAnnouncement } from "@/components/storefront-announcement";
import { fetchStorefrontAnnouncement } from "@/lib/storefront-announcement-api";

export const metadata: Metadata = {
  title: "Индивидуальный запрос",
  description:
    "Оставьте заявку на поиск и выкуп товара из Японии, которого нет в каталоге The Get.",
};

export default async function IndividualRequestPage() {
  const announcement = await fetchStorefrontAnnouncement();

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      <StorefrontAnnouncement text={announcement?.text} />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">
            Индивидуальный запрос
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Не нашли нужный товар в каталоге? Оставьте заявку — мы попробуем найти
            и выкупить его для вас в Японии.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Пришлите ссылку, название или просто опишите, что вы ищете.
          </p>
        </header>
        <IndividualRequestForm />
      </div>
    </div>
  );
}
