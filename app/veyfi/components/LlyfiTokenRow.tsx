"use client";

import { useState } from "react";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { IconChevron } from "@/components/icons/IconChevron";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LlyfiRowCockpit } from "./LlyfiRowCockpit";
import { useStyfiApy } from "@/lib/hooks/useStyfi";
import { Tooltip } from "@/components/ui/Tooltip";
import { veyfiCopy as copy } from "../messages";
import { useProtocol } from "@/state/protocol";
import { useIdentity } from "@/state/identity";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEpochClock } from "@/lib/hooks/useEpochClock";
import {
  getLlyfiDisplaySymbol,
  normalizeLlyfiSymbol,
} from "@/lib/clients/veyfi/display";

export function LlyfiTokenRow({ token }: { token: LlyfiTokenState }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: baseApyBps } = useStyfiApy();
  const { globalData } = useProtocol();
  const { canTransact, isWrongNetwork } = useIdentity();
  const { epochInfo } = useEpochClock({ tickMs: 60_000 });

  const toNumber = (value?: string | number | null) => {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(numeric) ? numeric : null;
  };

  const toBigInt = (value?: string | number | null, fallback = 0n) => {
    if (value === null || value === undefined) return fallback;
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  };

  const formatPercentSmart = (value: number, maximumFractionDigits = 1) => {
    if (!Number.isFinite(value)) return "0%";
    const percentValue = value * 100;
    if (Math.abs(percentValue) >= 1000) {
      const compact = Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits,
      }).format(percentValue);
      return `${compact}%`;
    }
    return formatPercent(value, maximumFractionDigits);
  };

  const displaySymbol = getLlyfiDisplaySymbol(token.symbol);

  // --- Derived Metrics ---
  const staked = token.stakedBalance + token.cooldownBalance;
  const wallet = token.walletBalance;

  const capacity = token.depositorCapacity > 0n ? token.depositorCapacity : 1n;
  const fallbackRatio =
    Number((token.depositorTotalSupply * 10000n) / capacity) / 10000;

  const preferLiveTotals = canTransact;
  const s3Llyfi = globalData?.llyfi?.find(
    (entry) => normalizeLlyfiSymbol(entry.symbol) === token.symbol
  );
  const s3Redemption = globalData?.global?.veyfi?.tokens?.find(
    (entry) => normalizeLlyfiSymbol(entry.symbol) === token.symbol
  )?.redemption;
  const s3Capacity = s3Redemption
    ? toBigInt(s3Redemption.capacity, token.depositorCapacity)
    : null;
  const s3Staked = s3Llyfi
    ? toBigInt(s3Llyfi.staked) + toBigInt(s3Llyfi.unstaking)
    : null;
  const useS3Totals = !preferLiveTotals;
  const capacityForRatio = useS3Totals
    ? s3Capacity ?? token.depositorCapacity
    : token.depositorCapacity;
  const stakedForRatio = useS3Totals
    ? s3Staked ?? token.depositorTotalSupply
    : token.depositorTotalSupply;
  const utilizationRatioRaw =
    capacityForRatio > 0n
      ? Number((stakedForRatio * 10000n) / capacityForRatio) / 10000
      : fallbackRatio;
  const MIN_UTILIZATION = 0.01;
  const utilizationRatioForApr = Math.max(
    MIN_UTILIZATION,
    utilizationRatioRaw
  );
  const utilizationRatioLabel =
    utilizationRatioRaw < MIN_UTILIZATION
      ? "<1%"
      : formatPercent(utilizationRatioRaw, 1);

  const maxBoostBps = toNumber(globalData?.global?.maxBoostBps);
  const boostMultiplier =
    maxBoostBps !== null ? maxBoostBps / 10000 : token.veyfiBoost || 1;

  const isEpochZero = epochInfo?.currentEpoch === 0;
  const s3EffectiveAprBps = s3Llyfi
    ? toNumber(isEpochZero ? s3Llyfi.projected.aprBps : s3Llyfi.current.aprBps)
    : null;
  const s3BaseAprBps = globalData?.styfi
    ? isEpochZero
      ? globalData.styfi.projected.aprBps
      : globalData.styfi.current.aprBps
    : null;
  const baseApyBpsValue =
    toNumber(s3BaseAprBps) ??
    (baseApyBps !== undefined ? Number(baseApyBps) : 0);
  const baseApy = baseApyBpsValue / 10000;
  const boostedBaseApy = baseApy * boostMultiplier;
  const effectiveApyFallback =
    utilizationRatioForApr > 0 ? boostedBaseApy / utilizationRatioForApr : 0;
  const effectiveApy =
    s3EffectiveAprBps !== null ? s3EffectiveAprBps / 10000 : effectiveApyFallback;
  const baseApyLabel = isEpochZero
    ? copy.manage.row.tooltips.apr.baseEpoch1
    : copy.manage.row.tooltips.apr.base;
  const effectiveApyLabel = isEpochZero
    ? copy.manage.row.tooltips.apr.effectiveEpoch1
    : copy.manage.row.tooltips.apr.effective;

  // Ratio uses YFI-locked capacity; secondary display uses scaled token amounts.
  const displayStaked = stakedForRatio;
  const displayCapacity = capacityForRatio;
  const displayScale = token.exchangeRate > 0n ? token.exchangeRate : 1n;
  const displayStakedScaled = displayStaked * displayScale;
  const displayCapacityScaled = displayCapacity * displayScale;

  const formatCompact = (val: bigint) => {
    return Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(val) / 1e18);
  };

  const aprTooltipContent = (
    <div className="w-full min-w-[200px] text-xs leading-tight">
      <div className="flex justify-between items-center mb-1">
        <span className="text-neutral-500">{baseApyLabel}</span>
        <span className="font-number font-medium">
          {formatPercent(baseApy, 2)}
        </span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-neutral-500">
          {copy.manage.row.tooltips.apr.boost}
        </span>
        <span className="font-number font-medium">
          × {boostMultiplier.toFixed(2)}
        </span>
      </div>

      <div className="border-t border-neutral-200 my-1.5" />

      <div className="flex justify-between items-center mb-1">
        <span className="text-neutral-900 font-bold">
          {copy.manage.row.tooltips.apr.boostedBase}
        </span>
        <span className="font-number font-bold text-neutral-900">
          {formatPercent(boostedBaseApy, 2)}
        </span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-neutral-500">
          {copy.manage.row.tooltips.apr.ratio}
        </span>
        <span className="font-number font-medium">
          ÷ {utilizationRatioLabel}
        </span>
      </div>

      <div className="border-t border-neutral-300 my-1.5" />

      <div className="flex justify-between items-center">
        <span className="text-disco-600 font-bold uppercase tracking-wide">
          {effectiveApyLabel}
        </span>
        <span className="font-number font-bold text-base text-disco-600">
          {formatPercentSmart(effectiveApy, 2)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-surface last:rounded-b-box border-b last:border-b-0 border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group w-full grid grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr_1.5fr_60px] items-center p-4 text-left outline-none transition-colors hover:bg-surface-secondary"
      >
        {/* Col 1: Asset */}
        <div className="font-bold text-neutral-900">
          {token.name}{" "}
          <span className="text-neutral-500 font-normal ml-1">
            ({displaySymbol})
          </span>
        </div>

        {/* Col 2: Locker Status */}
        <div className="text-right">
          <div className="font-number font-bold text-neutral-900">
            {formatTokenAmount(displayCapacity, 18, 2)} YFI
          </div>
          <div className="text-xs font-medium text-neutral-500">
            {copy.manage.row.boostLabel(boostMultiplier.toFixed(2) + "x")}
          </div>
        </div>

        {/* Col 3: Staked Ratio */}
        <div className="text-right flex justify-end">
          <Tooltip
            content={copy.manage.row.tooltips.ratio}
            side="top"
            className="text-right [&_span[role=tooltip]]:text-sm"
          >
            <div className="inline-block p-1 -m-1 rounded hover:bg-neutral-100 cursor-help transition-colors">
              <div className="font-number font-bold text-neutral-900">
                {utilizationRatioLabel}
              </div>
              <div className="text-xs font-medium text-neutral-500 mt-0.5">
                {formatCompact(displayStakedScaled)} /{" "}
                {formatCompact(displayCapacityScaled)}
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Col 4: Effective APR */}
        <div className="text-right flex justify-end">
          <Tooltip
            content={aprTooltipContent}
            side="left"
            className="[&_span[role=tooltip]]:text-sm"
          >
            <div className="inline-block p-1 -m-1 rounded hover:bg-neutral-100 cursor-help transition-colors text-right">
              <div className="font-number font-bold text-disco-600 text-lg leading-tight">
                {formatPercentSmart(effectiveApy, 0)}
              </div>
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mt-0.5">
                {copy.manage.row.boostedBaseLabel(
                  formatPercent(boostedBaseApy, 1)
                )}
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Col 5: Your Deposits */}
        <div className="text-right">
          {canTransact ? (
            <>
              <div className="font-number font-bold text-neutral-900">
                {formatTokenAmount(staked)}
              </div>
              {wallet > 0n && (
                <div className="text-xs font-medium text-neutral-500">
                  {copy.manage.row.availableLabel(
                    formatTokenAmount(wallet, 18, 2)
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-end">
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="text-xs font-medium text-neutral-500">
                {isWrongNetwork
                  ? copy.manage.row.wrongNetworkLabel
                  : copy.manage.row.connectWalletLabel}
              </div>
            </>
          )}
        </div>

        {/* Col 6: Chevron Action */}
        <div className="flex justify-end items-center">
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
              // Collapsed State Hover: Darken bg, scale up, black icon
              !isExpanded &&
                "text-neutral-400 group-hover:bg-neutral-200 group-hover:text-neutral-900 group-hover:scale-110",
              // Expanded State: Solid bg, rotated
              isExpanded && "bg-neutral-100 text-neutral-900 rotate-180"
            )}
          >
            <IconChevron className="w-5 h-5" />
          </div>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out border-t border-transparent",
          isExpanded ? "grid-rows-[1fr] border-neutral-100" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden bg-surface">
          <div className="p-4 md:p-6">
            <LlyfiRowCockpit token={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
