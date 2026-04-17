import { formatAddress } from "@/lib/format";
import {
  formatTeamsDate,
  type TeamRecord,
} from "@/lib/clients/teams";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { teamsCopy } from "../messages";

type TeamLifecycleCardProps = {
  team: TeamRecord;
};

export function TeamLifecycleCard({ team }: TeamLifecycleCardProps) {
  const teamStatus = teamsCopy.statuses[team.status];
  const migrationState = teamsCopy.lifecycle.migrationReadiness[team.lifecycle.migrationReadiness];

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
            {teamsCopy.workspace.title}
          </p>
          <h3 className="text-xl font-bold text-text-primary">
            {teamsCopy.lifecycle.title}
          </h3>
          <p className="text-sm leading-6 text-text-secondary">
            {teamsCopy.lifecycle.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={teamStatus.variant}>{teamStatus.label}</Badge>
          <Badge variant={migrationState.variant}>{migrationState.label}</Badge>
        </div>
      </div>

      <div className="rounded-box border border-border bg-app px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.lifecycle.atAGlance}
        </p>
        <p className="mt-1 text-sm leading-6 text-text-primary">
          {getLifecycleSummary(team)}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <LifecycleField
          label={teamsCopy.lifecycle.fields.owner}
          value={formatAddress(team.owner)}
        />
        <LifecycleField
          label={teamsCopy.lifecycle.fields.pendingOwner}
          value={
            team.pendingOwner
              ? formatAddress(team.pendingOwner)
              : teamsCopy.lifecycle.pendingOwnerNone
          }
        />
        <LifecycleField
          label={teamsCopy.lifecycle.fields.retirement}
          value={formatRetirement(team)}
        />
        <LifecycleField
          label={teamsCopy.lifecycle.fields.migration}
          value={migrationState.label}
        />
        <LifecycleField
          label={teamsCopy.lifecycle.fields.successor}
          value={team.lifecycle.successorTeamId ?? teamsCopy.lifecycle.successorNone}
        />
        <LifecycleField
          label={teamsCopy.lifecycle.fields.workspaceAccess}
          value={
            team.readOnlyReason
              ? teamsCopy.readOnlyReasons[team.readOnlyReason]
              : teamsCopy.lifecycle.activeWorkspace
          }
        />
      </dl>
    </Card>
  );
}

function LifecycleField({
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
      <dd className="mt-1 text-sm font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function formatRetirement(team: TeamRecord) {
  const effectivePeriod = team.lifecycle.retirementEffectivePeriod;
  const announcedAt = formatTeamsDate(team.lifecycle.retirementAnnouncedAt);

  if (team.status === "active") {
    return teamsCopy.lifecycle.retirement.active;
  }

  const effectiveLabel =
    effectivePeriod === null
      ? teamsCopy.lifecycle.retirement.notScheduled
      : `${team.status === "retired" ? teamsCopy.lifecycle.retirement.retiredPrefix : teamsCopy.lifecycle.retirement.retiringPrefix} ${effectivePeriod}`;

  if (!announcedAt) {
    return effectiveLabel;
  }

  return `${effectiveLabel} • ${teamsCopy.lifecycle.retirement.announcedPrefix} ${announcedAt}`;
}

function getLifecycleSummary(team: TeamRecord) {
  if (team.status === "retiring") {
    return teamsCopy.lifecycle.summaries.retiring(
      team.lifecycle.retirementEffectivePeriod === null
        ? teamsCopy.lifecycle.unknownPeriod
        : `period ${team.lifecycle.retirementEffectivePeriod}`,
      team.pendingOwner ? formatAddress(team.pendingOwner) : teamsCopy.lifecycle.pendingOwnerNone
    );
  }

  if (team.status === "retired") {
    return teamsCopy.lifecycle.summaries.retired(
      team.lifecycle.successorTeamId ?? teamsCopy.lifecycle.successorNone
    );
  }

  return team.pendingOwner
    ? teamsCopy.lifecycle.summaries.activeWithPendingOwner(formatAddress(team.pendingOwner))
    : teamsCopy.lifecycle.summaries.active;
}
