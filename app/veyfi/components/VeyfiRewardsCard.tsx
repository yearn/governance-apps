"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useVeyfiClaimRewards, useLlyfiTokens } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";

export function VeyfiRewardsCard() {
  const { write, state } = useVeyfiClaimRewards();
  const tokens = useLlyfiTokens();

  // Aggregate claimable rewards across all LLYFI tokens just for the "Has Rewards" check
  // We don't display the number per spec to avoid confusion with stYFI dashboard
  const totalClaimable = tokens.reduce(
    (sum, t) => sum + t.claimableRewards,
    0n
  );
  const hasRewards = totalClaimable > 0n;

  return (
    <Card className="bg-neutral-900 text-white border-neutral-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-400">
            {copy.rewards.title}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">
              {copy.rewards.amountLabel}:{" "}
              <span className="text-neutral-400">See Dashboard</span>
            </span>
          </div>
          <p className="text-xs text-neutral-500 pt-1">{copy.rewards.helper}</p>
        </div>

        <div className="flex flex-col gap-3 w-full sm:w-auto">
          {/* Primary Call to Action: Go to Dashboard */}
          <Link href="/styfi" className="w-full">
            <Button variant="veyfi" className="w-full">
              {copy.rewards.linkCta}
            </Button>
          </Link>

          {/* Secondary: Direct Claim (Fallback) */}
          <button
            onClick={() => write()}
            disabled={!hasRewards || state.status === "mining"}
            className="text-xs font-medium text-neutral-400 hover:text-white transition-colors underline decoration-neutral-700 underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.status === "mining" ? "Claiming..." : copy.rewards.claimCta}
          </button>
        </div>
      </div>
    </Card>
  );
}
