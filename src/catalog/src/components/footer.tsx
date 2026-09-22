"use client";

import Link from "next/link";
import { ChevronDown, Mail, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type FooterLink = {
  href: string;
  label: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Эксклюзивные предложения",
    links: [
      { href: "/catalog/clothing", label: "Обувь и одежда" },
      { href: "/catalog/electronics", label: "Электроника" },
      { href: "/catalog/fishing", label: "Рыболовные товары" },
      { href: "/catalog/автозапчасти-мотоциклы", label: "Запчасти" },
      { href: "/catalog/beauty", label: "Парфюмерия и косметика" },
      { href: "/catalog/instruments", label: "Музыкальные инструменты" },
      { href: "/catalog/процессоры-и-видеокарты", label: "Видеокарты и процессоры" },
      { href: "/catalog/watches", label: "Японские часы" },
      { href: "/catalog/figures", label: "Игрушки и статуэтки" },
      { href: "/catalog/all", label: "Все товары" },
    ],
  },
  {
    title: "Где покупать",
    links: [
      { href: "https://theget.ru/watchshop", label: "Магазины часов" },
      { href: "https://theget.ru/musicstore", label: "Музыкальные магазины" },
      { href: "https://theget.ru/electronicsstore", label: "Магазины электроники" },
      { href: "https://theget.ru/clothingandshoes", label: "Аутлеты" },
      { href: "https://theget.ru/sportsequipment", label: "Спортивные товары" },
      { href: "https://theget.ru/carspareparts", label: "Автотовары" },
      { href: "https://theget.ru/comics", label: "Манга и книги" },
      { href: "https://theget.ru/toys", label: "Фигурки и игрушки" },
      { href: "https://theget.ru/marketplaces", label: "Маркетплейсы" },
      { href: "https://theget.ru/auction", label: "Японские аукционы" },
    ],
  },
  {
    title: "Доставка",
    links: [
      { href: "https://theget.ru/japanconditions", label: "Доставка из Японии" },
      { href: "https://theget.ru/usaconditions", label: "Доставка из США" },
      { href: "https://theget.ru/europeconditions", label: "Доставка из Европы" },
      { href: "https://theget.ru/chinaconditions", label: "Доставка из Китая" },
      { href: "https://theget.ru/britishconditions", label: "Доставка из Великобритании" },
    ],
  },
  {
    title: "Блог",
    links: [
      { href: "https://theget.ru/media", label: "Последние статьи" },
    ],
  },
  {
    title: "О компании",
    links: [
      { href: "https://theget.ru/historyproject", label: "О нас" },
      { href: "https://theget.ru/theworkprocess", label: "Как это работает" },
      { href: "https://theget.ru/countriescommunications", label: "Страны и коммуникации" },
      { href: "https://theget.ru/event", label: "Наши розыгрыши и эвенты" },
      { href: "https://theget.ru/oferta", label: "Публичная оферта" },
    ],
  },
];

const linkClassName = cn(
  "inline-block text-base font-normal leading-[1.8] text-white/85 no-underline",
  "transition-[color,transform] duration-200",
  "hover:translate-x-[3px] hover:text-white",
);

function FooterLinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="flex flex-col gap-0">
      {links.map((link) => (
        <li key={link.href + link.label}>
          <Link href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FooterColumnDesktop({ column }: { column: FooterColumn }) {
  return (
    <nav aria-label={column.title}>
      <h3 className="mb-6 text-2xl font-bold text-white">{column.title}</h3>
      <FooterLinkList links={column.links} />
    </nav>
  );
}

function FooterColumnMobile({ column }: { column: FooterColumn }) {
  return (
    <details className="group border-b border-white/10 py-1 open:pb-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-left text-lg font-bold text-white sm:py-4 sm:text-2xl [&::-webkit-details-marker]:hidden">
        {column.title}
        <ChevronDown
          className="size-5 shrink-0 text-white/70 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <FooterLinkList links={column.links} />
    </details>
  );
}

function VkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.586-1.496c.596-.19 1.363 1.26 2.175 1.817.614.42 1.08.328 1.08.328l2.17-.03s1.134-.07.597-.962c-.044-.073-.312-.657-1.607-1.857-1.356-1.256-1.174-.052.458-2.557.995-1.538 1.392-2.476 1.267-2.877-.119-.382-.855-.281-.855-.281l-2.306.014s-.171-.024-.298.052c-.124.074-.203.247-.203.247s-.365.97-.851 1.795c-1.025 1.74-1.436 1.833-1.604 1.726-.391-.25-.293-.997-.293-1.53 0-1.663.252-2.356-.492-2.536-.247-.06-.428-.1-1.058-.106-.81-.008-1.495.003-1.883.194-.258.127-.457.41-.335.426.15.02.49.092.67.337.232.316.224 1.026.224 1.026s.133 1.965-.311 2.209c-.305.167-.723-.174-1.622-1.735-.46-.8-.807-1.685-.807-1.685s-.067-.164-.186-.252c-.144-.107-.346-.141-.346-.141l-2.19.014s-.329.01-.45.152c-.107.126-.008.387-.008.387s1.715 4.01 3.655 6.033c1.78 1.855 3.802 1.733 3.802 1.733h.917z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto bg-black text-white">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 sm:py-[72px]">
        {/* Desktop / tablet grid */}
        <div className="hidden gap-x-14 gap-y-5 md:grid md:grid-cols-2 lg:grid-cols-5 lg:gap-x-16">
          {FOOTER_COLUMNS.map((column) => (
            <FooterColumnDesktop key={column.title} column={column} />
          ))}
        </div>

        {/* Mobile accordion */}
        <div className="flex flex-col md:hidden">
          {FOOTER_COLUMNS.map((column) => (
            <FooterColumnMobile key={column.title} column={column} />
          ))}
        </div>

        <div className="mt-10 border-t border-white/15 pt-6 sm:mt-14 sm:pt-8">
          <div className="flex flex-col items-center gap-4 text-sm text-white/70 sm:flex-row sm:justify-between sm:gap-5">
            <p className="shrink-0 text-white/80">© 2026 THE GET</p>

            <nav
              aria-label="Соцсети"
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-5"
            >
              <Link
                href="https://t.me/thegetru"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/80 transition-colors duration-200 hover:text-white"
              >
                <Send className="size-4" aria-hidden />
                Telegram
              </Link>
              <Link
                href="https://vk.ru/thegetru?from=groups"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/80 transition-colors duration-200 hover:text-white"
              >
                <VkIcon className="size-4" />
                VK
              </Link>
             <Link
                href="https://t.me/getmvp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/80 transition-colors duration-200 hover:text-white"
              >
                <Send className="size-4" aria-hidden />
                Написать нам в Telegram
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
