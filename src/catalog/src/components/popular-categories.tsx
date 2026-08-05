import Link from "next/link";
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
  // --- добавлены из Popular Categories (без дублей одежда / сумки / TCG / аниме≈фигурки) ---
  {
    id: "fishing",
    title: "Рыболовные снасти",
    caption: "Снасти и экипировка",
    href: "/categories/sports",
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
      "https://static.zenmarket.jp/images/misc/f6c6cb508ddb40bda9aebf81f3baa944/p1hr8dgot11nqc17ns2el1pplfcl5.png",
    gradient: "linear-gradient(135deg, #F3F0E8 0%, #FAF8F3 100%)",
    accent: "#A89B7A",
  },
  {
    id: "matcha",
    title: "Чай матча",
    caption: "Порошок и чай",
    href: "/categories/beauty",
    gradient: "linear-gradient(135deg, #EAF5E4 0%, #F5FAF2 100%)",
    accent: "#5F8F4A",
  },
  {
    id: "retro-consoles",
    title: "Ретро-консоли",
    caption: "Классика игр",
    href: "/categories/instruments",
    gradient: "linear-gradient(135deg, #ECE8F7 0%, #F6F4FB 100%)",
    accent: "#6B5B95",
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
    id: "vinyl",
    title: "Пластинки",
    caption: "LP и винил",
    href: "/categories/instruments",
    gradient: "linear-gradient(135deg, #F5E9EC 0%, #FBF4F6 100%)",
    accent: "#9B4D6A",
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
    href: "/categories/beauty",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt",
    gradient: "linear-gradient(135deg, #E9F6F0 0%, #F4FBF7 100%)",
    accent: "#3D8F6E",
  },
  {
    id: "instruments",
    title: "Инструменты",
    caption: "Гитары, клавиши, DJ",
    href: "/categories/instruments",
    image:
      "https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx",
    gradient: "linear-gradient(135deg, #FFF0E5 0%, #FFF8F2 100%)",
    accent: "#C67B3A",
  },
  {
    id: "cameras",
    title: "Камеры",
    caption: "Фото и оптика",
    href: "/categories/instruments",
    gradient: "linear-gradient(135deg, #E9EDF2 0%, #F5F7FA 100%)",
    accent: "#5A6A7A",
  },
  {
    id: "snacks",
    title: "Снеки и сладости",
    caption: "KitKat и сладости",
    href: "/categories/beauty",
    gradient: "linear-gradient(135deg, #FFF0E8 0%, #FFF8F3 100%)",
    accent: "#D4895A",
  },
  {
    id: "games",
    title: "Игры",
    caption: "PC и консоли",
    href: "/categories/tcg",
    gradient: "linear-gradient(135deg, #E8F0FF 0%, #F3F7FF 100%)",
    accent: "#4A6FA5",
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
        "group relative block h-[220px] min-w-[min(78vw,260px)] flex-none snap-start overflow-hidden rounded-[24px] sm:h-[240px] sm:min-w-[220px] sm:rounded-[28px]",
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
        <h3 className="mt-2 max-w-[70%] text-[clamp(22px,2vw,28px)] font-bold leading-[1.05] tracking-[-0.025em] text-[#111111]">
          {category.title}
        </h3>
      </div>

      {category.image ? (
        // eslint-disable-next-line @next/next/no-img-element
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

      {/* Mobile: horizontal scroll */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:mx-0 sm:hidden sm:px-0 [&::-webkit-scrollbar]:hidden">
        {POPULAR_CATEGORIES.map((category) => (
          <PopularCategoryCard key={category.id} category={category} />
        ))}
      </div>

      {/* Tablet / Desktop grid */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5 lg:gap-6">
        {POPULAR_CATEGORIES.map((category) => (
          <PopularCategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
