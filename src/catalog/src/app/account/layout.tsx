import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AccountBreadcrumbs } from "@/components/account-breadcrumbs";
import { CustomerAreaNavigation } from "@/components/customer-area-navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>
    <SiteHeader />
    <AccountBreadcrumbs />
    <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-16 sm:px-8 lg:px-10">
      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        <CustomerAreaNavigation />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  </>;
}
