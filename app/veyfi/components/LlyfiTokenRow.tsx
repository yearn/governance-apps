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

export function LlyfiTokenRow({ token }: { token: LlyfiTokenState }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: baseApyBps } = useStyfiApy();

  // --- Derived Metrics ---
  const staked = token.stakedBalance + token.cooldownBalance;
  const wallet = token.walletBalance;

  const capacity = token.depositorCapacity > 0n ? token.depositorCapacity : 1n;
  const utilizationRatio =
    Number((token.depositorTotalSupply * 10000n) / capacity) / 10000;

  const effectiveUtilization = Math.max(0.01, utilizationRatio);

  const baseApy = baseApyBps ? Number(baseApyBps) / 10000 : 0;
  const boostedStyfiApy = baseApy * token.veyfiBoost;
  const effectiveApy = boostedStyfiApy / effectiveUtilization;

  const capacityAssets = token.depositorCapacity * token.exchangeRate;
  const stakedAssets = token.depositorTotalSupply * token.exchangeRate;

  const formatCompact = (val: bigint) => {
    return Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(val) / 1e18);
  };

  const aprTooltipContent = (
    <div className="w-full min-w-[200px] text-xs leading-tight">
      <div className="flex justify-between items-center mb-1">
        <span className="text-neutral-500">
          {copy.manage.row.tooltips.apr.base}
        </span>
        <span className="font-number font-medium">
          {formatPercent(baseApy, 2)}
        </span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-neutral-500">
          {copy.manage.row.tooltips.apr.boost}
        </span>
        <span className="font-number font-medium">
          × {token.veyfiBoost.toFixed(2)}
        </span>
      </div>

      <div className="border-t border-neutral-200 my-1.5" />

      <div className="flex justify-between items-center mb-1">
        <span className="text-neutral-900 font-bold">
          {copy.manage.row.tooltips.apr.boostedBase}
        </span>
        <span className="font-number font-bold text-neutral-900">
          {formatPercent(boostedStyfiApy, 2)}
        </span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-neutral-500">
          {copy.manage.row.tooltips.apr.ratio}
        </span>
        <span className="font-number font-medium">
          ÷ {formatPercent(utilizationRatio, 1)}
        </span>
      </div>

      <div className="border-t border-neutral-300 my-1.5" />

      <div className="flex justify-between items-center">
        <span className="text-disco-600 font-bold uppercase tracking-wide">
          {copy.manage.row.tooltips.apr.effective}
        </span>
        <span className="font-number font-bold text-base text-disco-600">
          {formatPercent(effectiveApy, 2)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="group bg-surface transition-colors hover:bg-surface-secondary last:rounded-b-box border-b last:border-b-0 border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full grid grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr_1.5fr_60px] items-center p-4 text-left outline-none"
      >
        {/* Col 1: Asset */}
        <div className="font-bold text-neutral-900">
          {token.name}{" "}
          <span className="text-neutral-500 font-normal ml-1">
            ({token.symbol})
          </span>
        </div>

        {/* Col 2: Locker Status */}
        <div className="text-right">
          <div className="font-number font-bold text-neutral-900">
            {formatTokenAmount(token.lockedYfi, 18, 2)} YFI
          </div>
          <div className="text-xs font-medium text-neutral-500">
            {copy.manage.row.boostLabel(token.veyfiBoost.toFixed(2) + "x")}
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
                {formatPercent(utilizationRatio, 1)}
              </div>
              <div className="text-xs font-medium text-neutral-500 mt-0.5">
                {formatCompact(stakedAssets)} / {formatCompact(capacityAssets)}
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
                {formatPercent(effectiveApy, 0)}
              </div>
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mt-0.5">
                {copy.manage.row.boostedBaseLabel(
                  formatPercent(boostedStyfiApy, 1)
                )}
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Col 5: Your Deposits */}
        <div className="text-right">
          <div className="font-number font-bold text-neutral-900">
            {formatTokenAmount(staked)}
          </div>
          {wallet > 0n && (
            <div className="text-xs font-medium text-neutral-500">
              {copy.manage.row.availableLabel(formatTokenAmount(wallet, 18, 2))}
            </div>
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
        <div className="overflow-hidden bg-neutral-50/50">
          <div className="p-4 md:p-6">
            <LlyfiRowCockpit token={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
