import Link from "next/link";
import {
  BadgeCheck,
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

export function OrderProcess() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="overflow-hidden rounded-[28px] border border-[#b9c2c8] bg-white px-5 py-8 sm:px-10 sm:py-10 lg:px-14">
        <p className="text-xl font-bold tracking-tight sm:text-2xl">КАК РАБОТАЕТ <span className="text-[#48bde9]">THEGET</span></p>
        <p className="mt-1 text-sm text-[#111]">Процесс работы</p>
        <div className="mt-8 grid grid-cols-3 gap-x-1 gap-y-9 sm:gap-x-3 sm:gap-y-10 lg:mt-10 lg:grid-cols-7 lg:gap-x-5 lg:gap-y-10">
          {STEPS.map(({ number, title, text, icon: Icon }, index) => (
            <div key={number} className={`relative flex min-w-0 flex-col items-center text-center ${index === 6 ? "col-start-2 lg:col-start-auto" : ""}`}>
              <span className="absolute left-0 top-12 text-xs font-light text-[#48bde9] sm:-left-1 sm:top-20 sm:text-lg lg:-left-2">{number}.</span>
              <div className="flex size-16 items-center justify-center rounded-[20px] border-2 border-[#48bde9] bg-[#f8fcfd] text-black sm:size-24 sm:rounded-[26px] lg:size-28">
                <Icon className="size-8 sm:size-10" strokeWidth={1.7} aria-hidden />
              </div>
              {index < 6 && (index % 3 !== 2 || index > 2) ? (
                <span className={`pointer-events-none absolute left-[calc(50%+32px)] top-8 flex h-px w-[calc(100%-32px)] items-center bg-[#48bde9] lg:left-[calc(50%+56px)] lg:top-14 lg:w-[calc(100%+20px)] ${index % 3 === 2 ? "hidden lg:flex" : ""}`} aria-hidden>
                  <span className="size-1.5 shrink-0 rounded-full bg-[#48bde9]" />
                </span>
              ) : null}
              <h3 className="mt-3 max-w-full text-[11px] leading-4 font-semibold sm:mt-4 sm:text-sm lg:text-base">{title}</h3>
              <p className="mt-1 max-w-[110px] text-[10px] leading-4 text-[#a0a0a0] sm:mt-2 sm:max-w-[190px] sm:text-xs sm:leading-5">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-9 flex justify-center">
          <Link href="/categories/all" className="inline-flex h-12 items-center gap-4 rounded-full border border-[#d7d7d7] bg-white px-6 text-sm font-medium shadow-sm transition-colors hover:border-[#48bde9] hover:text-[#28a6d6]">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#e9f8fd] text-xl text-[#48bde9]">→</span>
            Оформить заявку
          </Link>
        </div>
      </div>
    </section>
  );
}
