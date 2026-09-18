import { permanentRedirect } from "next/navigation";
import { safeDecode } from "@/lib/categories-api";

type PageProps = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function appendQueryValue(params: URLSearchParams, key: string, value: string | string[]) {
  if (Array.isArray(value)) {
    for (const item of value) params.append(key, item);
    return;
  }
  params.set(key, value);
}

export default async function LegacyCategoryRedirect({ params, searchParams }: PageProps) {
  const [{ sectionId }, query] = await Promise.all([params, searchParams]);
  const child = Array.isArray(query.sub) ? query.sub[0] : query.sub;
  const destination = [
    "/catalog",
    encodeURIComponent(safeDecode(sectionId)),
    ...(child ? [encodeURIComponent(safeDecode(child))] : []),
  ].join("/");
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value == null || key === "sub" || key === "shuffleSeed") continue;
    appendQueryValue(qs, key, value);
  }

  permanentRedirect(qs.size > 0 ? `${destination}?${qs}` : destination);
}
