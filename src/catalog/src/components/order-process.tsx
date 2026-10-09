"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  ArrowRight,
  FilePenLine,
  FileText,
  Plane,
  Search,
  Truck,
  WalletCards,
} from "lucide-react";

const STEPS = [
  { number: "01", title: "Получаем заявку", text: "Пришлите описание товара, прикрепите фото, ссылку или артикул.", icon: FilePenLine },
  { number: "02", title: "Находим товар", text: "Ищем товар на всевозможных площадках, в магазинах.", icon: Search },
  { number: "03", title: "Присылаем расчет", text: "Прописываем полную стоимость от страны направления до вас.", icon: FileText },
  { number: "04", title: "Выкуп", text: "Конвертируем средства в нужную валюту и выкупаем интересующий товар.", icon: WalletCards },
  { number: "05", title: "Доставка до склада", text: "Проверяем товар на брак, соответствие, дополняющим при необходимости.", icon: Truck },
  { number: "06", title: "Проверка товара", text: "Ожидаем доставку до нашего склада в стране направления.", icon: BadgeCheck },
  { number: "07", title: "Доставка", text: "Отправка производится через страны транзита, на наш склад далее, отправка напрямую к вам.", icon: Plane },
];

const SERVICE_REQUEST_PATHS = new Set([
  "/login",
  "/register",
  "/favorites",
  "/cart",
  "/individual-request",
  "/auction-request",
  "/ticket-request",
  "/find-product",
]);

export function OrderProcess() {
  const pathname = usePathname();

  if (SERVICE_REQUEST_PATHS.has(pathname) || pathname.startsWith("/account")) return null;

  return (
    <section className="w-full bg-[#F4F4F5]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <h2 className="flex items-center gap-3 text-[22px] font-bold tracking-tight text-[#111] sm:text-[30px]">
          <span aria-hidden className="h-[0.85em] w-1 shrink-0 rounded-full bg-[#F24676]" />
          КАК РАБОТАЕТ <span className="text-[#111]">THEGET</span>
        </h2>
        <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 md:grid-cols-4 md:gap-x-8 lg:mt-12 lg:grid-cols-7 lg:gap-x-4 lg:gap-y-10">
          {STEPS.map(({ number, title, text, icon: Icon }, index) => (
            <div
              key={number}
              className={`group relative flex min-w-0 cursor-default flex-col items-center text-center transition-transform duration-200 ease-out hover:lg:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF4081] motion-reduce:transform-none motion-reduce:transition-none ${index === 6 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <span className="mb-1 text-[12px] font-semibold leading-4 text-[#E99AB2]">{number}</span>
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#F5C6D4] bg-[#FFF9FB] text-[#FF4081] transition-[transform,border-color,background-color] duration-200 ease-out group-hover:lg:border-[#FF4081] group-hover:lg:bg-white motion-reduce:transition-none">
                <Icon className="size-6 transition-transform duration-200 ease-out group-hover:lg:scale-[1.04] motion-reduce:transition-none" strokeWidth={1.7} aria-hidden />
              </div>
              {index < 6 ? (
                <span
                  className="pointer-events-none absolute top-12 left-[calc(50%+28px)] hidden h-px items-center lg:flex"
                  style={{ width: "calc(100% + 1rem - 3.5rem)" }}
                  aria-hidden
                >
                  <span className="h-px flex-1 bg-[#E7E7E7]" />
                  <ArrowRight className="size-3.5 shrink-0 text-[#D7D7D7]" strokeWidth={1.5} />
                </span>
              ) : null}
              <h3 className="mt-3 min-h-10 max-w-[180px] text-sm leading-[1.4] font-semibold text-[#111] transition-colors duration-200 group-hover:lg:text-[#FF4081] motion-reduce:transition-none sm:min-h-10 lg:min-h-10">
                {title}
              </h3>
              <p className="mt-2 min-h-[78px] max-w-[180px] text-[12px] leading-[1.5] text-[#777] sm:min-h-[72px]">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center lg:mt-12">
          <Link href="/individual-request" className="group/link inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#333] transition-colors duration-200 hover:text-[#FF4081] motion-reduce:transition-none">
            Оформить заказ
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover/link:translate-x-1 motion-reduce:transition-none" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
