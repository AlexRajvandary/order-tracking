"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          observer.disconnect();
          return;
        }
        setActiveStep(0);
        const timers: ReturnType<typeof setTimeout>[] = [];
        for (let index = 0; index < STEPS.length - 1; index += 1) {
          timers.push(setTimeout(() => {
            setActiveStep(index + 1);
          }, 350 + index * 350));
        }
        timers.push(setTimeout(() => setSelectedStep(null), 3000));
        observer.disconnect();
      },
      { threshold: 0.25 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="mx-auto w-full max-w-[1280px] bg-background px-4 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="overflow-hidden rounded-[28px] border border-[#b9c2c8] bg-white px-5 py-8 sm:px-10 sm:py-10 lg:px-14">
        <p className="text-xl font-bold tracking-tight sm:text-2xl">КАК РАБОТАЕТ <span className="text-[#48bde9]">THEGET</span></p>
        <p className="mt-1 text-sm text-[#111]">Процесс работы</p>
        <div className="mt-8 grid grid-cols-3 gap-x-1 gap-y-9 sm:gap-x-3 sm:gap-y-10 lg:mt-10 lg:grid-cols-7 lg:gap-x-5 lg:gap-y-10">
          {STEPS.map(({ number, title, text, icon: Icon }, index) => (
            <div
              key={number}
              tabIndex={0}
              onClick={() => setSelectedStep(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedStep(index);
              }}
              className={`group relative flex min-w-0 cursor-default flex-col items-center text-center transition-[transform,opacity] duration-250 ease-out hover:lg:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#48bde9] ${index === 6 ? "col-start-2 lg:col-start-auto" : ""}`}
            >
              <div className={`flex size-16 items-center justify-center rounded-[20px] border-2 border-[#48bde9] bg-[#f8fcfd] text-black transition-[transform,border-color,box-shadow] duration-250 sm:size-16 sm:rounded-[22px] lg:size-[76px] ${activeStep === index || selectedStep === index ? "scale-[1.04] border-[#20aee5] shadow-[0_0_0_4px_rgba(72,189,233,0.12)]" : "group-hover:lg:border-[#20aee5] group-hover:lg:shadow-[0_0_0_4px_rgba(72,189,233,0.08)]"}`}>
                <Icon className={`size-8 transition-transform duration-250 sm:size-8 lg:size-9 ${activeStep === index || selectedStep === index ? "scale-[1.04]" : "group-hover:lg:scale-[1.04] group-focus:scale-[1.04]"}`} strokeWidth={1.7} aria-hidden />
              </div>
              {index < 6 ? (
                <span className={`pointer-events-none absolute left-[calc(50%+32px)] top-8 h-px w-[calc(100%_-_60px)] sm:w-[calc(100%_-_52px)] lg:left-[calc(50%+38px)] lg:top-[38px] lg:w-[calc(100%_-_56px)] ${index % 3 === 2 ? "hidden lg:flex" : ""}`} aria-hidden>
                  <span className="relative flex h-px w-full items-center bg-[#48bde9] transition-colors duration-250 group-hover:lg:bg-[#20aee5]">
                    <span className="size-1.5 shrink-0 rounded-full bg-[#48bde9]" />
                  </span>
                </span>
              ) : null}
              <h3 className={`mt-3 min-h-8 max-w-full text-[11px] leading-4 font-semibold transition-[color,transform] duration-250 sm:mt-4 sm:min-h-10 sm:text-sm lg:min-h-12 lg:text-base ${activeStep === index || selectedStep === index ? "text-black" : "group-hover:lg:scale-[1.02] group-hover:lg:text-black"}`}>
                <span className="font-normal text-[#48bde9]">{number}.&nbsp;</span>{title}
              </h3>
              <p className="mt-1 min-h-16 max-w-[110px] text-[10px] leading-4 text-[#a0a0a0] sm:mt-2 sm:min-h-20 sm:max-w-[190px] sm:text-xs sm:leading-5 lg:min-h-[100px]">{text}</p>
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
