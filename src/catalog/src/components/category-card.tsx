import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryItem } from "@/lib/categories";
import { categoryHref } from "@/lib/categories-api";

type CategoryCardProps = {
  item: CategoryItem;
  sectionId: string;
};

export function CategoryCard({ item, sectionId }: CategoryCardProps) {
  return (
    <Link
      href={categoryHref(sectionId, item.slug)}
      className={cn(
        "group flex h-full min-w-0 cursor-pointer flex-col items-center px-1 py-2 text-center",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F24676]",
      )}
    >
      <span className="flex h-[132px] w-full shrink-0 items-center justify-center sm:h-[152px] lg:h-[160px]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full max-h-full max-w-full object-contain transition-transform duration-200 ease-out motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
          />
        ) : (
          <span
            className="size-14 rounded-full bg-[#F4F4F5] sm:size-16"
            aria-hidden
          />
        )}
      </span>
      <span className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5">
        <span className="line-clamp-2 min-w-0 text-center text-[15px] font-medium leading-5 text-[#111] sm:text-base sm:font-semibold">
          {item.label}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-[#FF4081] transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:transform-none"
        />
      </span>
    </Link>
  );
}
