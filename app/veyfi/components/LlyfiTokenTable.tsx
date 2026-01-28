"use client";

import { useLlyfiTokens } from "@/lib/hooks/useVeyfi";
import { Card } from "@/components/ui/Card";
import { LlyfiTokenRow } from "./LlyfiTokenRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { veyfiCopy as copy } from "../messages";
import { useProtocol } from "@/state/protocol";

export function LlyfiTokenTable() {
  const tokens = useLlyfiTokens();
  const { globalData } = useProtocol();
  const isEpochZero = globalData?.meta?.epoch === 0;
  const aprLabel = isEpochZero ? copy.manage.columns.aprEpoch1 : copy.manage.columns.apr;

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

      <div className="rounded-box border border-neutral-300 bg-surface">
        <div className="grid grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr_1.5fr_40px] items-center p-4 bg-neutral-100 border-b border-neutral-200 text-xs font-bold uppercase tracking-wide text-neutral-500 first:rounded-t-box">
          <div>{copy.manage.columns.asset}</div>
          <div className="text-right">{copy.manage.columns.backing}</div>
          <div className="text-right">{copy.manage.columns.ratio}</div>
          <div className="text-right">{aprLabel}</div>
          <div className="text-right">{copy.manage.columns.deposits}</div>
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
