"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PopularCategory = {
  id: string;
  title: string;
  caption: string;
  href: string;
  /** Optional — cards without photo use a soft color orb */
  image?: string;
  gradient: string;
  accent?: string;
};

export const POPULAR_CATEGORIES: PopularCategory[] = [
  {
    id: "figures",
    title: "Фигурки",
    caption: "Коллекционные издания",
    href: "/categories/figures",
    image: "/catalog-assets/popular-figures.png",
    gradient: "linear-gradient(135deg, #FCEAF1 0%, #F8EDF6 100%)",
  },
  {
    id: "tcg",
    title: "ККИ",
    caption: "Pokemon, One Piece, Yu-Gi-Oh",
    href: "/categories/tcg",
    image: "/catalog-assets/popular-tcg.png",
    gradient: "linear-gradient(135deg, #EDF5FF 0%, #F6FAFF 100%)",
  },
  {
    id: "clothing",
    title: "Одежда",
    caption: "Японские бренды",
    href: "/categories/clothing",
    image: "/catalog-assets/popular-clothing.png",
    gradient: "linear-gradient(135deg, #F2EDFF 0%, #F8F5FF 100%)",
  },
  {
    id: "bags",
    title: "Сумки",
    caption: "Luxury & Vintage",
    href: "/categories/bags",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/xfpgrn4u.jz2",
    gradient: "linear-gradient(135deg, #FFF3E8 0%, #FFF8F2 100%)",
  },
  {
    id: "electronics",
    title: "Электроника",
    caption: "Sony, Panasonic, Nintendo",
    href: "/categories/electronics",
    image:
      "/catalog-assets/popular-electronics.png",
    gradient: "linear-gradient(135deg, #EEF9F6 0%, #F8FCFB 100%)",
  },
  {
    id: "fishing",
    title: "Рыболовные снасти",
    caption: "Снасти и экипировка",
    href: "/categories/fishing",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/hyuw1ivd.3wq",
    gradient: "linear-gradient(135deg, #E8F4FC 0%, #F3F9FD 100%)",
    accent: "#3B82A0",
  },
  {
    id: "stationery",
    title: "Интерьер и канцелярия",
    caption: "Дом и бумага",
    href: "/categories/stationery",
    image:
      "/catalog-assets/stationery.png",
    gradient: "linear-gradient(135deg, #F3F0E8 0%, #FAF8F3 100%)",
    accent: "#A89B7A",
  },
  {
    id: "sports",
    title: "Спорт и отдых",
    caption: "Товары для спорта и активного отдыха",
    href: "/categories/sports",
    image: "/catalog-assets/popular-sports.png",
    gradient: "linear-gradient(135deg, #EAF5E4 0%, #F5FAF2 100%)",
    accent: "#5F8F4A",
  },
  {
    id: "books",
    title: "Манга и книги",
    caption: "Манга, новеллы, журналы",
    href: "/categories/books",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/ba5o0wae.4hs",
    gradient: "linear-gradient(135deg, #FCEEE8 0%, #FFF7F4 100%)",
    accent: "#C45C3E",
  },
  {
    id: "watches",
    title: "Часы",
    caption: "Seiko, Orient, Casio",
    href: "/categories/watches",
    image:
      "https://static.zenmarket.jp/images/misc/f6beb9e93e1248aaa55695fa600283d5/p1hpsu3j9nsdfu1uhkvaac6v912.png",
    gradient: "linear-gradient(135deg, #E8EEF5 0%, #F4F7FB 100%)",
    accent: "#4A5D73",
  },
  {
    id: "beauty",
    title: "Косметика и уход",
    caption: "Кожа, волосы, тело",
    href: "/categories/beauty",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs",
    gradient: "linear-gradient(135deg, #FCE8F0 0%, #FFF5F9 100%)",
    accent: "#C45A7A",
  },
  {
    id: "supplements",
    title: "БАДы и добавки",
    caption: "Красота и здоровье",
    href: "/categories/supplements",
    image:
      "/catalog-assets/popular-supplements.png",
    gradient: "linear-gradient(135deg, #E9F6F0 0%, #F4FBF7 100%)",
    accent: "#3D8F6E",
  },
  {
    id: "instruments",
    title: "Инструменты",
    caption: "Гитары, клавиши, DJ",
    href: "/categories/instruments",
    image:
      "/catalog-assets/popular-instruments.png",
    gradient: "linear-gradient(135deg, #FFF0E5 0%, #FFF8F2 100%)",
    accent: "#C67B3A",
  },
  {
    id: "games",
    title: "Игры",
    caption: "PC и консоли",
    href: "/categories/games",
    image: "/catalog-assets/popular-games.png",
    gradient: "linear-gradient(135deg, #E8F0FF 0%, #F3F7FF 100%)",
    accent: "#4A6FA5",
  },
];

type PopularCategoryCardProps = {
  category: PopularCategory;
  className?: string;
};

