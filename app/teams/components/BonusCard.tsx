import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  formatTeamsPercentFromBps,
  formatTeamsTokenAmount,
  formatTeamsUsd,
  type TeamBonusState,
} from "@/lib/clients/teams";
import { teamsCopy } from "../messages";

type BonusCardProps = {
  bonus: TeamBonusState;
};

export function BonusCard({ bonus }: BonusCardProps) {
  const status = teamsCopy.bonus.statuses[bonus.status];
  const pendingPeriods = bonus.periods.filter(
    (period) => period.status === "pending-finalization"
  ).length;

  return (
    <Card id="bonus" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
            {teamsCopy.workspace.title}
          </p>
          <h3 className="text-xl font-bold text-text-primary">{teamsCopy.bonus.title}</h3>
          <p className="text-sm leading-6 text-text-secondary">
            {teamsCopy.bonus.description}
          </p>
        </div>

        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <BonusMetric
          label={teamsCopy.bonus.summary.claimable}
          value={formatTeamsTokenAmount(bonus.totalClaimable, bonus.tokenSymbol)}
        />
        <BonusMetric
          label={teamsCopy.bonus.summary.periods}
          value={formatPeriodCount(bonus.includedPeriodCount)}
        />
        <BonusMetric
          label={teamsCopy.bonus.summary.awaitingFinalization}
          value={
            pendingPeriods > 0
              ? formatPeriodCount(pendingPeriods)
              : teamsCopy.bonus.summary.noPendingFinalization
          }
        />
      </dl>

      <div className="rounded-box border border-border bg-app px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.bonus.summary.currentState}
        </p>
        <p className="mt-1 text-sm leading-6 text-text-primary">
          {getBonusSummary(bonus, pendingPeriods)}
        </p>
      </div>

      <details className="group rounded-box border border-border bg-app">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-text-primary transition-colors hover:text-yearn-blue">
          {teamsCopy.bonus.periodDetailSummary}
        </summary>

        <div className="space-y-3 border-t border-border px-4 py-4">
          {bonus.periods.length > 0 ? (
            bonus.periods.map((period) => {
              const periodStatus = teamsCopy.bonus.periodStatuses[period.status];

              return (
                <div
                  key={period.period}
                  className="rounded-box border border-border bg-surface px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-text-primary">
                          {teamsCopy.bonus.periodLabel(period.period)}
                        </p>
                        <Badge variant={periodStatus.variant}>{periodStatus.label}</Badge>
                      </div>
                      <p className="text-sm leading-6 text-text-secondary">
                        {teamsCopy.bonus.periodStatuses[period.status].body}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
                          {teamsCopy.bonus.periodClaimable}
                        </p>
                        <p className="font-number text-base font-bold text-text-primary">
                          {formatTeamsTokenAmount(period.claimableYfi, bonus.tokenSymbol)}
                        </p>
                      </div>
                      <Tooltip content={<BonusMathTooltip bonus={bonus} period={period} />}>
                        <button
                          type="button"
                          className="rounded-box border border-border px-3 py-2 text-xs font-bold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                        >
                          {teamsCopy.bonus.mathTrigger}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-text-secondary">{teamsCopy.bonus.noPeriods}</p>
          )}
        </div>
      </details>
    </Card>
  );
}

function BonusMathTooltip({
  bonus,
  period,
}: {
  bonus: TeamBonusState;
  period: TeamBonusState["periods"][number];
}) {
  return (
    <dl className="grid min-w-[220px] gap-2">
      <MathRow
        label={teamsCopy.bonus.math.profit}
        value={formatTeamsUsd(period.profitUsd)}
      />
      <MathRow
        label={teamsCopy.bonus.math.spotPrice}
        value={formatTeamsUsd(period.spotPriceUsd, 2)}
      />
      <MathRow
        label={teamsCopy.bonus.math.adjustedPrice}
        value={formatTeamsUsd(period.adjustedPriceUsd, 2)}
      />
      <MathRow
        label={teamsCopy.bonus.math.growthFactor}
        value={formatTeamsPercentFromBps(period.growthFactorBps)}
      />
      <MathRow
        label={teamsCopy.bonus.math.ybcSplit}
        value={formatTeamsPercentFromBps(period.ybcSplitBps)}
      />
      <MathRow
        label={teamsCopy.bonus.math.yfiOutput}
        value={formatTeamsTokenAmount(period.claimableYfi, bonus.tokenSymbol)}
      />
    </dl>
  );
}

function BonusMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-box border border-border bg-app px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className="mt-1 font-number text-base font-bold text-text-primary">{value}</dd>
    </div>
  );
}

function MathRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-number font-bold text-neutral-900">{value}</dd>
    </div>
  );
}

function formatPeriodCount(count: number) {
  return teamsCopy.bonus.periodCount(count);
}

function getBonusSummary(bonus: TeamBonusState, pendingPeriods: number) {
  if (bonus.status === "claimable") {
    return pendingPeriods > 0
      ? teamsCopy.bonus.summaries.claimableWithPending(
          formatTeamsTokenAmount(bonus.totalClaimable, bonus.tokenSymbol),
          pendingPeriods
        )
      : teamsCopy.bonus.summaries.claimable(
          formatTeamsTokenAmount(bonus.totalClaimable, bonus.tokenSymbol)
        );
  }

  if (bonus.status === "pending-finalization") {
    return teamsCopy.bonus.summaries.pendingFinalization(pendingPeriods || 1);
  }

  if (bonus.status === "claimed") {
    return teamsCopy.bonus.summaries.claimed;
  }

  return bonus.periods.length > 0
    ? teamsCopy.bonus.summaries.noneWithHistory
    : teamsCopy.bonus.summaries.none;
}
