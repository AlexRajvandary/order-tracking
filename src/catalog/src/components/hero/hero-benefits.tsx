import {
  Headphones,
  Package,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroBenefit = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const HERO_BENEFITS: HeroBenefit[] = [
  {
    title: "Быстрая доставка",
    description: "от 7 дней",
    icon: Truck,
  },
  {
    title: "100% оригинал",
    description: "из Японии",
    icon: ShieldCheck,
  },
  {
    title: "Надёжная упаковка",
    description: "защита товара",
    icon: Package,
  },
  {
    title: "Поддержка",
    description: "Telegram 24/7",
    icon: Headphones,
  },
];

type HeroBenefitItemProps = {
  benefit: HeroBenefit;
  showDivider?: boolean;
};

export function HeroBenefitItem({
  benefit,
  showDivider = false,
}: HeroBenefitItemProps) {
  const Icon = benefit.icon;

  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-2 px-[11px]",
        showDivider &&
          "lg:after:absolute lg:after:top-1/2 lg:after:right-0 lg:after:h-8 lg:after:w-px lg:after:-translate-y-1/2 lg:after:bg-[rgba(17,17,17,0.09)] lg:after:content-['']",
      )}
    >
      <Icon
        className="size-5 shrink-0 text-[#F24676]"
        strokeWidth={1.8}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[12px] font-[650] leading-[1.15] text-balance text-[#171717] hyphens-none [overflow-wrap:normal]">
          {benefit.title}
        </p>
        <p className="mt-0.5 text-[10px] leading-[1.2] text-[#777777] text-balance hyphens-none [overflow-wrap:normal]">
          {benefit.description}
        </p>
      </div>
    </div>
  );
}

type HeroBenefitsProps = {
  className?: string;
};

export function HeroBenefits({ className }: HeroBenefitsProps) {
  return (
    <div
      className={cn(
        "w-[min(620px,calc(100vw-40px))] min-h-[68px] rounded-[14px] border border-[rgba(17,17,17,0.07)] bg-[rgba(255,255,255,0.90)] px-[14px] py-3 shadow-[0_10px_30px_rgba(0,0,0,0.07)] backdrop-blur-[8px]",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-x-1 gap-y-3 lg:grid-cols-4 lg:items-center lg:gap-0">
        {HERO_BENEFITS.map((benefit, index) => (
          <HeroBenefitItem
            key={benefit.title}
            benefit={benefit}
            showDivider={index < HERO_BENEFITS.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
