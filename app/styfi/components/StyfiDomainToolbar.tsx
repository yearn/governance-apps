"use client";

import { cn } from "@/lib/cn";
import { modeLabel, StyfiMode } from "./types";
import { useStyfiAccount } from "@/lib/hooks/useStyfi";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatTokenAmount } from "@/lib/format";
import { styfiCopy as copy } from "../messages";

type Props = {
  activeMode: StyfiMode;
  onSelectMode: (mode: StyfiMode) => void;
};

export function StyfiDomainToolbar({ activeMode, onSelectMode }: Props) {
  const { data, isLoading } = useStyfiAccount();

  const primaryBalance = useMemo(() => {
    if (!data) return 0n;
    return activeMode === "styfi"
      ? data.styfiActive
      : data.styfiX.assetsActive;
  }, [activeMode, data]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold text-neutral-900">
          {copy.toolbar.title}
        </h1>
        <div className="text-sm text-neutral-600 flex items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span className="font-number font-bold">
              {formatTokenAmount(primaryBalance, 18, 4)} YFI
            </span>
          )}
          <span className="text-neutral-500">
            {copy.toolbar.summarySuffix(modeLabel(activeMode))}
          </span>
        </div>
        <p className="text-xs text-neutral-500">{copy.toolbar.earningWeight}</p>
      </div>

      <div className="flex flex-col gap-2 items-end w-full lg:w-auto lg:max-w-[220px] self-end">
        <div className="flex flex-wrap gap-2 justify-end">
          {(["styfi", "x"] as StyfiMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onSelectMode(mode)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                activeMode === mode
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
              )}
              aria-pressed={activeMode === mode}
            >
              {modeLabel(mode)}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-600 max-w-xs text-right leading-snug">
          {activeMode === "styfi"
            ? copy.toolbar.descriptions.styfi
            : copy.toolbar.descriptions.x}
        </p>
      </div>
    </div>
  );
}
