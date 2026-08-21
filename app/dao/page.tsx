import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { DaoPageClient } from "./DaoPageClient";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
  daoViewport,
} from "./metadata";
import { isDaoEnabled } from "@/lib/runtime/features";
import { resolveRoutedRequestHostname } from "@/lib/runtime/request-host";

export const viewport = daoViewport;
export const dynamic = "force-dynamic";

export function generateMetadata() {
  return isDaoEnabled()
    ? createDaoRouteMetadata("DAO Governance | Yearn Finance")
    : daoNotFoundMetadata;
}

export default async function DaoPage() {
  if (!isDaoEnabled()) {
    notFound();
  }

  const requestHeaders = await headers();
  const initialHostname = resolveRoutedRequestHostname(requestHeaders, "");

  return <DaoPageClient initialHostname={initialHostname} />;
}
