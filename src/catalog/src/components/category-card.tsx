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
        "group flex h-full cursor-pointer flex-col items-center rounded-[18px] border border-[#EFEFEF] bg-white p-6",
        "shadow-[0_8px_30px_rgba(0,0,0,0.04)]",
        "transition-[transform,box-shadow] duration-[250ms] ease-out",
        "hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)]",
      )}
    >
      <span className="flex h-[100px] w-full shrink-0 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="max-h-[100px] max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.06]"
        />
      </span>
      <span className="mt-5 flex min-h-[48px] w-full items-start justify-center">
        <span className="line-clamp-2 text-center text-lg font-semibold leading-snug text-[#111] transition-colors duration-200 group-hover:text-[#F24676]">
          {item.label}
        </span>
      </span>
    </Link>
  );
}
