import Link from "next/link";
import { ArrowUpRight, PackageSearch } from "lucide-react";

export function IndividualRequestCard() {
  return (
    <Link
      href="/individual-request"
      className="group flex aspect-square w-full max-w-[360px] flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#F24676] hover:shadow-lg active:translate-y-0 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-[#F24676]/10 text-[#F24676]">
          <PackageSearch className="size-6" aria-hidden />
        </span>
        <ArrowUpRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#F24676]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#111]">
          Оформить индивидуальный запрос
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Не нашли нужный товар? Мы попробуем найти его для вас в Японии.
        </p>
      </div>
    </Link>
  );
}
