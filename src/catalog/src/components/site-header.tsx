import Image from "next/image";
import Link from "next/link";
import { CartSheet } from "@/components/cart-sheet";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 py-2">
        <Link
          href="/"
          className="absolute left-4 top-1/2 z-10 inline-flex -translate-y-1/2 items-center"
          aria-label="The Get"
        >
          <Image
            src="/thegetlogo.png"
            alt="The Get"
            width={160}
            height={160}
            className="h-14 w-auto sm:h-16"
            priority
          />
        </Link>
        {/* Spacer keeps layout/cart alignment without growing from logo height */}
        <div className="w-14 shrink-0 sm:w-16" aria-hidden />
        <div className="ml-auto">
          <CartSheet />
        </div>
      </div>
    </header>
  );
}
