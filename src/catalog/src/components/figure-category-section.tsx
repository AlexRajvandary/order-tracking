"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Scrollbar, A11y } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/scrollbar";
import type { CategoryItem } from "@/lib/categories";
import { categoryHref } from "@/lib/categories-api";

type FigureCategorySectionProps = {
  items: CategoryItem[];
  sectionId: string;
  title?: string;
  allLabel?: string;
};

export function FigureCategorySection({
  items,
  sectionId,
  title = "Фигурки",
  allLabel = "Все фигурки",
}: FigureCategorySectionProps) {
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);

  return (
    <section aria-labelledby={`${sectionId}-section-title`} className="w-full">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-0">
        <div className="mb-0 flex items-center justify-between gap-4 sm:mb-1">
          <h2
            id={`${sectionId}-section-title`}
            className="flex min-w-0 items-center gap-3 text-[28px] font-bold leading-[1.15] tracking-tight text-[#111] sm:text-[32px]"
          >
            <span className="inline-block h-8 w-1 shrink-0 rounded-full bg-[#F24676]" aria-hidden />
            <span>{title}</span>
          </h2>
          <Link
            href={`/categories/${sectionId}`}
            className="group inline-flex shrink-0 items-center gap-3 text-base font-medium text-[#666] transition-colors duration-200 hover:text-[#F24676]"
          >
            {allLabel}
            <span aria-hidden className="text-2xl leading-none transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="relative">
          <Swiper
            modules={[Navigation, Scrollbar, A11y]}
            loop={items.length > 1}
            loopAdditionalSlides={items.length}
            watchSlidesProgress
            spaceBetween={16}
            slidesPerView={3}
            breakpoints={{
              480: { slidesPerView: 3, spaceBetween: 20 },
              768: { slidesPerView: 3, spaceBetween: 28 },
              1024: { slidesPerView: 5, spaceBetween: 36 },
              1280: { slidesPerView: 6, spaceBetween: 48 },
            }}
            scrollbar={{ draggable: true, hide: false }}
            onSwiper={setSwiper}
            className="figure-swiper sm:-mt-5"
          >
            {[...items, ...items, ...items].map((item, index) => (
              <SwiperSlide key={`${item.id}-${index}`}>
                <Link
                  href={categoryHref(sectionId, item.slug)}
                  className="group flex w-full flex-col items-center"
                >
                  <span className="flex h-[150px] w-full items-end justify-center sm:h-[220px] lg:h-[230px] xl:h-[260px]">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        className="max-h-[140px] max-w-full object-contain object-bottom transition-transform duration-[250ms] ease-out group-hover:scale-[1.04] sm:max-h-[205px] lg:max-h-[215px] xl:max-h-[240px]"
                      />
                    ) : null}
                  </span>
                  <span className="mt-5 flex min-h-[42px] items-start justify-center text-center text-sm font-semibold leading-[1.3] text-[#111] transition-colors duration-200 group-hover:text-[#F24676] sm:text-base">
                    {item.label}
                  </span>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            aria-label="Предыдущие категории"
            onClick={() => swiper?.slidePrev()}
            className="absolute top-[115px] left-0 z-10 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#111] shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition hover:text-[#F24676] hover:shadow-[0_6px_18px_rgba(0,0,0,0.1)] sm:flex sm:top-[135px] lg:top-[140px] xl:top-[155px]"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Следующие категории"
            onClick={() => swiper?.slideNext()}
            className="absolute top-[115px] right-0 z-10 hidden size-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#111] shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition hover:text-[#F24676] hover:shadow-[0_6px_18px_rgba(0,0,0,0.1)] sm:flex sm:top-[135px] lg:top-[140px] xl:top-[155px]"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