export function PopularCategoryCard({
  category,
  className,
}: PopularCategoryCardProps) {
  return (
    <Link
      href={category.href}
      className={cn(
        "group relative block h-full min-h-[270px] overflow-hidden rounded-2xl",
        "border border-[#e5e7eb] bg-[#ffffff]",
        "shadow-[0_2px_10px_rgba(15,23,42,0.03)]",
        "transition-[transform,box-shadow] duration-[250ms] ease",
        "hover:-translate-y-1 hover:border-[#f24676] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      <div className="relative z-10 flex h-full flex-col p-5 pr-4 sm:p-6">
        <ArrowUpRight className="absolute top-5 right-5 size-5 text-[#f24676] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:top-6 sm:right-6" />
        <h3 className="max-w-[78%] text-[clamp(19px,1.8vw,25px)] font-bold leading-[1.08] tracking-[-0.025em] text-[#111111]">
          {category.title}
        </h3>
        <p className="mt-2 max-w-[78%] text-[13px] leading-[1.4] text-[#666] sm:text-sm">
          {category.caption}
        </p>
      </div>

      {category.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={category.image}
          alt=""
          loading="lazy"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-[-2%] z-0 h-[62%] w-full object-contain object-center",
            category.id === "sports" && "bottom-[2%] h-[64%] scale-[1.02]",
            category.id === "instruments" &&
              "bottom-[-2%] h-[68%] scale-[1.08]",
            category.id === "games" &&
              "bottom-[-2%] h-[64%] scale-[1.02]",
            "[filter:drop-shadow(0_8px_14px_rgba(15,23,42,0.08))]",
            "transition-transform duration-300 ease group-hover:scale-[1.025]",
          )}
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-6 -bottom-10 z-0 size-[70%] rounded-full opacity-40 blur-2xl",
            "transition-transform duration-300 ease group-hover:scale-110",
          )}
          style={{ background: category.accent ?? "#94A3B8" }}
        />
      )}
    </Link>
  );
}

function DesktopTwoRowSlider({
  categories,
}: {
  categories: PopularCategory[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncNav = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncNav();
    el.addEventListener("scroll", syncNav, { passive: true });
    const ro = new ResizeObserver(syncNav);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncNav);
      ro.disconnect();
    };
  }, [syncNav, categories.length]);

  function scrollByPage(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative hidden sm:block">
      <div
        ref={scrollerRef}
        className={cn(
          "grid grid-flow-col grid-rows-2 gap-4 overflow-x-auto scroll-smooth md:gap-5 lg:gap-6",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "snap-x snap-mandatory",
          // 5 columns visible: each auto-column is 1/5 of track minus gaps
          "auto-cols-[calc((100%-1rem)/2)]",
          "md:auto-cols-[calc((100%-2.5rem)/3)]",
          "lg:auto-cols-[calc((100%-4.5rem)/4)]",
          "xl:auto-cols-[calc((100%-4.5rem)/4)]",
        )}
        style={{ gridTemplateRows: "repeat(2, minmax(210px, 1fr))" }}
      >
        {categories.map((category) => (
          <div key={category.id} className="min-w-0 snap-start">
            <PopularCategoryCard category={category} className="min-h-[270px]" />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Предыдущие категории"
        disabled={!canPrev}
        onClick={() => scrollByPage(-1)}
        className={cn(
          "absolute top-1/2 left-0 z-10 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-[#E5E7EB] bg-white text-[#111] shadow-md transition",
          "hover:bg-[#111] hover:text-white disabled:pointer-events-none disabled:opacity-0",
        )}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Следующие категории"
        disabled={!canNext}
        onClick={() => scrollByPage(1)}
        className={cn(
          "absolute top-1/2 right-0 z-10 flex size-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-[#E5E7EB] bg-white text-[#111] shadow-md transition",
          "hover:bg-[#111] hover:text-white disabled:pointer-events-none disabled:opacity-0",
        )}
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Progress bar like ZenMarket scrollbar */}
      <DesktopScrollProgress scrollerRef={scrollerRef} />
    </div>
  );
}

function DesktopScrollProgress({
  scrollerRef,
}: {
  scrollerRef: RefObject<HTMLDivElement | null>;
}) {
  const [progress, setProgress] = useState({ left: 0, width: 100 });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) {
        setProgress({ left: 0, width: 100 });
        return;
      }
      const width = Math.max(12, (el.clientWidth / el.scrollWidth) * 100);
      const left = (el.scrollLeft / max) * (100 - width);
      setProgress({ left, width });
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollerRef]);

  return (
    <div className="relative mx-auto mt-5 h-1 max-w-md overflow-hidden rounded-full bg-[#E5E7EB]">
      <div
        className="absolute top-0 h-full rounded-full bg-[#111827] transition-[left,width] duration-150"
        style={{ left: `${progress.left}%`, width: `${progress.width}%` }}
      />
    </div>
  );
}

type PopularCategoriesProps = {
  className?: string;
};

export function PopularCategories({ className }: PopularCategoriesProps) {
  return (
    <section
      aria-label="Популярные категории"
      className={cn(
        "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-10 sm:gap-4">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[24px] font-bold tracking-tight text-[#111] sm:gap-3 sm:text-[40px]">
          <span
            className="inline-block h-[0.85em] w-1 shrink-0 rounded-full bg-[#F24676]"
            aria-hidden
          />
          <span className="min-w-0 leading-tight">Популярные категории</span>
        </h2>
        <Link
          href="/#figures"
          className="group inline-flex shrink-0 items-center gap-1 text-[13px] text-[#666] transition-colors duration-200 hover:text-[#F24676] sm:text-[15px]"
        >
          Смотреть все
          <span
            aria-hidden
            className="inline-block transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>

      {/* Mobile: two-column category grid */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {POPULAR_CATEGORIES.map((category) => (
          <PopularCategoryCard
            key={category.id}
            category={category}
            className="min-h-[230px] rounded-2xl"
          />
        ))}
      </div>

      {/* Desktop / tablet: 2-row slider */}
      <DesktopTwoRowSlider categories={POPULAR_CATEGORIES} />
    </section>
  );
}
