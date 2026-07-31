import Link from "next/link";
import { cn } from "@/lib/utils";

export type PopularCategory = {
  id: string;
  title: string;
  caption: string;
  href: string;
  image: string;
  gradient: string;
};

export const POPULAR_CATEGORIES: PopularCategory[] = [
  {
    id: "figures",
    title: "Фигурки",
    caption: "Коллекционные издания",
    href: "/categories/figures",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/u1wfwyzi.mcf",
    gradient: "linear-gradient(135deg, #FCEAF1 0%, #F8EDF6 100%)",
  },
  {
    id: "tcg",
    title: "ККИ",
    caption: "Pokemon, One Piece, Yu-Gi-Oh",
    href: "/categories/tcg",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/a1w1bj2f.dob",
    gradient: "linear-gradient(135deg, #EDF5FF 0%, #F6FAFF 100%)",
  },
  {
    id: "clothing",
    title: "Одежда",
    caption: "Японские бренды",
    href: "/categories/women-fashion",
    image:
      "https://static.zenmarket.jp/images/misc/68b97d1e817449228714e72737459c2e/p1hps89dvil3doq91qfo5sl1ck8g.png",
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
    href: "/categories/instruments",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv",
    gradient: "linear-gradient(135deg, #EEF9F6 0%, #F8FCFB 100%)",
  },
];

type PopularCategoryCardProps = {
  category: PopularCategory;
};

export function PopularCategoryCard({ category }: PopularCategoryCardProps) {
  return (
    <Link
      href={category.href}
      className={cn(
        "group relative block h-[240px] min-w-[220px] flex-none snap-start overflow-hidden rounded-[28px]",
        "border border-[rgba(15,23,42,0.05)]",
        "shadow-[0_8px_24px_rgba(15,23,42,0.05)]",
        "transition-[transform,box-shadow] duration-[250ms] ease",
        "hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]",
        "sm:min-w-0 sm:flex-auto",
      )}
      style={{ background: category.gradient }}
    >
      <div className="relative z-10 flex h-full flex-col p-5 pr-4 sm:p-6">
        <p className="text-[13px] font-normal leading-[1.35] text-[rgba(17,17,17,0.70)] sm:text-sm">
          {category.caption}
        </p>
        <h3 className="mt-2 max-w-[62%] text-[clamp(24px,2vw,30px)] font-bold leading-[1.05] tracking-[-0.025em] text-[#111111]">
          {category.title}
        </h3>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={category.image}
        alt=""
        loading="lazy"
        className={cn(
          "pointer-events-none absolute right-[-4%] bottom-[-6%] z-0 h-[78%] w-[78%] object-contain object-right-bottom",
          "[filter:drop-shadow(0_8px_14px_rgba(15,23,42,0.08))]",
          "transition-transform duration-300 ease group-hover:scale-[1.025]",
        )}
      />
    </Link>
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
      <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
        <h2 className="flex items-center gap-3 text-[32px] font-bold tracking-tight text-[#111] sm:text-[40px]">
          <span
            className="inline-block h-[0.85em] w-1 shrink-0 rounded-full bg-[#F24676]"
            aria-hidden
          />
          Популярные категории
        </h2>
        <Link
          href="/#figures"
          className="group inline-flex shrink-0 items-center gap-1 text-[15px] text-[#666] transition-colors duration-200 hover:text-[#F24676]"
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

      {/* Mobile: horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:hidden [&::-webkit-scrollbar]:hidden">
        {POPULAR_CATEGORIES.map((category) => (
          <PopularCategoryCard key={category.id} category={category} />
        ))}
      </div>

      {/* Tablet / Desktop grid */}
      <div className="hidden gap-5 sm:grid sm:grid-cols-3 lg:grid-cols-5 lg:gap-6">
        {POPULAR_CATEGORIES.map((category) => (
          <PopularCategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
