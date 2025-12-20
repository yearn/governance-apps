// app/veyfi/components/InventoryCard.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { useVeyfiAccount } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";

export function InventoryCard() {
  const { data } = useVeyfiAccount();
  if (!data) return null;

  return (
    <Card className="h-full flex flex-col p-0 overflow-hidden bg-white">
      <div className="p-6 border-b border-neutral-100">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          {copy.inventory.title}
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          {copy.inventory.subtitle}
        </p>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 font-bold tracking-wide">
            <tr>
              <th className="px-6 py-3">Asset</th>
              <th className="px-6 py-3 text-right">Available to Trade</th>
              <th className="px-6 py-3 text-right">Swap Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {/* YFI Inventory: Used for Sell LLYFI */}
            <tr className="bg-white">
              <td className="px-6 py-4 font-bold text-neutral-900">YFI</td>
              <td className="px-6 py-4 text-right font-number font-bold text-neutral-900">
                {formatTokenAmount(data.inventory.availableYfi, 18, 2)}
              </td>
              <td className="px-6 py-4 text-right font-number font-medium text-neutral-600">
                {formatPercent(data.inventory.feeBps / 10000)}
              </td>
            </tr>

            {/* LLYFI Inventories: Used for Buy LLYFI */}
            {data.llyfiTokens.map((token) => (
              <tr
                key={token.symbol}
                className="bg-white hover:bg-neutral-50/50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-neutral-700">
                  {token.symbol}
                </td>
                <td className="px-6 py-4 text-right font-number text-neutral-600">
                  {formatTokenAmount(token.protocolLiquidity, 18, 2)}
                </td>
                <td className="px-6 py-4 text-right text-neutral-300">--</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
