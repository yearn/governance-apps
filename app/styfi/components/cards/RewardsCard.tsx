"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Banner } from "@/components/ui/Banner";
import { formatTokenAmount } from "@/lib/format";
import { useStyfiAccount, useStyfiClaimRewards } from "@/lib/hooks/useStyfi";
import { styfiCopy as copy } from "../../messages";

export function RewardsCard() {
  const { data, isLoading } = useStyfiAccount();
  const { write, state } = useStyfiClaimRewards();

  const claimable = useMemo(() => {
    if (!data) return 0n;
    return data.claimableGenericRewards + data.claimableBoostedRewards;
  }, [data]);

  const isDisabled =
    !data ||
    data.isBlacklisted ||
    claimable === 0n ||
    state.status === "signing" ||
    state.status === "submitted" ||
    state.status === "mining";

  return (
    <Card className="h-full space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          {copy.rewards.title}
        </h3>
      </div>

      {data?.isBlacklisted && (
        <Banner variant="error" title={copy.shared.blacklistedTitle}>
          {copy.shared.blacklistedBody}
        </Banner>
      )}

      {isLoading ? (
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      ) : !data ? (
        <p className="text-sm text-neutral-600">{copy.rewards.disconnected}</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-2xl font-number font-bold text-neutral-900">
            {formatTokenAmount(claimable)} {data.rewardToken.symbol}
          </p>
          <Button
            variant="primary"
            className="min-w-[140px]"
            disabled={isDisabled}
            isLoading={
              state.status === "signing" ||
              state.status === "submitted" ||
              state.status === "mining"
            }
            onClick={() => write()}
          >
            {copy.rewards.claimCta}
          </Button>
        </div>
      )}

      {data && !isLoading && (
        <p className="text-xs text-neutral-500 pt-2 border-t border-neutral-100">
          {copy.rewards.epochLagNote}
        </p>
      )}
    </Card>
  );
}
