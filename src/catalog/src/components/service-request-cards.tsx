import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const serviceRequests = [
  {
    href: "/individual-request",
    title: "Индивидуальный запрос",
    description:
      "Не нашли нужный товар? Мы попробуем найти его для вас в Японии.",
    image: "/catalog-assets/individual-request.png",
  },
  {
    href: "/auction-request",
    title: "Аукцион",
    description:
      "Пришлите ссылку на лот и максимальную ставку — мы поможем с выкупом.",
    image: "/catalog-assets/auction.png",
  },
  {
    href: "/ticket-request",
    title: "Билеты",
    description:
      "Поможем найти и приобрести билеты на события, концерты и фестивали.",
    image: "/catalog-assets/tickets.png",
  },
] as const;

export function ServiceRequestCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-5 lg:gap-6">
      {serviceRequests.map((request) => (
        <Link
          key={request.href}
          href={request.href}
          className="group relative flex aspect-square min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#F24676] hover:shadow-lg active:translate-y-0 sm:p-6"
        >
          <ArrowUpRight className="absolute top-5 right-5 z-10 size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#F24676] sm:top-6 sm:right-6" />
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-3">
            <Image
              src={request.image}
              alt=""
              width={1280}
              height={1280}
              className="h-full max-h-[72%] w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
          <div className="relative z-10 shrink-0">
            <h2 className="pr-5 text-xl font-bold leading-tight tracking-tight text-[#111] lg:text-2xl">
              {request.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">
              {request.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
