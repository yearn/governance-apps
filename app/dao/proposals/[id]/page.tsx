import { notFound } from "next/navigation";
import { DaoProposalPageClient } from "./DaoProposalPageClient";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
  daoViewport,
} from "../../metadata";
import { isDaoEnabled } from "@/lib/runtime/features";

export const viewport = daoViewport;

export function generateMetadata() {
  return isDaoEnabled()
    ? createDaoRouteMetadata("Proposal | DAO Governance")
    : daoNotFoundMetadata;
}

export default async function DaoProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isDaoEnabled()) {
    notFound();
  }

  const { id } = await params;
  return <DaoProposalPageClient proposalId={id} />;
}
