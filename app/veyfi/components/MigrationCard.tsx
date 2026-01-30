"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useVeyfiAccount, useVeyfiMigration } from "@/lib/hooks/useVeyfi";
import { useStyfiApy } from "@/lib/hooks/useStyfi";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";
import { nowSeconds } from "@/lib/mocks/time";
import { useProtocol } from "@/state/protocol";
import { cn } from "@/lib/cn";

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}

export function MigrationCard() {
  const { data } = useVeyfiAccount();
  const { write, state } = useVeyfiMigration();
  const { data: styfiApyBps } = useStyfiApy();
  const { globalData } = useProtocol();
  const [now, setNow] = useState(0);

  // Sync time for boost calculation
  useEffect(() => {
    const tick = () => setNow(nowSeconds());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!data?.veYfi) return null;

  const {
    legacyBalance,
    lockedAmount,
    migrationEligible,
    migrated,
    unlockTime,
  } = data.veYfi;
  const showAction = legacyBalance > 0n && migrationEligible && !migrated;

  // --- Boost Calculations ---
  // Max lock duration = 4 years
  const MAX_LOCK_SECONDS = 4 * 365 * 24 * 60 * 60;

  // Boost = 1 + (remaining / max)
  // Range: 1.0x to 2.0x
  const remainingSeconds = Math.max(0, unlockTime - now);
  const boostRatio = Math.min(
    1,
    Math.max(0, remainingSeconds / MAX_LOCK_SECONDS),
  );
  const currentBoost = 1.0 + boostRatio;

  const isEpochZero = globalData?.meta?.epoch === 0;
  const s3AprBps = globalData?.styfi
    ? isEpochZero
      ? globalData.styfi.projected.aprBps
      : globalData.styfi.current.aprBps
    : null;
  const s3AprBpsValue = toNumber(s3AprBps);
  const baseAprBps =
    s3AprBpsValue ?? (styfiApyBps !== undefined ? Number(styfiApyBps) : null);
  const baseAprLabel =
    baseAprBps !== null ? formatPercent(baseAprBps / 10000, 2) : "--%";
  const effectiveAprBps =
    baseAprBps !== null ? baseAprBps * currentBoost : null;
  const effectiveAprLabel =
    effectiveAprBps !== null
      ? formatPercent(effectiveAprBps / 10000, 2)
      : "--%";

  const breakdownTooltip = (
    <div className="w-full min-w-[200px] text-xs leading-tight">
      <div className="flex justify-between items-center mb-1">
        <span className="text-neutral-500">
          {copy.migration.boost.stats.baseApr}
        </span>
        <span className="font-number font-medium">{baseAprLabel}</span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-neutral-500">veYFI Boost</span>
        <span className="font-number font-medium">
          × {currentBoost.toFixed(2)}
        </span>
      </div>

      <div className="border-t border-neutral-200 my-1.5" />

      <div className="flex justify-between items-center">
        <span className="text-disco-600 font-bold uppercase tracking-wide">
          Effective APR
        </span>
        <span className="font-number font-bold text-base text-disco-600">
          {effectiveAprLabel}
        </span>
      </div>
    </div>
  );

  const unlockDateLabel = new Date(unlockTime * 1000).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  const formattedLegacy = formatTokenAmount(legacyBalance, 18, 2);
  const formattedLocked = formatTokenAmount(lockedAmount, 18, 2);

  if (showAction) {
    // PRE-MIGRATION STATE (Uses veYFI Balance)
    return (
      <Card className="bg-neutral-900 text-neutral-0 border-neutral-700 overflow-hidden relative dark:bg-surface dark:text-text-primary dark:border-border">
        {/* Ambient glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-disco-900/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-1">
          <div className="space-y-4 flex-1">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-disco-300 mb-1">
                {copy.migration.legacy.statLabel}
              </h3>
              <p className="text-4xl font-number font-bold text-neutral-0 dark:text-text-primary">
                {formattedLegacy}{" "}
                <span className="text-lg text-neutral-400 dark:text-text-tertiary">
                  veYFI
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-0 dark:text-text-primary">
                {copy.migration.legacy.title}
              </h3>
              <p className="text-neutral-400 dark:text-text-tertiary text-sm max-w-lg leading-relaxed">
                {copy.migration.legacy.description}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              variant="veyfi"
              size="lg"
              onClick={() => write()}
              isLoading={
                state.status === "mining" || state.status === "signing"
              }
              disabled={state.status === "mining" || state.status === "signing"}
            >
              {copy.migration.legacy.cta}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (migrated) {
    // POST-MIGRATION STATE (Refined Design)
    return (
      <Card className="border-disco-200 bg-disco-50/50 dark:bg-surface dark:border-disco-700/60">
        <div className="flex flex-col md:flex-row items-stretch gap-8">
          {/* Left: Info */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-disco-900 dark:text-text-primary">
                {copy.migration.boost.title}
              </h3>
              <p className="text-disco-800 text-sm max-w-md leading-relaxed dark:text-text-secondary">
                {copy.migration.boost.description}
              </p>
            </div>

            <div className="flex gap-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-disco-700 mb-0.5 dark:text-text-tertiary">
                  {copy.migration.boost.stats.unlockDate}
                </p>
                <p className="font-number font-bold text-disco-900 dark:text-text-primary">
                  {unlockDateLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-disco-700 mb-0.5 dark:text-text-tertiary">
                  {copy.migration.boost.stats.amount}
                </p>
                <p className="font-number font-bold text-disco-900 dark:text-text-primary">
                  {formattedLocked} YFI
                </p>
              </div>
            </div>

            <a
              href="https://legacy-veyfi.yearn.fi"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-bold uppercase tracking-wide text-disco-700 hover:text-disco-900 underline decoration-disco-300 underline-offset-4 dark:text-text-secondary dark:hover:text-text-primary dark:decoration-disco-700"
            >
              {copy.migration.boost.manageLink}
            </a>
          </div>

          {/* Right: Visualization (Simplified) */}
          <Tooltip content={breakdownTooltip} side="left">
            <div
              className={cn(
                "w-full md:w-72 flex flex-col justify-center gap-4 rounded-box p-5",
                "bg-surface shadow-sm",
                "border border-disco-600",
                "transition-all cursor-help hover:shadow-md group",
              )}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-text-tertiary">
                    {copy.migration.boost.stats.effectiveApr}
                  </p>
                  <div className="text-neutral-300 group-hover:text-disco-400 transition-colors dark:text-text-tertiary">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                  </div>
                </div>
                <p className="font-number font-bold text-4xl text-disco-600 tracking-tight">
                  {effectiveAprLabel}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-disco-800 dark:text-disco-100">
                    {currentBoost.toFixed(2)}x Boost
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium dark:text-text-tertiary">
                    Max 2.0x
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden dark:bg-neutral-300">
                  <div
                    className="h-full bg-disco-600 transition-all duration-500 ease-out"
                    style={{
                      width: `${
                        Math.max(0, Math.min(1, currentBoost - 1)) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Tooltip>
        </div>
      </Card>
    );
  }

  return null;
}
