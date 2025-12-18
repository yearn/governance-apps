"use client";

import { MigrationCard } from "./MigrationCard";
import { RedemptionStatusCard } from "./RedemptionStatusCard";
import { LlyfiTokenTable } from "./LlyfiTokenTable";
import { VeyfiRewardsCard } from "./VeyfiRewardsCard";

export function VeyfiCockpit() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Zone 1: Migration (Conditionally rendered inside) */}
      <MigrationCard />

      {/* Zone 2: Redemption Intelligence */}
      <RedemptionStatusCard />

      {/* Zone 3: Main Ledger */}
      <LlyfiTokenTable />

      {/* Zone 4: Rewards & Navigation */}
      <VeyfiRewardsCard />
    </div>
  );
}
