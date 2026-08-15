import { NextResponse } from "next/server";
import { fetchBrands } from "@/lib/brands-api";

export async function GET() {
  try {
    const items = await fetchBrands();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { message: "Failed to load brands" },
      { status: 502 },
    );
  }
}
