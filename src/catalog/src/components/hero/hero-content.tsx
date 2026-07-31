import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroBenefits } from "@/components/hero/hero-benefits";
import styles from "@/components/hero/hero-v2.module.css";

export function HeroContent() {
  return (
    <>
      {/* Frosted panel only behind badge / heading / description */}
      <div className={styles.heroTextPanel}>
        <div className={styles.heroTextBackdrop} aria-hidden />
        <div className={styles.heroTextInner}>
          <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(17,17,17,0.07)] bg-[rgba(255,255,255,0.78)] px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#4A4A4A] uppercase sm:mb-[14px] sm:text-xs">
            <span
              className="size-1.5 shrink-0 rounded-full bg-[#F24676]"
              aria-hidden
            />
            Япония
          </span>

          <h1 className="m-0 max-w-[min(100%,330px)] text-[clamp(28px,8.5vw,40px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-[#111111] sm:max-w-none sm:text-[clamp(40px,4.5vw,46px)] lg:text-[clamp(38px,3.1vw,50px)] lg:[text-shadow:0_1px_12px_rgba(255,255,255,0.85)]">
            <span className="block">Оригинальные</span>
            <span className="block sm:whitespace-nowrap">
              товары из <span className="text-[#F24676]">Японии</span>
            </span>
          </h1>

          <p className="mt-3 max-w-[min(100%,330px)] text-[14px] leading-[1.45] text-[#4F4F4F] sm:mt-4 sm:max-w-[460px] sm:text-base lg:[text-shadow:0_1px_10px_rgba(255,255,255,0.9)]">
            Миллионы товаров из Японии с доставкой в Россию. Поможем найти,
            выкупить и безопасно привезти практически всё.
          </p>
        </div>
      </div>

      {/* Mobile: pinned to hero bottom via flex; desktop: normal spacing */}
      <div className={`${styles.heroCtaPanel} ${styles.heroCtaAnchor}`}>
        <div className={styles.heroCtaBackdrop} aria-hidden />
        <div className={styles.heroTextInner}>
          <Link
            href="/#figures"
            className="inline-flex h-[52px] w-full max-w-full items-center justify-center gap-3 rounded-[11px] bg-[#F24676] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(242,70,118,0.16)] transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-[#DC3565] hover:shadow-[0_10px_24px_rgba(242,70,118,0.22)] active:translate-y-0 sm:h-12 sm:w-auto sm:min-w-[230px] sm:gap-4 sm:px-[26px]"
          >
            Перейти в каталог
            <ArrowRight
              className="size-4 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </div>
      </div>

      {/* Benefits outside frosted panels — container stays vivid behind */}
      <HeroBenefits className="mt-[22px] w-full lg:mt-[18px]" />
    </>
  );
}
