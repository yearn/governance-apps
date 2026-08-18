import { notFound } from "next/navigation";
import { DaoProposePageClient } from "./DaoProposePageClient";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
  daoViewport,
} from "../metadata";
import { isDaoEnabled } from "@/lib/runtime/features";

export const viewport = daoViewport;
export const dynamic = "force-dynamic";

export function generateMetadata() {
  return isDaoEnabled()
    ? createDaoRouteMetadata("Create proposal | DAO Governance")
    : daoNotFoundMetadata;
}

export default function DaoProposePage() {
  if (!isDaoEnabled()) {
    notFound();
  }

  return <DaoProposePageClient />;
}
