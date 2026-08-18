import { notFound } from "next/navigation";
import { DaoPageClient } from "./DaoPageClient";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
  daoViewport,
} from "./metadata";
import { isDaoEnabled } from "@/lib/runtime/features";

export const viewport = daoViewport;

export function generateMetadata() {
  return isDaoEnabled()
    ? createDaoRouteMetadata("DAO Governance | Yearn Finance")
    : daoNotFoundMetadata;
}

export default function DaoPage() {
  if (!isDaoEnabled()) {
    notFound();
  }

  return <DaoPageClient />;
}
