import Link from "next/link";
import { getButtonClassName } from "@/components/ui/Button";
import { resolveGovernanceAppPathHref } from "@/lib/governance-links";
import type { YbcMockDataV1 } from "@/lib/clients/ybc";
import { ybcCopy as copy } from "../messages";

export function RewardsCard({ id, hostname }: { data: YbcMockDataV1; id?: string; hostname?: string | null }) {
  return <section id={id} className="max-w-2xl space-y-5 py-2">
    <h2 className="text-2xl font-bold">{copy.rewardHandoff.title}</h2>
    <p className="text-sm leading-6 text-text-secondary">{copy.rewardHandoff.body}</p>
    <Link href={resolveGovernanceAppPathHref("styfi", "/?focus=rewards", hostname)} className={getButtonClassName({ variant: "secondary" })}>{copy.rewardHandoff.cta}<span className="ml-2" aria-hidden="true">↗</span></Link>
  </section>;
}
