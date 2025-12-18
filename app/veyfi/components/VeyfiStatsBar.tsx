"use client";

import { StatsBar } from "@/components/ui/StatsBar";
import { useVeyfiStats } from "@/lib/hooks/useVeyfi";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { veyfiCopy as copy } from "../messages";

export function VeyfiStatsBar() {
  const { data: stats } = useVeyfiStats();

  const migratedLabel = stats
    ? `${formatTokenAmount(stats.migratedYfi, 18, 0)} (${formatPercent(
        Number(stats.migratedYfi) / Number(stats.legacyYfiSupply || 1n),
        0
      )})`
    : "--";

  const boostLabel = stats ? `${stats.maxBoostMultiplier}x` : "--x";

  const stakedLabel = stats
    ? formatPercent(stats.totalLlyfiStakedPercent, 1)
    : "--%";

  return (
    <StatsBar
      items={[
        { label: copy.page.stats.migrated.label, value: migratedLabel },
        { label: copy.page.stats.boost.label, value: boostLabel },
        { label: copy.page.stats.staked.label, value: stakedLabel },
        {
          label: copy.page.stats.state.label,
          value: copy.page.stats.state.value,
        },
      ]}
    />
  );
}
