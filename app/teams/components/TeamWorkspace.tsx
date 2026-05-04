import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import type { TeamRecord, TeamsViewerContext } from "@/lib/clients/teams";
import type { TeamWorkspaceTab } from "../TeamsPageClient";
import { BonusCard } from "./BonusCard";
import { FundingApprovalsTable } from "./FundingApprovalsTable";
import { RevenueDepositCard } from "./RevenueDepositCard";
import { TeamLifecycleCard } from "./TeamLifecycleCard";
import { TeamOverviewCard } from "./TeamOverviewCard";
import { teamsCopy } from "../messages";

type TeamWorkspaceProps = {
  activeTab: TeamWorkspaceTab;
  team: TeamRecord | null;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  onTabChange: (tab: TeamWorkspaceTab) => void;
  onUpdateTeam: (team: TeamRecord) => void;
  revenueCardKey: string;
  state: "ready" | "loading" | "empty";
};

function getWorkspaceTabId(tabId: string) {
  return `teams-workspace-tab-${tabId}`;
}

export function TeamWorkspace({
  activeTab,
  team,
  viewer,
  currentPeriod,
  onTabChange,
  onUpdateTeam,
  revenueCardKey,
  state,
}: TeamWorkspaceProps) {
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
      <section className="space-y-4" aria-busy="true">
        <WorkspaceTabs activeTab={activeTab} onTabChange={onTabChange} />
        <div
          id="overview"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("overview")}
          hidden={activeTab !== "overview"}
        >
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
        </div>
        <div
          id="revenue"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("revenue")}
          hidden={activeTab !== "revenue"}
        >
          <RevenueDepositCard
            key={revenueCardKey}
            team={null}
            viewer={null}
            currentPeriod={null}
            onUpdateTeam={onUpdateTeam}
            state="loading"
          />
        </div>
        <div
          id="funding"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("funding")}
          hidden={activeTab !== "funding"}
        >
          <WorkspaceSectionStateCard
            title={teamsCopy.funding.title}
            description={teamsCopy.funding.description}
            body={teamsCopy.funding.emptyBody}
            state="loading"
          />
        </div>
        <div
          id="bonus"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("bonus")}
          hidden={activeTab !== "bonus"}
        >
          <WorkspaceSectionStateCard
            title={teamsCopy.bonus.title}
            description={teamsCopy.bonus.description}
            body={teamsCopy.bonus.placeholders.loading}
            state="loading"
          />
        </div>
        <div
          id="lifecycle"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("lifecycle")}
          hidden={activeTab !== "lifecycle"}
        >
          <WorkspaceSectionStateCard
            title={teamsCopy.lifecycle.title}
            description={teamsCopy.lifecycle.description}
            body={teamsCopy.lifecycle.placeholders.loading}
            state="loading"
          />
        </div>
      </section>
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
      <section className="space-y-4">
        <WorkspaceTabs activeTab={activeTab} onTabChange={onTabChange} />
        <div
          id="overview"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("overview")}
          hidden={activeTab !== "overview"}
        >
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
        </div>

        <div
          id="revenue"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("revenue")}
          hidden={activeTab !== "revenue"}
        >
          <RevenueDepositCard
            key={revenueCardKey}
            team={null}
            viewer={null}
            currentPeriod={null}
            onUpdateTeam={onUpdateTeam}
            state={workspaceState === "empty" ? "empty" : "ready"}
          />
        </div>

        <div
          id="funding"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("funding")}
          hidden={activeTab !== "funding"}
        >
          <WorkspaceSectionStateCard
            title={teamsCopy.funding.emptyTitle}
            description={teamsCopy.funding.emptyBody}
            body={teamsCopy.funding.emptyBody}
            state="idle"
          />
        </div>

        <div
          id="bonus"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("bonus")}
          hidden={activeTab !== "bonus"}
        >
          <WorkspaceSectionStateCard
            title={teamsCopy.bonus.title}
            description={teamsCopy.bonus.description}
            body={placeholderBody.bonus}
            state="idle"
          />
        </div>

        <div
          id="lifecycle"
          role="tabpanel"
          aria-labelledby={getWorkspaceTabId("lifecycle")}
          hidden={activeTab !== "lifecycle"}
        >
          <WorkspaceSectionStateCard
            title={teamsCopy.lifecycle.title}
            description={teamsCopy.lifecycle.description}
            body={placeholderBody.lifecycle}
            state="idle"
          />
        </div>
      </section>
    );
  }

  const readyTeam = team;
  if (!readyTeam) {
    return null;
  }

  const status = teamsCopy.statuses[readyTeam.status];

  return (
    <section className="space-y-4">
      <WorkspaceTabs activeTab={activeTab} onTabChange={onTabChange} />

      <div
        id="overview"
        role="tabpanel"
        aria-labelledby={getWorkspaceTabId("overview")}
        hidden={activeTab !== "overview"}
      >
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                {readyTeam.readOnlyReason ? (
                  <Badge variant="neutral">
                    {teamsCopy.readOnlyReasons[readyTeam.readOnlyReason]}
                  </Badge>
                ) : null}
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
      </div>

      <div
        id="revenue"
        role="tabpanel"
        aria-labelledby={getWorkspaceTabId("revenue")}
        hidden={activeTab !== "revenue"}
      >
        <RevenueDepositCard
          key={revenueCardKey}
          team={readyTeam}
          viewer={viewer}
          currentPeriod={currentPeriod}
          onUpdateTeam={onUpdateTeam}
          state={state}
        />
      </div>

      <div
        id="funding"
        role="tabpanel"
        aria-labelledby={getWorkspaceTabId("funding")}
        hidden={activeTab !== "funding"}
      >
        {currentPeriod !== null ? (
          <FundingApprovalsTable
            team={readyTeam}
            viewer={viewer}
            currentPeriod={currentPeriod}
            onUpdateTeam={onUpdateTeam}
          />
        ) : null}
      </div>

      <div
        id="bonus"
        role="tabpanel"
        aria-labelledby={getWorkspaceTabId("bonus")}
        hidden={activeTab !== "bonus"}
      >
        <BonusCard
          key={getBonusCardKey(readyTeam, viewer)}
          bonus={readyTeam.bonus}
          canClaimBonus={viewer?.canClaimBonus ?? false}
        />
      </div>

      <div
        id="lifecycle"
        role="tabpanel"
        aria-labelledby={getWorkspaceTabId("lifecycle")}
        hidden={activeTab !== "lifecycle"}
      >
        <TeamLifecycleCard team={readyTeam} />
      </div>
    </section>
  );
}

function WorkspaceTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TeamWorkspaceTab;
  onTabChange: (tab: TeamWorkspaceTab) => void;
}) {
  return (
    <Tabs
      aria-label="Team workspace sections"
      activeTab={activeTab}
      getPanelId={(tabId) => tabId}
      getTabId={getWorkspaceTabId}
      onChange={(tabId) => onTabChange(tabId as TeamWorkspaceTab)}
      variant="pill"
      className="max-w-full overflow-x-auto"
      tabs={[
        { id: "overview", label: teamsCopy.workspace.tabs.overview },
        { id: "revenue", label: teamsCopy.workspace.tabs.revenue },
        { id: "funding", label: teamsCopy.workspace.tabs.funding },
        { id: "bonus", label: teamsCopy.workspace.tabs.bonus },
        { id: "lifecycle", label: teamsCopy.workspace.tabs.lifecycle },
      ]}
    />
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
