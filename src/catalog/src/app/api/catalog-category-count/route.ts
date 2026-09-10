import { NextRequest, NextResponse } from "next/server";
import {
  fetchFreshCategoryTree,
  findChildCategory,
  findRootCategory,
} from "@/lib/categories-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rootSlug = request.nextUrl.searchParams.get("root")?.trim();
  const childSlug = request.nextUrl.searchParams.get("child")?.trim();

  try {
    const categories = await fetchFreshCategoryTree();

    if (!rootSlug) {
      return NextResponse.json({
        count: categories.reduce((sum, category) => sum + category.productCount, 0),
      });
    }

    const root = findRootCategory(categories, rootSlug);
    if (!root) {
      return NextResponse.json({ title: "Категория не найдена" }, { status: 404 });
    }

    if (!childSlug) return NextResponse.json({ count: root.productCount });

    const child = findChildCategory(root, childSlug);
    if (!child) {
      return NextResponse.json({ title: "Подкатегория не найдена" }, { status: 404 });
    }

    return NextResponse.json({ count: child.productCount });
  } catch {
    return NextResponse.json(
      { title: "Не удалось обновить количество товаров" },
      { status: 502 },
    );
  }
}
