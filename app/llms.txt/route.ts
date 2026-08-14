import { headers } from "next/headers";
import { buildGovernanceLlmsText } from "@/lib/runtime/discoverability";
import { resolveRequestHostname } from "@/lib/runtime/request-host";

export async function GET() {
  const requestHeaders = await headers();
  const hostname = resolveRequestHostname(requestHeaders, "");
  const content = buildGovernanceLlmsText(hostname);

  if (!content) {
    return new Response("Not Found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(content, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
