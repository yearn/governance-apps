import { formatAddress } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TeamRecord, TeamsViewerContext } from "@/lib/clients/teams";
import { FundingApprovalsTable } from "./FundingApprovalsTable";
import { TeamOverviewCard } from "./TeamOverviewCard";
import { teamsCopy } from "../messages";

type TeamWorkspaceProps = {
  team: TeamRecord | null;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  onUpdateTeam: (team: TeamRecord) => void;
  state: "ready" | "loading" | "empty";
};

export function TeamWorkspace({
  team,
  viewer,
  currentPeriod,
  onUpdateTeam,
  state,
}: TeamWorkspaceProps) {
  if (state === "loading") {
    return (
      <Card className="space-y-5" aria-busy="true">
        <WorkspaceHeader
          title={teamsCopy.workspace.loadingTitle}
          description={teamsCopy.workspace.loadingBody}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="space-y-4">
        <WorkspaceHeader
          title={teamsCopy.workspace.noTeamsTitle}
          description={teamsCopy.workspace.noTeamsBody}
        />
      </Card>
    );
  }

  if (!team) {
    return (
      <Card className="space-y-4">
        <WorkspaceHeader
          title={teamsCopy.workspace.emptyTitle}
          description={teamsCopy.workspace.emptyBody}
        />
      </Card>
    );
  }

  const status = teamsCopy.statuses[team.status];

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {team.readOnlyReason && (
                <Badge variant="neutral">
                  {teamsCopy.readOnlyReasons[team.readOnlyReason]}
                </Badge>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{team.name}</h2>
              <p className="text-sm text-text-secondary">{team.id}</p>
            </div>
          </div>
          <div className="rounded-box border border-border bg-app px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
              {teamsCopy.workspace.fields.viewer}
            </p>
            <p className="text-sm font-bold text-text-primary">
              {viewer ? teamsCopy.viewerRoles[viewer.role] : teamsCopy.viewerRoles.observer}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TeamOverviewCard
            title={teamsCopy.workspace.cards.current}
            financials={team.currentPeriod}
          />
          <TeamOverviewCard
            title={teamsCopy.workspace.cards.lifetime}
            financials={team.lifetime}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <WorkspaceHeader
          title={teamsCopy.workspace.title}
          description={teamsCopy.workspace.description}
        />
        <dl className="grid gap-4 sm:grid-cols-2">
          <WorkspaceField
            label={teamsCopy.workspace.fields.teamId}
            value={team.id}
          />
          <WorkspaceField
            label={teamsCopy.workspace.fields.owner}
            value={formatAddress(team.owner)}
          />
          <WorkspaceField
            label={teamsCopy.workspace.fields.pendingOwner}
            value={
              team.pendingOwner ? formatAddress(team.pendingOwner) : "No pending transfer"
            }
          />
          <WorkspaceField
            label={teamsCopy.workspace.fields.migration}
            value={team.lifecycle.migrationReadiness}
          />
          <WorkspaceField
            label={teamsCopy.workspace.fields.successor}
            value={team.lifecycle.successorTeamId ?? "No successor"}
          />
          <WorkspaceField
            label={teamsCopy.workspace.fields.retirement}
            value={formatRetirement(team)}
          />
        </dl>
      </Card>

      {currentPeriod !== null ? (
        <FundingApprovalsTable
          team={team}
          viewer={viewer}
          currentPeriod={currentPeriod}
          onUpdateTeam={onUpdateTeam}
        />
      ) : null}
    </div>
  );
}

function WorkspaceHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
      <p className="text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}

function WorkspaceField({
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
  const announcedAt = team.lifecycle.retirementAnnouncedAt;

  if (team.status === "active") {
    return teamsCopy.workspace.retirement.active;
  }

  const effectiveLabel =
    effectivePeriod === null
      ? "not scheduled"
      : `${team.status === "retired" ? teamsCopy.workspace.retirement.retiredPrefix : teamsCopy.workspace.retirement.retiringPrefix} ${effectivePeriod}`;

  if (announcedAt === null) {
    return effectiveLabel;
  }

  const announcedDate = new Date(announcedAt * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${effectiveLabel} • ${teamsCopy.workspace.retirement.announcedPrefix} ${announcedDate}`;
}
