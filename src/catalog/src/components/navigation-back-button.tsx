"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NavigationBackButton({
  label,
  fallbackHref,
  className,
  iconOnly = false,
}: {
  label: string;
  fallbackHref: string;
  className?: string;
  iconOnly?: boolean;
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
      aria-label={iconOnly ? label : undefined}
    >
      <ArrowLeft aria-hidden />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </Button>
  );
}
