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
import { daoProposalSharePath, readDaoProposalShareDetails } from "@/lib/server/dao-proposal-metadata";

type DaoProposalPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[]; chain?: string | string[]; voting?: string | string[] }>;
};

export const viewport = daoViewport;

export async function generateMetadata({ params, searchParams }: DaoProposalPageProps) {
  if (!isDaoEnabled()) return daoNotFoundMetadata;
  const [{ id }, selection, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  const details = await readDaoProposalShareDetails({ id, ...selection });
  return createDaoRouteMetadata(details?.title ?? "Proposal | DAO Governance", {
    hostname: resolveRequestHostname(requestHeaders, ""),
    path: details?.path ?? daoProposalSharePath({ id, ...selection }),
    description: details?.description,
    canonical: Boolean(details),
  });
}

export default async function DaoProposalPage({
  params,
  searchParams,
}: DaoProposalPageProps) {
  if (!isDaoEnabled()) {
    notFound();
  }

  const { id } = await params;
  const { from, chain, voting } = await searchParams;
  const requestHeaders = await headers();
  const initialHostname = resolveRequestHostname(requestHeaders, "");
  return (
    <DaoProposalPageClient
      initialHostname={initialHostname}
      proposalId={id}
      selection={{ chainId: typeof chain === "string" ? chain : null, votingAddress: typeof voting === "string" ? voting : null }}
      requestedOrigin={typeof from === "string" ? from : null}
    />
  );
}
