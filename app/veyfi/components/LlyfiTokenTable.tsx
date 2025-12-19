"use client";

import { useLlyfiTokens } from "@/lib/hooks/useVeyfi";
import { Card } from "@/components/ui/Card";
import { LlyfiTokenRow } from "./LlyfiTokenRow";
import { Skeleton } from "@/components/ui/Skeleton";

export function LlyfiTokenTable() {
  const tokens = useLlyfiTokens();

  if (tokens.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-neutral-900 px-1">
        Legacy Liquid Locker Tokens
      </h3>

      <div className="rounded-box border border-neutral-300 bg-surface">
        <div className="grid grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr_1.5fr_40px] items-center p-4 bg-neutral-100 border-b border-neutral-200 text-xs font-bold uppercase tracking-wide text-neutral-500 first:rounded-t-box">
          <div>Asset</div>
          <div className="text-right">Locker Status</div>
          <div className="text-right">Staked Ratio</div>
          <div className="text-right">Effective APR</div>
          <div className="text-right">Your Deposits</div>
          <div />
        </div>

        <div className="divide-y divide-neutral-200">
          {tokens.map((token) => (
            <LlyfiTokenRow key={token.symbol} token={token} />
          ))}
        </div>
      </div>
    </div>
  );
}
