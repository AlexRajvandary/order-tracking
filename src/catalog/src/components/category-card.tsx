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
        "group flex flex-col overflow-hidden rounded-none border bg-card text-card-foreground shadow-xs",
        "transition-colors hover:bg-accent/40",
      )}
    >
      <span className="flex aspect-square items-center justify-center bg-muted/40 p-4 sm:p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </span>
      <span className="border-t px-3 py-2.5 text-center text-sm font-medium leading-snug">
        {item.label}
      </span>
    </Link>
  );
}
