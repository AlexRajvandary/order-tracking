import { proxyServiceRequest } from "@/app/api/service-request-proxy";

export function POST(request: Request) {
  return proxyServiceRequest(request, "auction-requests");
}
