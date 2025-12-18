"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useVeyfiAccount, useVeyfiMigration } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";

export function MigrationCard() {
  const { data } = useVeyfiAccount();
  const { write, state } = useVeyfiMigration();

  if (!data?.veYfi) return null;

  const { legacyBalance, migrationEligible, migrated } = data.veYfi;
  const showAction = legacyBalance > 0n && migrationEligible;
  // Show info if migrated OR if they have no legacy balance but we want to show the boost system exists?
  // Spec says: "If Migrated: Boost Active".
  const showInfo = migrated;

  if (showAction) {
    return (
      <Card className="bg-neutral-900 text-white border-neutral-700">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">
              {copy.migration.legacy.title}
            </h3>
            <p className="text-neutral-400 text-sm max-w-lg">
              {copy.migration.legacy.body(formatTokenAmount(legacyBalance))}
            </p>
          </div>
          <Button
            variant="veyfi"
            onClick={() => write()}
            isLoading={state.status === "mining" || state.status === "signing"}
            disabled={state.status === "mining" || state.status === "signing"}
          >
            {copy.migration.legacy.cta}
          </Button>
        </div>
      </Card>
    );
  }

  if (showInfo) {
    // Info State (Boost Decay)
    // We mock a decay value for visualization since individual boost start time isn't in account state yet
    const mockDecay = 75; // 75% remaining

    return (
      <Card className="border-disco-200 bg-disco-50/50">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-disco-900">
              {copy.migration.boost.title}
            </h3>
            <p className="text-disco-800 text-sm max-w-lg leading-relaxed">
              {copy.migration.boost.body}
            </p>
            <a
              href="https://yearn.fi/veyfi"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-bold uppercase tracking-wide text-disco-700 hover:text-disco-900 underline decoration-disco-300 underline-offset-4 mt-2"
            >
              {copy.migration.boost.manageLink}
            </a>
          </div>

          <div className="w-full md:w-1/3 space-y-2">
            <div className="flex justify-between text-xs font-bold text-disco-800 uppercase tracking-wide">
              <span>{copy.migration.boost.decayLabel}</span>
              <span>1.5x Boost</span>
            </div>
            <ProgressBar value={mockDecay} variant="veyfi" />
            <div className="flex justify-between text-[10px] font-medium text-disco-600">
              <span>Now</span>
              <span>4 Years</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
