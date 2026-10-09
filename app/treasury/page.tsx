import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isTreasuryEnabled } from "@/lib/runtime/features";
import { TreasuryPageClient } from "./TreasuryPageClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Treasury | Yearn Finance",
  description: "Yearn treasury holdings, loans and allocations.",
  robots: { index: false, follow: false },
};

export default function TreasuryPage() {
  if (!isTreasuryEnabled()) notFound();
  return <TreasuryPageClient />;
}
