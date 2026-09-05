"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NavigationBackButton({
  label,
  fallbackHref,
  className,
}: {
  label: string;
  fallbackHref: string;
  className?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={goBack}
    >
      <ArrowLeft aria-hidden />
      {label}
    </Button>
  );
}
