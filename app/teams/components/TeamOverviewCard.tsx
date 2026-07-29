import { Card } from "@/components/ui/Card";
import {
  formatTeamsUsd,
  getFinancialNetState,
  type TeamFinancials,
} from "@/lib/clients/teams";
import { teamsCopy } from "../messages";

type TeamOverviewCardProps = {
  title: string;
  financials: TeamFinancials;
};

export function TeamOverviewCard({
  title,
  financials,
}: TeamOverviewCardProps) {
  const netState = getFinancialNetState(financials);
  const netToneClassName =
    netState.tone === "profit"
      ? "text-green-700"
      : netState.tone === "loss"
        ? "text-red-700"
        : "text-text-primary";

  return (
    <Card className="min-w-0 space-y-4">
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>

      <dl className="grid gap-3 sm:grid-cols-2">
        <OverviewMetric
          label={teamsCopy.workspace.cards.revenue}
          value={formatTeamsUsd(financials.revenueUsd)}
        />
        <OverviewMetric
          label={teamsCopy.workspace.cards.cost}
          value={formatTeamsUsd(financials.costUsd)}
        />
        <OverviewMetric
          className="sm:col-span-2"
          label={netState.label}
          value={formatTeamsUsd(netState.value)}
          valueClassName={netToneClassName}
        />
      </dl>
    </Card>
  );
}

function OverviewMetric({
  className,
  label,
  value,
  valueClassName,
}: {
  className?: string;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1 rounded-box border border-border bg-app px-4 py-3 ${className ?? ""}`}>
      <dt className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className={`break-words font-number text-base font-bold text-text-primary [overflow-wrap:anywhere] ${valueClassName ?? ""}`}>
        {value}
      </dd>
    </div>
  );
}
