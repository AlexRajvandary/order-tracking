import { proxyServiceRequest } from "../service-request-proxy";

export async function POST(request: Request) {
  return proxyServiceRequest(request, "find-product-requests");
}
