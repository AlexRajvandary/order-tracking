import Link from "next/link";

const benefits = [
  "Товары из Японии",
  "Проверенные магазины",
  "Доставка в Россию",
  "Поддержка на русском",
];

export function HomeHero() {
  return (
    <>
      <section className="relative h-[390px] overflow-hidden bg-[#e9edef] sm:h-[430px] lg:h-[460px]">
        <picture>
          <source media="(max-width: 639px)" srcSet="/hero-mobile.png" />
          <img
            src="/hero-wide-v3.png"
            alt="Улица японского города"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/78 to-white/5 sm:via-white/55" />

        <div className="relative flex h-full max-w-[610px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-foreground/60 uppercase">
            <span className="size-1.5 bg-[#e73e69]" aria-hidden />
            The Get
          </p>
          <h1 className="max-w-[560px] text-[38px] leading-[1.06] font-semibold tracking-[-0.045em] text-[#151515] sm:text-5xl lg:text-[54px]">
            Оригинальные товары из Японии
          </h1>
          <p className="mt-5 max-w-[490px] text-sm leading-6 text-[#555] sm:text-base sm:leading-7">
            Находим товары в японских магазинах и помогаем оформить доставку
            в Россию в одном понятном сервисе.
          </p>
          <div className="mt-7">
            <Link
              href="/categories/all"
              className="inline-flex h-11 items-center justify-center bg-[#171717] px-5 text-sm font-medium text-white transition-colors hover:bg-[#e73e69]"
            >
              Перейти в каталог
              <span className="ml-2" aria-hidden>
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 border-x border-b border-border/70 bg-background sm:grid-cols-4">
        {benefits.map((benefit, index) => (
          <div
            key={benefit}
            className={`flex min-h-16 items-center px-4 py-3 text-xs leading-5 text-muted-foreground sm:min-h-[72px] sm:justify-center sm:px-5 sm:text-center sm:text-sm ${
              index % 2 !== 0 ? "border-l border-border/70" : ""
            } ${index > 1 ? "border-t border-border/70 sm:border-t-0" : ""} ${
              index > 0 && index < 2 ? "sm:border-l" : ""
            } ${index > 1 ? "sm:border-l" : ""}`}
          >
            {benefit}
          </div>
        ))}
      </div>
    </>
  );
}
