"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Banner } from "@/components/ui/Banner";
import { formatTokenAmount } from "@/lib/format";
import { useStyfiAccount, useStyfiClaimRewards } from "@/lib/hooks/useStyfi";

export function RewardsCard() {
  const { data, isLoading } = useStyfiAccount();
  const { write, state } = useStyfiClaimRewards();

  const claimable = useMemo(() => {
    if (!data) return 0n;
    return data.claimableGenericRewards + data.claimableBoostedRewards;
  }, [data]);

  const accruing = useMemo(() => {
    if (!data) return 0n;
    return data.accruingGenericRewards + data.accruingBoostedRewards;
  }, [data]);

  const isDisabled =
    !data ||
    data.isBlacklisted ||
    claimable === 0n ||
    state.status === "signing" ||
    state.status === "submitted" ||
    state.status === "mining";

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Rewards
          </p>
          <h3 className="text-xl font-bold text-neutral-900">stYFI rewards</h3>
        </div>
        {isLoading ? (
          <Skeleton className="h-10 w-28" />
        ) : (
          <div className="text-right">
            <p className="text-xs text-neutral-500">Accruing (next epoch)</p>
            <p className="text-lg font-number font-bold">
              {formatTokenAmount(accruing)} {data?.rewardToken.symbol}
            </p>
          </div>
        )}
      </div>

      {data?.isBlacklisted && (
        <Banner variant="error" title="Blacklisted">
          This address is restricted from using this interface.
        </Banner>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
      ) : !data ? (
        <p className="text-sm text-neutral-600">
          Connect your wallet to see rewards.
        </p>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-neutral-500">Claimable</p>
            <p className="text-2xl font-number font-bold">
              {formatTokenAmount(claimable)} {data.rewardToken.symbol}
            </p>
            <p className="text-xs text-neutral-500">
              Includes generic + boosted rewards.
            </p>
          </div>

          <div className="flex w-full justify-end md:w-auto">
            <Button
              variant="primary"
              className="md:self-start"
              disabled={isDisabled}
              isLoading={
                state.status === "signing" ||
                state.status === "submitted" ||
                state.status === "mining"
              }
              onClick={() => write()}
            >
              Claim rewards
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
