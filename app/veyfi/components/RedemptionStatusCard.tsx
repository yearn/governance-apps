"use client";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useRedemptionCaps } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";
import { cn } from "@/lib/cn";

export function RedemptionStatusCard() {
  const caps = useRedemptionCaps();

  if (!caps) return null;

  const globalUsed = caps.globalUsed;
  const globalLimit = caps.globalLimit;
  const globalRemaining = globalLimit - globalUsed;

  const percentageUsed =
    globalLimit > 0n ? Number((globalUsed * 10000n) / globalLimit) / 100 : 0;

  const feeLabel = formatPercent(caps.feeBps / 10000);

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          {copy.redemptionCard.title}
        </h3>
        <div className="px-3 py-1 bg-neutral-100 rounded-md border border-neutral-200">
          <span className="text-xs font-bold text-neutral-500 mr-2">
            {copy.redemptionCard.feeLabel}
          </span>
          <span className="text-sm font-bold font-number text-neutral-900">
            {feeLabel}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-neutral-900">
            {copy.redemptionCard.globalCapLabel}
          </span>
          <span className="font-number text-neutral-600">
            {formatTokenAmount(globalUsed, 18, 0)} /{" "}
            {formatTokenAmount(globalLimit, 18, 0)} YFI
          </span>
        </div>
        <ProgressBar value={percentageUsed} variant="warning" />
      </div>

      <div className="pt-4 border-t border-neutral-100 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          {copy.redemptionCard.availabilityTitle}
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {caps.perToken.map((tokenCap) => {
            const remaining = tokenCap.limit - tokenCap.used;
            // The effective availability is constrained by the global remaining cap
            const effective =
              remaining < globalRemaining ? remaining : globalRemaining;
            const isFull = effective <= 0n;

            return (
              <div
                key={tokenCap.symbol}
                className={cn(
                  "p-2 rounded-md border text-xs font-medium flex items-center justify-between",
                  isFull
                    ? "bg-red-50 border-red-100 text-red-700"
                    : "bg-neutral-50 border-neutral-200 text-neutral-700"
                )}
              >
                <span className="font-bold">{tokenCap.symbol}</span>
                <span className="font-number">
                  {isFull
                    ? copy.redemptionCard.capFull
                    : `${formatTokenAmount(effective, 18, 0)} YFI`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
