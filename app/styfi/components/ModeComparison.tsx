"use client";

import { Badge } from "@/components/ui/Badge";
import { LogoStyfi } from "@/components/icons/LogoStyfi";
import { LogoStyfix } from "@/components/icons/LogoStyfix";
import { cn } from "@/lib/cn";
import type { StyfiAsset } from "./types";
import type { ReactNode } from "react";

type ModeComparisonProps = {
  selectedAsset?: StyfiAsset;
  onSelectAsset: (asset: StyfiAsset) => void;
  className?: string;
};

export function ModeComparison({
  selectedAsset,
  onSelectAsset,
  className,
}: ModeComparisonProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <ModeCard
        asset="stYFI"
        selectedAsset={selectedAsset}
        onSelectAsset={onSelectAsset}
        title="stYFI"
        description="Standard staking. You retain voting rights. Governance participation required for max yield."
        badges={<Badge>Variable APY</Badge>}
      />
      <ModeCard
        asset="stYFIx"
        selectedAsset={selectedAsset}
        onSelectAsset={onSelectAsset}
        title="stYFIx"
        description="Auto-delegated vault. Voting power is assigned to YBC to maximize rewards automatically."
        badges={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">Maximized APY</Badge>
            <Badge variant="brand">Recommended</Badge>
          </div>
        }
      />
    </div>
  );
}

function ModeCard({
  asset,
  selectedAsset,
  onSelectAsset,
  title,
  description,
  badges,
}: {
  asset: StyfiAsset;
  selectedAsset?: StyfiAsset;
  onSelectAsset: (asset: StyfiAsset) => void;
  title: string;
  description: string;
  badges: ReactNode;
}) {
  const isActive = selectedAsset === asset;
  const isStyfi = asset === "stYFI";
  const Logo = isStyfi ? LogoStyfi : LogoStyfix;

  const activeClasses = isStyfi
    ? "border-sunset-600 ring-1 ring-sunset-600"
    : "border-yearn-blue ring-1 ring-yearn-blue";

  return (
    <button
      type="button"
      onClick={() => onSelectAsset(asset)}
      aria-pressed={isActive}
      className={cn(
        "h-full w-full rounded-box border bg-surface p-5 text-left transition-[border-color,box-shadow,transform] duration-150 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
        isActive ? activeClasses : "border-neutral-200"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" aria-hidden />
          <div className="space-y-1">
            <p className="text-base font-bold text-neutral-900">{title}</p>
            {badges}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
        {description}
      </p>
    </button>
  );
}
