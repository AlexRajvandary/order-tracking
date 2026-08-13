import Link from "next/link";
import type { ApiCategory } from "@/lib/categories-api";
import { categoryHref } from "@/lib/categories-api";
import { cn } from "@/lib/utils";

type CategoryTreeProps = {
  categories: ApiCategory[];
  activeRootSlug?: string;
  activeChildSlug?: string;
  className?: string;
};

function CategoryLink({
  category,
  href,
  selected,
  nested,
}: {
  category: ApiCategory;
  href: string;
  selected: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-start justify-between gap-2 rounded-lg px-2 text-left transition-colors",
        nested ? "py-1 text-xs" : "py-1.5 text-sm",
        selected
          ? "bg-primary/10 font-medium text-primary"
          : nested
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "text-foreground hover:bg-muted",
      )}
    >
      <span className="line-clamp-2">{category.name}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {category.productCount}
      </span>
    </Link>
  );
}

export function CategoryTree({
  categories,
  activeRootSlug,
  activeChildSlug,
  className,
}: CategoryTreeProps) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Категории пока не загружены</p>
    );
  }

  return (
    <nav aria-label="Категории" className={className}>
      <ul className="space-y-1 text-sm">
        {categories.map((category) => (
          <li key={category.id} className="space-y-0.5">
            <CategoryLink
              category={category}
              href={categoryHref(category.slug)}
              selected={activeRootSlug === category.slug && !activeChildSlug}
            />
            {category.children.length > 0 ? (
              <ul className="ml-2 space-y-0.5 border-l pl-1.5">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <CategoryLink
                      category={child}
                      href={categoryHref(category.slug, child.slug)}
                      selected={
                        activeRootSlug === category.slug && activeChildSlug === child.slug
                      }
                      nested
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
