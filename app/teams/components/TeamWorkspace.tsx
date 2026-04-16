import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TeamRecord, TeamsViewerContext } from "@/lib/clients/teams";
import { BonusCard } from "./BonusCard";
import { TeamLifecycleCard } from "./TeamLifecycleCard";
import { TeamOverviewCard } from "./TeamOverviewCard";
import { teamsCopy } from "../messages";

type TeamWorkspaceProps = {
  team: TeamRecord | null;
  viewer: TeamsViewerContext | null;
  state: "ready" | "loading" | "empty";
};

export function TeamWorkspace({ team, viewer, state }: TeamWorkspaceProps) {
  const workspaceState =
    state === "loading"
      ? "loading"
      : state === "empty"
        ? "empty"
        : team
          ? "ready"
          : "unselected";

  if (workspaceState === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        <Card className="space-y-5">
          <WorkspaceHeader
            title={teamsCopy.workspace.loadingTitle}
            description={teamsCopy.workspace.loadingBody}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <div id="bonus">
            <WorkspaceSectionStateCard
              title={teamsCopy.bonus.title}
              description={teamsCopy.bonus.description}
              body={teamsCopy.bonus.placeholders.loading}
              state="loading"
            />
          </div>
          <div id="lifecycle">
            <WorkspaceSectionStateCard
              title={teamsCopy.lifecycle.title}
              description={teamsCopy.lifecycle.description}
              body={teamsCopy.lifecycle.placeholders.loading}
              state="loading"
            />
          </div>
        </div>
      </div>
    );
  }

  const placeholderBody =
    workspaceState === "empty"
      ? {
          bonus: teamsCopy.bonus.placeholders.empty,
          lifecycle: teamsCopy.lifecycle.placeholders.empty,
        }
      : {
          bonus: teamsCopy.bonus.placeholders.unselected,
          lifecycle: teamsCopy.lifecycle.placeholders.unselected,
        };

  if (workspaceState !== "ready") {
    return (
      <div className="space-y-4">
        <Card className="space-y-4">
          <WorkspaceHeader
            title={
              workspaceState === "empty"
                ? teamsCopy.workspace.noTeamsTitle
                : teamsCopy.workspace.emptyTitle
            }
            description={
              workspaceState === "empty"
                ? teamsCopy.workspace.noTeamsBody
                : teamsCopy.workspace.emptyBody
            }
          />
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <div id="bonus">
            <WorkspaceSectionStateCard
              title={teamsCopy.bonus.title}
              description={teamsCopy.bonus.description}
              body={placeholderBody.bonus}
              state="idle"
            />
          </div>
          <div id="lifecycle">
            <WorkspaceSectionStateCard
              title={teamsCopy.lifecycle.title}
              description={teamsCopy.lifecycle.description}
              body={placeholderBody.lifecycle}
              state="idle"
            />
          </div>
        </div>
      </div>
    );
  }

  const readyTeam = team;
  if (!readyTeam) {
    return null;
  }

  const status = teamsCopy.statuses[readyTeam.status];

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {readyTeam.readOnlyReason && (
                <Badge variant="neutral">
                  {teamsCopy.readOnlyReasons[readyTeam.readOnlyReason]}
                </Badge>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{readyTeam.name}</h2>
              <p className="text-sm text-text-secondary">{readyTeam.id}</p>
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
            financials={readyTeam.currentPeriod}
          />
          <TeamOverviewCard
            title={teamsCopy.workspace.cards.lifetime}
            financials={readyTeam.lifetime}
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <div id="bonus">
          <BonusCard
            key={getBonusCardKey(readyTeam, viewer)}
            bonus={readyTeam.bonus}
            canClaimBonus={viewer?.canClaimBonus ?? false}
          />
        </div>
        <div id="lifecycle">
          <TeamLifecycleCard team={readyTeam} />
        </div>
      </div>
    </div>
  );
}

function WorkspaceSectionStateCard({
  title,
  description,
  body,
  state,
}: {
  title: string;
  description: string;
  body: string;
  state: "loading" | "idle";
}) {
  if (state === "loading") {
    return (
      <Card className="space-y-5" aria-busy="true">
        <WorkspaceSectionHeader title={title} description={description} />
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <WorkspaceSectionHeader title={title} description={description} />
      <div className="rounded-box border border-border bg-app px-4 py-4">
        <p className="text-sm leading-6 text-text-secondary">{body}</p>
      </div>
    </Card>
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

function WorkspaceSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {teamsCopy.workspace.title}
      </p>
      <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      <p className="text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}

function getBonusCardKey(team: TeamRecord, viewer: TeamsViewerContext | null) {
  const periodKey = team.bonus.periods
    .map(
      (period) =>
        `${period.period}:${period.status}:${period.finalized}:${period.claimed}:${period.claimableYfi}`
    )
    .join("|");

  return [
    team.id,
    viewer?.role ?? "observer",
    viewer?.address ?? "no-address",
    viewer?.teamId ?? "no-team",
    viewer?.canClaimBonus ? "claimable" : "read-only",
    team.bonus.status,
    team.bonus.totalClaimable,
    team.bonus.includedPeriodCount,
    periodKey,
  ].join("::");
}
