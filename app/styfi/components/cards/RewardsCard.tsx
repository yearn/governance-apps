// app/styfi/components/cards/RewardsCard.tsx

"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Banner } from "@/components/ui/Banner";
import { Tooltip } from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";
import { formatTokenAmount, formatUsd } from "@/lib/format";
import {
  useStyfiAccount,
  useStyfiClaimRewards,
  useRewardTokenInfo,
  useStyfiStats,
} from "@/lib/hooks/useStyfi";
import { styfiCopy as copy } from "../../messages";

export function RewardsCard() {
  const { data, isLoading } = useStyfiAccount();
  const { write, state } = useStyfiClaimRewards();
  const { data: stats } = useStyfiStats();
  const { apy, convertBalanceToUsd } = useRewardTokenInfo();

  const claimable = useMemo(() => {
    if (!data) return 0n;
    return data.claimableGenericRewards + data.claimableBoostedRewards;
  }, [data]);

  const rewardValueLabel = useMemo(() => {
    if (!data) return null;
    const value = convertBalanceToUsd(claimable);
    if (value === null) return null;
    return formatUsd(value, data.rewardToken.decimals, 2);
  }, [claimable, convertBalanceToUsd, data]);

  const earningPowerLabel = useMemo(() => {
    if (!data || !stats || stats.totalStaked === 0n) return "--%";
    const styfixActive =
      data.styfiX.assetsActive > 0n
        ? data.styfiX.assetsActive
        : data.styfiX.sharesActive;
    const userTotalActive = data.styfiActive + styfixActive;
    if (userTotalActive === 0n) return "0%";

    const ratio = Number((userTotalActive * 10000n) / stats.totalStaked) / 100;
    if (ratio < 0.01) return "< 0.01%";
    return ratio.toFixed(2) + "%";
  }, [data, stats]);

  const isDisabled =
    !data ||
    data.isBlacklisted ||
    claimable === 0n ||
    state.status === "signing" ||
    state.status === "submitted" ||
    state.status === "mining";

  return (
    <Card className="h-full flex flex-col">
      <div className="space-y-4">
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
          <p className="text-sm text-neutral-600">
            {copy.rewards.disconnected}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-number font-bold text-neutral-900">
                  {formatTokenAmount(claimable, data.rewardToken.decimals)}{" "}
                  {data.rewardToken.symbol}
                </p>
                {apy && (
                  <Tooltip
                    content={copy.rewards.apyTooltip(data.rewardToken.symbol)}
                  >
                    <Badge variant="success" className="cursor-help">
                      {copy.rewards.apyBadge(apy)}
                    </Badge>
                  </Tooltip>
                )}
              </div>
              {rewardValueLabel && (
                <p className="text-sm text-neutral-500">
                  ~ {rewardValueLabel}
                </p>
              )}
            </div>
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
      </div>

      {data && !isLoading && (
        <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between gap-4">
          <p className="text-xs text-neutral-500 flex-1">
            {copy.rewards.epochLagNote}
          </p>

          <Tooltip content={copy.modeSelector.earningPower.tooltip}>
            <div className="flex items-center gap-2 shrink-0 cursor-help">
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                {copy.modeSelector.earningPower.label}
              </span>
              <Badge variant="neutral">{earningPowerLabel}</Badge>
            </div>
          </Tooltip>
        </div>
      )}
    </Card>
  );
}
