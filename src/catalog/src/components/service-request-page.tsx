import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { StorefrontAnnouncement } from "@/components/storefront-announcement";
import { fetchStorefrontAnnouncement } from "@/lib/storefront-announcement-api";

export async function ServiceRequestPage({
  title,
  description,
  hint,
  children,
}: {
  title: string;
  description: string;
  hint?: string;
  children: ReactNode;
}) {
  const announcement = await fetchStorefrontAnnouncement();

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <SiteHeader />
      <StorefrontAnnouncement text={announcement?.text} />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2"
          render={<Link href="/" />}
        >
          <ArrowLeft aria-hidden />
          Назад на главную
        </Button>
        <header className="mb-8 sm:mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#111] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
          {hint ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
