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

  // Staked Ratio Calculation (Shares vs Capacity)
  // depositorTotalSupply = Total Shares Minted (YFI Equivalent)
  // depositorCapacity = Max Shares Allowed (YFI Equivalent)
  const capacity = token.depositorCapacity > 0n ? token.depositorCapacity : 1n;
  const utilizationRatio =
    Number((token.depositorTotalSupply * 10000n) / capacity) / 10000;

  const effectiveUtilization = Math.max(0.01, utilizationRatio);

  // APR Math
  const baseApy = baseApyBps ? Number(baseApyBps) / 10000 : 0;
  const boostedStyfiApy = baseApy * token.veyfiBoost;
  const effectiveApy = boostedStyfiApy / effectiveUtilization;

  // Format Large Supplies:
  // For standard tokens, Shares = Assets.
  // For upYFI, Shares = Assets / 69420.
  // We want to show "Filled Amount" vs "Capacity".
  // Display in "Assets" (e.g. 50K upYFI) vs "Capacity in Assets".
  // Capacity Assets = Capacity Shares * Scale.
  const capacityAssets = token.depositorCapacity * token.exchangeRate;
  const stakedAssets = token.depositorTotalSupply * token.exchangeRate;

  const formatCompact = (val: bigint) => {
    return Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(val) / 1e18);
  };

  const aprTooltipContent = (
    <div className="w-full min-w-[180px] text-[11px] leading-tight">
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
    <div className="group bg-white transition-colors hover:bg-neutral-50/50 last:rounded-b-box">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full grid grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr_1.5fr_40px] items-center p-4 text-left outline-none focus-visible:bg-neutral-100"
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
        <div className="text-right">
          <Tooltip
            content={copy.manage.row.tooltips.ratio}
            side="top"
            className="text-left max-w-[220px]"
          >
            <div className="inline-block border-b border-dotted border-neutral-300 cursor-help">
              <div className="font-number font-bold text-neutral-900">
                {formatPercent(utilizationRatio, 1)}
              </div>
            </div>
          </Tooltip>
          <div className="text-xs font-medium text-neutral-500 mt-0.5">
            {formatCompact(stakedAssets)} / {formatCompact(capacityAssets)}
          </div>
        </div>

        {/* Col 4: Effective APR */}
        <div className="text-right">
          <Tooltip content={aprTooltipContent} side="left">
            <div className="inline-block border-b border-dotted border-neutral-300 cursor-help">
              <div className="font-number font-bold text-disco-600 text-lg leading-tight">
                {formatPercent(effectiveApy, 0)}
              </div>
            </div>
          </Tooltip>
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mt-0.5">
            {copy.manage.row.boostedBaseLabel(
              formatPercent(boostedStyfiApy, 1)
            )}
          </div>
        </div>

        {/* Col 5: Your Deposits */}
        <div className="text-right">
          <div className="font-number font-bold text-neutral-900">
            {formatTokenAmount(staked)}
          </div>
          {wallet > 0n && (
            <div className="text-xs font-medium text-neutral-500">
              {copy.manage.row.availableLabel(formatTokenAmount(wallet))}
            </div>
          )}
        </div>

        {/* Col 6: Chevron */}
        <div className="flex justify-end">
          <IconChevron
            className={cn(
              "w-5 h-5 text-neutral-400 transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
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
