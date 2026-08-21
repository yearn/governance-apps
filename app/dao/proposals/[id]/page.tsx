import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { DaoProposalPageClient } from "./DaoProposalPageClient";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
  daoViewport,
} from "../../metadata";
import { isDaoEnabled } from "@/lib/runtime/features";
import { resolveRequestHostname } from "@/lib/runtime/request-host";

export const viewport = daoViewport;

export function generateMetadata() {
  return isDaoEnabled()
    ? createDaoRouteMetadata("Proposal | DAO Governance")
    : daoNotFoundMetadata;
}

export default async function DaoProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  if (!isDaoEnabled()) {
    notFound();
  }

  const { id } = await params;
  const { from } = await searchParams;
  const requestHeaders = await headers();
  const initialHostname = resolveRequestHostname(requestHeaders, "");
  return (
    <DaoProposalPageClient
      initialHostname={initialHostname}
      proposalId={id}
      requestedOrigin={typeof from === "string" ? from : null}
    />
  );
}
