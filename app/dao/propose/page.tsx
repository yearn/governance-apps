import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { DaoProposePageClient } from "./DaoProposePageClient";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
  daoViewport,
} from "../metadata";
import { isDaoEnabled } from "@/lib/runtime/features";
import { resolveRoutedRequestHostname } from "@/lib/runtime/request-host";

export const viewport = daoViewport;
export const dynamic = "force-dynamic";

export function generateMetadata() {
  return isDaoEnabled()
    ? createDaoRouteMetadata("Create proposal | DAO Governance")
    : daoNotFoundMetadata;
}

export default async function DaoProposePage() {
  if (!isDaoEnabled()) {
    notFound();
  }

  const requestHeaders = await headers();
  const initialHostname = resolveRoutedRequestHostname(requestHeaders, "");

  return <DaoProposePageClient initialHostname={initialHostname} />;
}
