// app/veyfi/components/InventoryCard.tsx
"use client";

import { useVeyfiStats } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { getLlyfiDisplaySymbol } from "@/lib/clients/veyfi/display";

export function InventoryCard() {
  const { data: stats, isLoading } = useVeyfiStats();
  const unavailableTooltip = (
    <span className="block max-w-[240px] text-left text-neutral-700">
      {copy.inventory.unavailableTooltip}
    </span>
  );

  if (isLoading || !stats) {
    return (
      <div className="h-full rounded-box border border-neutral-200 bg-neutral-50 p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="pt-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-box border border-neutral-200 bg-neutral-50 overflow-hidden">
      <div className="p-6 border-b border-neutral-200">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-900">
          {copy.inventory.title}
        </h3>
        <p className="text-xs text-neutral-600 mt-1">
          {copy.inventory.subtitle}
        </p>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-neutral-500 font-bold tracking-wide border-b border-neutral-200">
            <tr>
              <th className="px-6 py-3 font-bold">Asset</th>
              <th className="px-6 py-3 text-right font-bold">
                Available to Trade
              </th>
              <th className="px-6 py-3 text-right font-bold">Swap Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {/* YFI Inventory: Used for Sell LLYFI */}
            <tr>
              <td className="px-6 py-4 text-neutral-700">YFI</td>
              <td className="px-6 py-4 text-right font-number text-neutral-900">
                {/* Standardize to 2 decimals for all limits/inventory */}
                {formatTokenAmount(stats.inventory.availableYfi, 18, 2)}
              </td>
              <td className="px-6 py-4 text-right font-number text-neutral-600">
                {formatPercent(stats.inventory.feeBps / 10000)}
              </td>
            </tr>

            {/* LLYFI Inventories: Used for Buy LLYFI */}
            {stats.tokens.map((token) => (
              <tr key={token.symbol}>
                <td className="px-6 py-4 font-medium text-neutral-700">
                  {getLlyfiDisplaySymbol(token.symbol)}
                </td>
                <td
                  className={`px-6 py-4 text-right ${
                    token.redemption.enabled
                      ? "font-number text-neutral-900"
                      : "text-neutral-500"
                  }`}
                >
                  {/* Standardize to 2 decimals */}
                  {token.redemption.enabled
                    ? formatTokenAmount(token.redemption.inventory, 18, 2)
                    : (
                        <Tooltip content={unavailableTooltip}>
                          <span className="inline-flex cursor-help">N/A</span>
                        </Tooltip>
                      )}
                </td>
                <td className="px-6 py-4 text-right text-neutral-400">--</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
