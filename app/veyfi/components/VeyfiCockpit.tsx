"use client";

import { MigrationCard } from "./MigrationCard";
import { InventoryCard } from "./InventoryCard";
import { LlyfiTokenTable } from "./LlyfiTokenTable";
import { VeyfiRewardsCard } from "./VeyfiRewardsCard";

type VeyfiCockpitProps = {
  hostname?: string | null;
};

export function VeyfiCockpit({ hostname }: VeyfiCockpitProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Zone 1: Migration (Conditionally rendered inside) */}
      <MigrationCard />

      {/* Zone 2: Main Ledger */}
      <LlyfiTokenTable />

      {/* Zone 3: Redemption Intelligence & Rewards */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <InventoryCard />
        <VeyfiRewardsCard hostname={hostname} />
      </div>
    </div>
  );
}
