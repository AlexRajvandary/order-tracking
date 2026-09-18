import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function proxy(request: NextRequest) {
  const legacySegments = request.nextUrl.pathname
    .split("/")
    .filter(Boolean)
    .slice(1)
    .map(decodePathSegment);
  const section = legacySegments[0];
  if (!section) return NextResponse.next();

  const destination = request.nextUrl.clone();
  const queryChild = destination.searchParams.get("sub");
  const child = legacySegments[1] ?? queryChild;
  destination.pathname = ["", "catalog", section, ...(child ? [child] : [])].join("/");
  destination.searchParams.delete("sub");
  destination.searchParams.delete("shuffleSeed");

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: "/categories/:path*",
};
