"use client";

import { Card } from "@/components/ui/Card";
import { useRedemptionCaps, useLlyfiTokens } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";

export function RedemptionStatusCard() {
  const caps = useRedemptionCaps();
  const tokens = useLlyfiTokens();

  if (!caps) return null;

  // Global YFI "Inventory" (Capacity)
  const globalRemainingYfi = caps.globalLimit - caps.globalUsed;
  const feeLabel = formatPercent(caps.feeBps / 10000);

  return (
    <Card className="h-full flex flex-col p-0 overflow-hidden bg-white">
      <div className="p-6 pb-4 border-b border-neutral-100">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          {copy.redemptionCard.title}
        </h3>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 font-bold tracking-wide">
            <tr>
              <th className="px-6 py-3 font-medium">Asset</th>
              <th className="px-6 py-3 font-medium text-right">Available</th>
              <th className="px-6 py-3 font-medium text-right">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {/* Row 1: Global YFI Availability */}
            <tr className="bg-white">
              <td className="px-6 py-3 font-bold text-neutral-900">YFI</td>
              <td className="px-6 py-3 text-right font-number font-bold text-neutral-900">
                {formatTokenAmount(globalRemainingYfi, 18, 2)}
              </td>
              <td className="px-6 py-3 text-right font-number font-medium text-neutral-600">
                {feeLabel}
              </td>
            </tr>

            {/* Rows 2+: LLYFI Tokens Inventory */}
            {tokens.map((token) => {
              const inventory = token.protocolLiquidity;

              return (
                <tr
                  key={token.symbol}
                  className="bg-white hover:bg-neutral-50/50 transition-colors"
                >
                  <td className="px-6 py-3 font-medium text-neutral-700">
                    {token.symbol}
                  </td>
                  <td className="px-6 py-3 text-right font-number text-neutral-600">
                    {formatTokenAmount(inventory, 18, 2)}
                  </td>
                  <td className="px-6 py-3 text-right font-number text-neutral-400">
                    --
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
