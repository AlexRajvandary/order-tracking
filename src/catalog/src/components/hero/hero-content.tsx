import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroBenefits } from "@/components/hero/hero-benefits";

export function HeroContent() {
  return (
    <>
      <span className="mb-[14px] inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(17,17,17,0.07)] bg-[rgba(255,255,255,0.78)] px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#4A4A4A] uppercase sm:text-xs">
        <span className="size-1.5 shrink-0 rounded-full bg-[#F24676]" aria-hidden />
        Япония
      </span>

      <h1 className="m-0 max-w-[330px] text-[clamp(34px,10vw,42px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#111111] [text-shadow:0_1px_12px_rgba(255,255,255,0.85)] sm:max-w-none sm:text-[clamp(40px,4.5vw,46px)] lg:text-[clamp(38px,3.1vw,50px)]">
        <span className="block">Оригинальные</span>
        <span className="block whitespace-nowrap">
          товары из <span className="text-[#F24676]">Японии</span>
        </span>
      </h1>

      <p className="mt-4 max-w-[330px] text-[15px] leading-[1.45] text-[#4F4F4F] [text-shadow:0_1px_10px_rgba(255,255,255,0.9)] sm:mt-4 sm:max-w-[460px] sm:text-base">
        Миллионы товаров из Японии с доставкой в Россию. Поможем найти, выкупить и
        безопасно привезти практически всё.
      </p>

      <Link
        href="/#figures"
        className="mt-5 inline-flex h-12 w-full min-w-0 items-center justify-center gap-4 rounded-[11px] bg-[#F24676] px-[26px] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(242,70,118,0.16)] transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-[#DC3565] hover:shadow-[0_10px_24px_rgba(242,70,118,0.22)] active:translate-y-0 sm:w-auto sm:min-w-[230px]"
      >
        Перейти в каталог
        <ArrowRight className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      </Link>

      <HeroBenefits className="mt-[18px]" />
    </>
  );
}
