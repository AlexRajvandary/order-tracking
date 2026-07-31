import Image from "next/image";

const WORD = ["T", "H", "E", " ", "G", "E", "T"] as const;

/** Previous homepage hero: THE GET composed from letter PNGs. */
export function LegacyImageHero() {
  return (
    <section
      aria-label="The Get"
      className="flex w-full items-center justify-center bg-background px-4 py-8 sm:py-10"
    >
      <h1 className="sr-only">THE GET</h1>
      <div className="flex max-w-5xl flex-nowrap items-center justify-center gap-1 sm:gap-2 md:gap-3">
        {WORD.map((char, index) =>
          char === " " ? (
            <span
              key={`space-${index}`}
              className="w-3 shrink-0 sm:w-5 md:w-8"
              aria-hidden
            />
          ) : (
            <Image
              key={`${char}-${index}`}
              src={`/letters/${char}.png`}
              alt=""
              width={320}
              height={400}
              className="h-14 w-auto object-contain sm:h-20 md:h-28 lg:h-32"
              priority
            />
          ),
        )}
      </div>
    </section>
  );
}
