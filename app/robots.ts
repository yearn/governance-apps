import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { buildGovernanceRobots } from "@/lib/runtime/discoverability";
import { resolveRequestHostname } from "@/lib/runtime/request-host";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const hostname = resolveRequestHostname(requestHeaders, "");
  return buildGovernanceRobots(hostname);
}
