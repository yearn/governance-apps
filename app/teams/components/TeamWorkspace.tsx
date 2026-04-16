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
  if (state === "loading") {
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
          <Skeleton className="h-[360px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </div>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <BonusCard bonus={team.bonus} />
        <TeamLifecycleCard team={team} />
      </div>
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
