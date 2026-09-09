import { NextRequest, NextResponse } from "next/server";
import { fetchProductsPage, fetchRakutenSearch } from "@/lib/products-api";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 128) {
    return NextResponse.json({ localProducts: [], rakutenProducts: [], localTotal: 0, rakutenTotal: 0 });
  }

  const [local, rakuten] = await Promise.allSettled([
    fetchProductsPage({ search: query, page: 1, pageSize: 6, activeOnly: true }),
    fetchRakutenSearch(query, 10),
  ]);

  return NextResponse.json({
    localProducts: local.status === "fulfilled" ? local.value.items : [],
    rakutenProducts: rakuten.status === "fulfilled" ? rakuten.value.items : [],
    localTotal: local.status === "fulfilled" ? local.value.total : 0,
    rakutenTotal: rakuten.status === "fulfilled" ? rakuten.value.total : 0,
  });
}
