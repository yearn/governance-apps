import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { DaoPageClient } from "./DaoPageClient";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
  daoViewport,
} from "./metadata";
import { isDaoEnabled } from "@/lib/runtime/features";
import { resolveRequestHostname } from "@/lib/runtime/request-host";

export const viewport = daoViewport;
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  if (!isDaoEnabled()) return daoNotFoundMetadata;
  const requestHeaders = await headers();
  return createDaoRouteMetadata("DAO Governance | Yearn Finance", {
    hostname: resolveRequestHostname(requestHeaders, ""),
  });
}

export default async function DaoPage() {
  if (!isDaoEnabled()) {
    notFound();
  }

  const requestHeaders = await headers();
  const initialHostname = resolveRequestHostname(requestHeaders, "");

  return <DaoPageClient initialHostname={initialHostname} />;
}
