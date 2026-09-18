import { permanentRedirect } from "next/navigation";
import { safeDecode } from "@/lib/categories-api";

type PageProps = {
  params: Promise<{ sectionId: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

/** Legacy path `/categories/:root/:child` → canonical catalog path. */
export default async function CategoryItemRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { sectionId, slug } = await params;
  const { page } = await searchParams;
  const qs = new URLSearchParams();
  if (page && page !== "1") qs.set("page", page);
  const destination = `/catalog/${encodeURIComponent(safeDecode(sectionId))}/${encodeURIComponent(safeDecode(slug))}`;
  permanentRedirect(qs.size > 0 ? `${destination}?${qs}` : destination);
}
