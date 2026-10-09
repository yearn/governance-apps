"use client";

import { useState } from "react";
import { formatTreasuryUsd } from "@/lib/clients/treasury/display";
import { treasuryAssetIconSource } from "@/lib/clients/treasury/asset-icons";
import type { TreasuryAsset } from "@/lib/schemas/treasury-feed";
import { treasuryCopy as copy } from "../messages";

export const treasuryLinkClass = "inline-flex min-h-10 min-w-10 items-center gap-1 rounded-md text-xs text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary";
export const treasurySummaryClass = "flex min-h-10 cursor-pointer items-center gap-2 rounded-md text-xs font-medium text-text-secondary transition-[color] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none";

export function MissingValue({ label = copy.unavailable }: { label?: string }) {
  return <span role="img" aria-label={label}>—</span>;
}

export function UsdValue({ value }: { value: string | null }) {
  return value === null ? <MissingValue /> : <>{formatTreasuryUsd(value)}</>;
}

export function TreasuryAssetIcon({ asset, small = false }: { asset: TreasuryAsset; small?: boolean }) {
  const source = treasuryAssetIconSource(asset);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const size = small ? "size-4 text-[8px]" : "size-7 text-[10px]";
  return (
    <span aria-hidden="true" className={"relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-secondary font-bold text-text-secondary outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 " + size}>
      {failedSource === source ? asset.symbol.slice(0, 2).toUpperCase() : (
        // Sources are reviewed exact-address URLs or the fixed Yearn token service.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt="" loading="lazy" className="size-full object-contain" onError={() => setFailedSource(source)} />
      )}
    </span>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return <span aria-hidden="true" className={"inline-block shrink-0 text-sm transition-transform motion-reduce:transition-none " + (open ? "rotate-90" : "")}>›</span>;
}
