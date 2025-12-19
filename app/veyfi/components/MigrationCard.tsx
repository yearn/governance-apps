"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useVeyfiAccount, useVeyfiMigration } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";
import { nowSeconds } from "@/lib/mocks/time";

export function MigrationCard() {
  const { data } = useVeyfiAccount();
  const { write, state } = useVeyfiMigration();
  const [now, setNow] = useState(0);

  // Sync time for mock time travel updates
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
    Math.max(0, remainingSeconds / MAX_LOCK_SECONDS)
  );
  const currentBoost = 1.0 + boostRatio;

  // For the Timeline Visualization
  // Position 0% = Start (2.0x boost / 4y remaining)
  // Position 100% = End (1.0x boost / 0y remaining)
  // We want "Time Passed" from left to right.
  // So if 4y remaining -> 0% progress (Left)
  // If 0y remaining -> 100% progress (Right)
  const timelineProgress = (1 - boostRatio) * 100;

  const unlockDateLabel = new Date(unlockTime * 1000).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  const formattedLegacy = formatTokenAmount(legacyBalance, 18, 2);
  const formattedLocked = formatTokenAmount(lockedAmount, 18, 2);

  if (showAction) {
    // PRE-MIGRATION STATE (Uses veYFI Balance)
    return (
      <Card className="bg-neutral-900 text-white border-neutral-700 overflow-hidden relative">
        {/* Ambient glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-disco-900/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-1">
          <div className="space-y-4 flex-1">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-disco-300 mb-1">
                {copy.migration.legacy.statLabel}
              </h3>
              <p className="text-4xl font-number font-bold text-white">
                {formattedLegacy}{" "}
                <span className="text-lg text-neutral-400">veYFI</span>
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {copy.migration.legacy.title}
              </h3>
              <p className="text-neutral-400 text-sm max-w-lg leading-relaxed">
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
    // POST-MIGRATION STATE (Uses Locked YFI Amount)
    return (
      <Card className="border-disco-200 bg-disco-50/50">
        <div className="flex flex-col md:flex-row items-stretch gap-8">
          {/* Left: Info */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-disco-900">
                {copy.migration.boost.title}
              </h3>
              <p className="text-disco-800 text-sm max-w-md leading-relaxed">
                {copy.migration.boost.description}
              </p>
            </div>

            <div className="flex gap-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-disco-700 mb-0.5">
                  {copy.migration.boost.stats.unlockDate}
                </p>
                <p className="font-number font-bold text-disco-900">
                  {unlockDateLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-disco-700 mb-0.5">
                  {copy.migration.boost.stats.amount}
                </p>
                <p className="font-number font-bold text-disco-900">
                  {formattedLocked} YFI
                </p>
              </div>
            </div>

            <a
              href="https://yearn.fi/veyfi"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-bold uppercase tracking-wide text-disco-700 hover:text-disco-900 underline decoration-disco-300 underline-offset-4"
            >
              {copy.migration.boost.manageLink}
            </a>
          </div>

          {/* Right: Visualization */}
          <div className="w-full md:w-80 bg-white rounded-xl border border-disco-100 p-6 flex flex-col justify-center space-y-6 shadow-sm">
            {/* Hero Number */}
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1">
                {copy.migration.boost.stats.currentBoost}
              </p>
              <p className="text-5xl font-number font-bold text-disco-600 tracking-tight">
                {currentBoost.toFixed(2)}x
              </p>
            </div>

            {/* Timeline */}
            <div>
              {/* Labels */}
              <div className="flex justify-between text-[10px] font-bold uppercase text-neutral-400 mb-2">
                <span>{copy.migration.boost.timeline.start}</span>
                <span>{copy.migration.boost.timeline.end}</span>
              </div>

              {/* Track Container (Relative parent for marker) */}
              <div className="relative h-2 w-full">
                {/* Track Background */}
                <div className="absolute inset-0 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-r from-disco-500 to-neutral-200 opacity-20" />
                </div>

                {/* Marker */}
                <div
                  className="absolute -top-1 w-4 h-4 bg-white border-4 border-disco-600 rounded-full shadow-md transition-all duration-500 ease-out"
                  style={{
                    left: `${timelineProgress}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
