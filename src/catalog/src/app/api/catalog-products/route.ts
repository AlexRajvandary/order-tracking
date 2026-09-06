import { NextRequest, NextResponse } from "next/server";
import { fetchProductsPage } from "@/lib/products-api";

function positiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function csv(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalInt(value: string | null): number | undefined {
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const result = await fetchProductsPage({
      page: positiveInt(params.get("page"), 1, 10_000),
      pageSize: positiveInt(params.get("pageSize"), 10, 100),
      activeOnly: true,
      categorySlug: params.get("category") || undefined,
      includeCategoryChildren: params.get("includeCategoryChildren") === "true",
      brandSlugs: csv(params.get("brands")),
      shopSlugs: csv(params.get("shops")),
      sort: params.get("sort") === "mixed" ? "mixed" : undefined,
      shuffleSeed: optionalInt(params.get("shuffleSeed")),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to load more catalog products", error);
    return NextResponse.json(
      { message: "Не удалось загрузить товары" },
      { status: 502 },
    );
  }
}
