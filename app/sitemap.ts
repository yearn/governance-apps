import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { buildGovernanceSitemap } from "@/lib/runtime/discoverability";
import { resolveRequestHostname } from "@/lib/runtime/request-host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const hostname = resolveRequestHostname(requestHeaders, "");
  return buildGovernanceSitemap(hostname);
}
