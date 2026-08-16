import Link from "next/link";

type HomeSectionHeadingProps = {
  title: string;
  href?: string;
  linkLabel?: string;
};

export function HomeSectionHeading({
  title,
  href,
  linkLabel = "Смотреть все",
}: HomeSectionHeadingProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
      <h2 className="text-2xl font-semibold tracking-[-0.025em] text-foreground sm:text-[30px]">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="group shrink-0 pb-0.5 text-sm text-muted-foreground transition-colors hover:text-[#e73e69] sm:text-[15px]"
        >
          {linkLabel}
          <span
            aria-hidden
            className="ml-1 inline-block transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
