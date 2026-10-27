import { ProgressBar } from "@/components/ui/ProgressBar";
import { UtcTime } from "@/components/ui/UtcTime";
import { formatDecimalAmount } from "@/lib/format";
import { getYbcWeightSummary } from "@/lib/clients/ybc/weight-display";
import type { YbcWeightRecord } from "@/lib/clients/ybc";
import { ybcCopy } from "../messages";

export function MemberWeightProgress({ weight, removed = false }: { weight: YbcWeightRecord; removed?: boolean }) {
  const summary = getYbcWeightSummary(weight);
  const copy = ybcCopy.members.states;
  const inactive = removed || summary.state === "empty" || summary.state === "unavailable";
  const label = removed ? copy.removed : summary.state === "empty" ? copy.noStake : summary.state === "unavailable" ? copy.unavailable : copy.activePercent(summary.activeBps / 100);
  return (
    <div className="min-w-0 space-y-2" data-weight-state={removed ? "removed" : summary.state}>
      <p className="font-number text-xs font-bold tabular-nums text-text-secondary">{label}</p>
      <ProgressBar
        value={inactive ? 0 : summary.activeBps / 100}
        className="h-2.5 bg-neutral-200"
        role={inactive ? undefined : "progressbar"}
        aria-hidden={inactive || undefined}
        aria-label={inactive ? undefined : ybcCopy.members.columns.maturity}
        aria-valuemin={inactive ? undefined : 0}
        aria-valuemax={inactive ? undefined : 100}
        aria-valuenow={inactive ? undefined : summary.activeBps / 100}
      />
      <p className="text-xs leading-5 text-text-secondary">
        {removed ? copy.removedBody : summary.state === "empty" ? copy.noStakeBody : summary.state === "unavailable" ? copy.unavailableBody : summary.state === "active" ? copy.fullyMatured : copy.remaining(formatDecimalAmount(summary.remainingWeight, 4))}
      </p>
      {summary.maturesAt !== null && !removed ? <p className="text-xs leading-5 text-text-secondary">{copy.maturesOn} <UtcTime timestamp={summary.maturesAt} format="date" /> UTC</p> : null}
    </div>
  );
}
