import { proxyCatalogState } from "../proxy";

export async function GET(request: Request) {
  return proxyCatalogState(request, "/api/catalog/favorites");
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { productId?: string; favorite?: boolean };
  if (!body.productId) return new Response("productId is required", { status: 400 });
  return proxyCatalogState(request, `/api/catalog/favorites/${encodeURIComponent(body.productId)}`, {
    method: "PUT",
    body: JSON.stringify({ favorite: body.favorite === true }),
  });
}
