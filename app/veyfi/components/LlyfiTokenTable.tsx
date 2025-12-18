"use client";

import { useLlyfiTokens } from "@/lib/hooks/useVeyfi";
import { Card } from "@/components/ui/Card";
import { LlyfiTokenRow } from "./LlyfiTokenRow";
import { veyfiCopy as copy } from "../messages";
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
        {copy.manage.title}
      </h3>

      <div className="rounded-box border border-neutral-300 bg-surface overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_40px] items-center p-4 bg-neutral-100 border-b border-neutral-200 text-xs font-bold uppercase tracking-wide text-neutral-500">
          <div>{copy.manage.columns.asset}</div>
          <div className="text-right">{copy.manage.columns.apy}</div>
          <div className="text-right">{copy.manage.columns.wallet}</div>
          <div className="text-right">{copy.manage.columns.staked}</div>
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
