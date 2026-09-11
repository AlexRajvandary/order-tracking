import { NextResponse } from "next/server";
import { fetchFreshCategoryTree } from "@/lib/categories-api";

export async function GET() {
  try {
    const items = await fetchFreshCategoryTree();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { title: "Не удалось загрузить категории" },
      { status: 502 },
    );
  }
}
