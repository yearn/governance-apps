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
    <Card className="min-w-0 space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.workspace.title}
        </p>
        <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <OverviewMetric
          label={teamsCopy.workspace.cards.revenue}
          value={formatTeamsUsd(financials.revenueUsd)}
        />
        <OverviewMetric
          label={teamsCopy.workspace.cards.cost}
          value={formatTeamsUsd(financials.costUsd)}
        />
        <OverviewMetric
          label={teamsCopy.workspace.cards.profit}
          value={formatTeamsUsd(financials.profitUsd)}
        />
        <OverviewMetric
          label={teamsCopy.workspace.cards.loss}
          value={formatTeamsUsd(financials.lossUsd)}
        />
      </dl>

      <div className="min-w-0 rounded-box border border-border bg-app px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {netState.label}
        </p>
        <p
          className={`break-words font-number text-lg font-bold [overflow-wrap:anywhere] ${netToneClassName}`}
        >
          {formatTeamsUsd(netState.value)}
        </p>
      </div>
    </Card>
  );
}

function OverviewMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1 rounded-box border border-border bg-app px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className="break-words font-number text-base font-bold text-text-primary [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
