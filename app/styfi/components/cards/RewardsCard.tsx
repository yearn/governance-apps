"use client";

import { useMemo, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Banner } from "@/components/ui/Banner";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatPercent, formatTokenAmount, formatUsd } from "@/lib/format";
import {
  useStyfiAccount,
  useStyfiClaimRewards,
  useStyfiApy,
  useRewardTokenInfo,
} from "@/lib/hooks/useStyfi";
import { styfiCopy as copy } from "../../messages";
import { IconCheck } from "@/components/icons/IconCheck";
import { IconWallet } from "@/components/icons/IconWallet";
import { useProtocol } from "@/state/protocol";
import { useEpochClock } from "@/lib/hooks/useEpochClock";
import { getLlyfiDisplaySymbol } from "@/lib/clients/veyfi/display";
import {
  deriveWeightedApr,
  resolveStyfiBaseAprBps,
  resolveStyfixAprBps,
} from "@/lib/portfolio/governance";
import type { AccountBalances } from "../AccountSummary";
import type { ExternalPosition } from "../../external-positions";

type RewardsCardProps = {
  balances?: AccountBalances | null;
  externalPositions?: ExternalPosition[];
};

type ActiveHolding = {
  label: string;
  yfiWeight: bigint;
  apr: number;
};

export function RewardsCard({
  balances,
  externalPositions,
}: RewardsCardProps) {
  const { data, isLoading } = useStyfiAccount();
  const { write, state } = useStyfiClaimRewards();
  const { data: styfiAprBps } = useStyfiApy();
  const { apy: rewardApy, convertBalanceToUsd } = useRewardTokenInfo();
  const { globalData } = useProtocol();
  const { epochInfo } = useEpochClock({ tickMs: 60_000 });

  const isEpochZero = epochInfo?.currentEpoch === 0;
  const fallbackAprBps = styfiAprBps !== undefined ? Number(styfiAprBps) : null;
  const styfiBaseAprBps = resolveStyfiBaseAprBps({
    globalData,
    isEpochZero,
    fallbackAprBps,
  });
  const styfixAprBps = resolveStyfixAprBps({
    globalData,
    isEpochZero,
    fallbackAprBps,
  });
  const styfiBaseApr = styfiBaseAprBps === null ? null : styfiBaseAprBps / 10000;
  const styfixApr = styfixAprBps === null ? styfiBaseApr : styfixAprBps / 10000;
  const defaultAprLabel = isEpochZero
    ? copy.rewards.apr.labelEpoch1
    : copy.rewards.apr.label;
  const defaultAprTooltip = isEpochZero
    ? copy.rewards.apr.tooltipEpoch1
    : copy.rewards.apr.tooltip;

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

  const activeHoldings = useMemo(() => {
    const holdings: ActiveHolding[] = [];

    if (balances?.styfi.active && balances.styfi.active > 0n) {
      holdings.push({
        label: "stYFI",
        yfiWeight: balances.styfi.active,
        apr: styfiBaseApr ?? 0,
      });
    }

    if (balances?.styfix.active && balances.styfix.active > 0n) {
      holdings.push({
        label: "stYFIx",
        yfiWeight: balances.styfix.active,
        apr: styfixApr ?? styfiBaseApr ?? 0,
      });
    }

    for (const position of externalPositions ?? []) {
      if (position.activeBalanceYfi <= 0n) continue;

      holdings.push({
        label:
          position.symbol === "veYFI"
            ? "veYFI"
            : getLlyfiDisplaySymbol(position.symbol),
        yfiWeight: position.activeBalanceYfi,
        apr: position.effectiveApr,
      });
    }

    return holdings;
  }, [balances, externalPositions, styfiBaseApr, styfixApr]);

  const blendedApr = useMemo(
    () =>
      deriveWeightedApr(
        activeHoldings.map((holding) => ({
          weight: holding.yfiWeight,
          apr: holding.apr,
        }))
      ),
    [activeHoldings]
  );

  let titleLabel: string = defaultAprLabel;
  let displayAprLabel = styfiBaseApr === null ? "--%" : formatPercent(styfiBaseApr, 2);
  let aprTooltipContent: ReactNode = defaultAprTooltip;

  if (activeHoldings.length === 1) {
    titleLabel = copy.rewards.apr.yourLabel;
    displayAprLabel = formatPercent(activeHoldings[0].apr, 2);
    aprTooltipContent = copy.rewards.apr.yourTooltip;
  } else if (activeHoldings.length > 1) {
    titleLabel = copy.rewards.apr.averageLabel;
    displayAprLabel = blendedApr === null ? "--%" : formatPercent(blendedApr, 2);
    aprTooltipContent = (
      <div className="w-full min-w-[240px] text-xs leading-tight">
        <div className="mb-2 font-bold uppercase tracking-wide text-neutral-500">
          {copy.rewards.apr.breakdownTitle}
        </div>
        {activeHoldings.map((holding) => (
          <div
            key={holding.label}
            className="mb-1 flex items-center justify-between gap-3"
          >
            <span className="text-neutral-600">
              {holding.label}{" "}
              <span className="ml-1 text-neutral-400">
                ({formatTokenAmount(holding.yfiWeight, 18, 1)} YFI)
              </span>
            </span>
            <span className="font-medium font-number">
              {formatPercent(holding.apr, 2)}
            </span>
          </div>
        ))}
        <div className="my-1.5 border-t border-neutral-200" />
        <div className="flex items-center justify-between">
          <span className="font-bold text-neutral-900">
            {copy.rewards.apr.breakdownTotal}
          </span>
          <span className="font-bold font-number text-neutral-900">
            {displayAprLabel}
          </span>
        </div>
      </div>
    );
  }

  const blacklistStatus = data?.blacklistStatus ?? "unknown";
  const isDisabled =
    !data ||
    blacklistStatus === "blocked" ||
    claimable === 0n ||
    state.status === "signing" ||
    state.status === "submitted" ||
    state.status === "mining";

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col justify-between min-h-[300px] p-0 overflow-hidden border border-border">
        <div className="p-6 space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
        <div className="bg-neutral-50 p-6 border-t border-border">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-12 w-32 rounded-box" />
          </div>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="h-full flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
        <div className="rounded-full bg-neutral-100 p-4 text-neutral-400">
          <IconWallet className="h-8 w-8" />
        </div>
        <div>
          <h3 className="font-bold text-neutral-900">{copy.rewards.title}</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-[200px] mx-auto">
            {copy.rewards.disconnected}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col p-0 border border-border bg-surface">
      <div className="p-6 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            {copy.rewards.title}
          </h3>
        </div>

        {blacklistStatus === "blocked" && (
          <Banner variant="error" title={copy.shared.blacklistedTitle}>
            {copy.shared.blacklistedBody}
          </Banner>
        )}

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-1">
            <Tooltip content={aprTooltipContent} side="top">
              <button
                type="button"
                className="text-xs font-bold text-neutral-500 cursor-help border-b border-dotted border-neutral-400 hover:text-neutral-700 transition-colors focus:outline-none focus-visible:text-neutral-700"
              >
                {titleLabel}
              </button>
            </Tooltip>
            <p className="text-3xl md:text-4xl font-number font-bold text-neutral-900 tracking-tight">
              {displayAprLabel}
            </p>
          </div>

          <div className="space-y-1">
            <Tooltip
              content={copy.rewards.token.tooltip(data.rewardToken.symbol)}
              side="top"
            >
              <span className="text-xs font-bold text-neutral-500 cursor-help border-b border-dotted border-neutral-400 hover:text-neutral-700 transition-colors">
                {copy.rewards.token.label}
              </span>
            </Tooltip>

            <div className="flex flex-col items-start gap-1.5">
              <div className="flex items-center gap-2">
                <a
                  href={data.rewardToken.vaultUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${data.rewardToken.symbol} Yearn vault`}
                  className="text-lg font-bold text-neutral-900 transition-colors hover:text-neutral-700 hover:underline hover:decoration-dotted hover:underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2"
                >
                  {data.rewardToken.symbol}
                </a>
                {rewardApy && (
                  <Badge
                    variant="success"
                    className="text-[10px] h-5 px-1.5 font-bold"
                  >
                    +{rewardApy} APY
                  </Badge>
                )}
              </div>
              <span className="text-xs text-neutral-400 font-medium">
                {copy.rewards.token.desc}
              </span>
            </div>
          </div>
        </div>

        {isEpochZero && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
            {copy.rewards.epochZeroNotice}
          </div>
        )}
      </div>

      <div className="bg-neutral-50 border-t border-border p-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-b-[calc(var(--radius-box)-2px)]">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            {copy.rewards.claim.label}
          </p>
          <div className="flex flex-col">
            <span
              className={`text-3xl font-number font-bold tracking-tight ${
                claimable > 0n ? "text-neutral-900" : "text-neutral-400"
              }`}
            >
              {rewardValueLabel ?? "$0.00"}
            </span>
            <span className="text-sm font-number text-neutral-500 font-medium">
              {`${formatTokenAmount(
                claimable,
                data.rewardToken.decimals
              )} ${data.rewardToken.symbol}`}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full sm:w-auto min-w-[140px] shadow-sm font-bold"
          disabled={isDisabled}
          isLoading={
            state.status === "signing" ||
            state.status === "submitted" ||
            state.status === "mining"
          }
          onClick={() => write()}
        >
          {state.status === "success" ? (
            <span className="flex items-center gap-2">
              <IconCheck className="w-4 h-4" /> Claimed
            </span>
          ) : (
            copy.rewards.claim.button
          )}
        </Button>
      </div>
    </Card>
  );
}
