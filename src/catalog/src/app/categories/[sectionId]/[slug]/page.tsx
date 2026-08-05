import { redirect } from "next/navigation";
import { safeDecode } from "@/lib/categories-api";

type PageProps = {
  params: Promise<{ sectionId: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

/** Legacy path `/categories/:root/:child` → query form that supports Cyrillic slugs. */
export default async function CategoryItemRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { sectionId, slug } = await params;
  const { page } = await searchParams;
  const sub = encodeURIComponent(safeDecode(slug));
  const qs = new URLSearchParams({ sub });
  if (page && page !== "1") qs.set("page", page);
  redirect(`/categories/${sectionId}?${qs.toString()}`);
}
