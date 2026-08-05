import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategoryItem } from "@/lib/categories";

type CategoryCardProps = {
  item: CategoryItem;
  sectionId: string;
};

export function CategoryCard({ item, sectionId }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${sectionId}/${item.slug}`}
      className={cn(
        "group flex h-full cursor-pointer flex-col items-center rounded-[14px] border border-[#EFEFEF] bg-white p-3",
        "shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:rounded-[18px] sm:p-6",
        "transition-[transform,box-shadow] duration-[250ms] ease-out",
        "hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)]",
      )}
    >
      <span className="flex h-[72px] w-full shrink-0 items-center justify-center sm:h-[100px]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="max-h-[72px] max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.06] sm:max-h-[100px]"
          />
        ) : (
          <span
            className="size-14 rounded-full bg-[#F4F4F5] sm:size-16"
            aria-hidden
          />
        )}
      </span>
      <span className="mt-3 flex min-h-[40px] w-full items-start justify-center sm:mt-5 sm:min-h-[48px]">
        <span className="line-clamp-2 text-center text-[13px] font-semibold leading-snug text-[#111] transition-colors duration-200 group-hover:text-[#F24676] sm:text-lg">
          {item.label}
        </span>
      </span>
    </Link>
  );
}
