import { proxyCatalogState } from "../proxy";

export async function POST(request: Request) {
  return proxyCatalogState(request, "/api/catalog/merge", { method: "POST" });
}
