import { Badge } from "@/components/ui/Badge";
import { getButtonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatAddress } from "@/lib/format";
import {
  formatTeamsTokenAmount,
  formatTeamsUsd,
  getFinancialNetState,
  isTeamsFundingApprovalClaimable,
  isTeamsFundingApprovalReturnable,
  type TeamRecord,
  type TeamsViewerContext,
} from "@/lib/clients/teams";
import { BonusCard } from "./BonusCard";
import { FundingApprovalsTable } from "./FundingApprovalsTable";
import { RevenueDepositCard } from "./RevenueDepositCard";
import { TeamLifecycleCard } from "./TeamLifecycleCard";
import { TeamOverviewCard } from "./TeamOverviewCard";
import { teamsCopy } from "../messages";

type TeamWorkspaceProps = {
  team: TeamRecord | null;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  onUpdateTeam: (team: TeamRecord) => void;
  revenueCardKey: string;
  state: "ready" | "loading" | "empty";
};

export function TeamWorkspace({
  team,
  viewer,
  currentPeriod,
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
      <section className="space-y-8" aria-busy="true">
        <WorkspaceStateOverview
          title={teamsCopy.workspace.loadingTitle}
          description={teamsCopy.workspace.loadingBody}
          state="loading"
        />
        <ActionDeckSkeleton />
        <section id="revenue" className="scroll-mt-24">
          <RevenueDepositCard
            key={revenueCardKey}
            team={null}
            viewer={null}
            currentPeriod={null}
            onUpdateTeam={onUpdateTeam}
            state="loading"
          />
        </section>
        <section id="funding" className="scroll-mt-24 space-y-4">
          <OutflowsHeader />
          <WorkspaceSectionStateCard
            title={teamsCopy.funding.title}
            description={teamsCopy.funding.description}
            body={teamsCopy.funding.emptyBody}
            state="loading"
          />
        </section>
        <section id="bonus" className="scroll-mt-24">
          <WorkspaceSectionStateCard
            title={teamsCopy.bonus.title}
            description={teamsCopy.bonus.description}
            body={teamsCopy.bonus.placeholders.loading}
            state="loading"
          />
        </section>
        <section id="lifecycle" className="scroll-mt-24">
          <WorkspaceSectionStateCard
            title={teamsCopy.lifecycle.title}
            description={teamsCopy.lifecycle.description}
            body={teamsCopy.lifecycle.placeholders.loading}
            state="loading"
          />
        </section>
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
      <section className="space-y-8">
        <WorkspaceStateOverview
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
          state="idle"
        />
        <ActionDeckSkeleton />
        <section id="revenue" className="scroll-mt-24">
          <RevenueDepositCard
            key={revenueCardKey}
            team={null}
            viewer={null}
            currentPeriod={null}
            onUpdateTeam={onUpdateTeam}
            state={workspaceState === "empty" ? "empty" : "ready"}
          />
        </section>
        <section id="funding" className="scroll-mt-24 space-y-4">
          <OutflowsHeader />
          <WorkspaceSectionStateCard
            title={teamsCopy.funding.emptyTitle}
            description={teamsCopy.funding.emptyBody}
            body={teamsCopy.funding.emptyBody}
            state="idle"
          />
        </section>
        <section id="bonus" className="scroll-mt-24">
          <WorkspaceSectionStateCard
            title={teamsCopy.bonus.title}
            description={teamsCopy.bonus.description}
            body={placeholderBody.bonus}
            state="idle"
          />
        </section>
        <section id="lifecycle" className="scroll-mt-24">
          <WorkspaceSectionStateCard
            title={teamsCopy.lifecycle.title}
            description={teamsCopy.lifecycle.description}
            body={placeholderBody.lifecycle}
            state="idle"
          />
        </section>
      </section>
    );
  }

  const readyTeam = team;
  if (!readyTeam) {
    return null;
  }

  const status = teamsCopy.statuses[readyTeam.status];

  return (
    <section className="space-y-8">
      <section id="overview" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {readyTeam.readOnlyReason ? (
                <Badge variant="neutral">
                  {teamsCopy.readOnlyReasons[readyTeam.readOnlyReason]}
                </Badge>
              ) : null}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-text-primary">{readyTeam.name}</h2>
              <p className="font-number text-sm text-text-secondary">{readyTeam.id}</p>
            </div>
          </div>
          <div className="rounded-box border border-border bg-surface px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
              {teamsCopy.workspace.fields.viewer}
            </p>
            <p className="text-sm font-bold text-text-primary">
              {viewer ? teamsCopy.viewerRoles[viewer.role] : teamsCopy.viewerRoles.observer}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <WorkspaceSummaryCard team={readyTeam} />
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
        </div>
      </section>

      <ActionDeck team={readyTeam} viewer={viewer} currentPeriod={currentPeriod} />

      <section id="revenue" className="scroll-mt-24">
        <RevenueDepositCard
          key={revenueCardKey}
          team={readyTeam}
          viewer={viewer}
          currentPeriod={currentPeriod}
          onUpdateTeam={onUpdateTeam}
          state={state}
        />
      </section>

      <section id="funding" className="scroll-mt-24 space-y-4">
        <OutflowsHeader />
        {currentPeriod !== null ? (
          <FundingApprovalsTable
            team={readyTeam}
            viewer={viewer}
            currentPeriod={currentPeriod}
            onUpdateTeam={onUpdateTeam}
          />
        ) : null}
      </section>

      <section id="bonus" className="scroll-mt-24">
        <BonusCard
          key={getBonusCardKey(readyTeam, viewer)}
          bonus={readyTeam.bonus}
          canClaimBonus={viewer?.canClaimBonus ?? false}
        />
      </section>

      <section id="lifecycle" className="scroll-mt-24">
        <TeamLifecycleCard team={readyTeam} />
      </section>
    </section>
  );
}

function WorkspaceSummaryCard({ team }: { team: TeamRecord }) {
  const net = getFinancialNetState(team.currentPeriod);
  const netToneClassName =
    net.tone === "profit"
      ? "text-green-700"
      : net.tone === "loss"
        ? "text-red-700"
        : "text-text-primary";

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.workspace.title}
        </p>
        <h3 className="text-xl font-bold text-text-primary">{teamsCopy.workspace.title}</h3>
        <p className="text-sm leading-6 text-text-secondary">
          {teamsCopy.workspace.description}
        </p>
      </div>
      <dl className="space-y-3">
        <SummaryRow label={teamsCopy.workspace.fields.owner} value={formatAddress(team.owner)} />
        <SummaryRow
          label={teamsCopy.workspace.fields.pendingOwner}
          value={
            team.pendingOwner
              ? formatAddress(team.pendingOwner)
              : teamsCopy.lifecycle.pendingOwnerNone
          }
        />
        <SummaryRow
          label={teamsCopy.workspace.fields.teamId}
          value={team.address ? formatAddress(team.address) : team.id}
        />
      </dl>
      <div className="rounded-box border border-border bg-app px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {net.label}
        </p>
        <p className={`mt-1 font-number text-3xl font-bold ${netToneClassName}`}>
          {formatTeamsUsd(net.value)}
        </p>
      </div>
    </Card>
  );
}

function ActionDeck({
  team,
  viewer,
  currentPeriod,
}: {
  team: TeamRecord;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
}) {
  const claimableCount = team.fundingApprovals.filter(isTeamsFundingApprovalClaimable).length;
  const returnableCount = team.fundingApprovals.filter(isTeamsFundingApprovalReturnable).length;
  const bonusAmount = formatTeamsTokenAmount(team.bonus.totalClaimable, team.bonus.tokenSymbol);
  const canDeposit = Boolean(viewer?.canDepositRevenue) && !team.readOnlyReason;

  return (
    <section aria-labelledby="teams-action-deck-title" className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.workspace.actionDeck.title}
        </p>
        <h3 id="teams-action-deck-title" className="text-2xl font-bold text-text-primary">
          {teamsCopy.workspace.actionDeck.title}
        </h3>
        <p className="max-w-3xl text-sm leading-6 text-text-secondary">
          {teamsCopy.workspace.actionDeck.description}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionDeckCard
          title={teamsCopy.workspace.actionDeck.revenueTitle}
          body={teamsCopy.workspace.actionDeck.revenueBody}
          metric={canDeposit ? "Open" : teamsCopy.revenue.unavailable.disabledCta}
          href="#revenue"
          cta={teamsCopy.workspace.actionDeck.revenueCta}
        />
        <ActionDeckCard
          title={teamsCopy.workspace.actionDeck.fundingTitle}
          body={teamsCopy.workspace.actionDeck.fundingBody}
          metric={`${claimableCount.toLocaleString("en-US")} claimable / ${returnableCount.toLocaleString("en-US")} returnable`}
          href="#funding"
          cta={teamsCopy.workspace.actionDeck.fundingCta}
        />
        <ActionDeckCard
          title={teamsCopy.workspace.actionDeck.bonusTitle}
          body={teamsCopy.workspace.actionDeck.bonusBody}
          metric={bonusAmount}
          href="#bonus"
          cta={teamsCopy.workspace.actionDeck.bonusCta}
        />
        <ActionDeckCard
          title={teamsCopy.workspace.actionDeck.lifecycleTitle}
          body={teamsCopy.workspace.actionDeck.lifecycleBody}
          metric={currentPeriod === null ? "--" : `Period #${currentPeriod}`}
          href="#lifecycle"
          cta={teamsCopy.workspace.actionDeck.lifecycleCta}
        />
      </div>
    </section>
  );
}

function ActionDeckSkeleton() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} variant="flat" className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    </section>
  );
}

function ActionDeckCard({
  title,
  body,
  metric,
  href,
  cta,
}: {
  title: string;
  body: string;
  metric: string;
  href: string;
  cta: string;
}) {
  return (
    <Card variant="flat" className="flex min-h-[17rem] flex-col gap-4">
      <div className="space-y-2">
        <h4 className="text-lg font-bold text-text-primary">{title}</h4>
        <p className="text-sm leading-6 text-text-secondary">{body}</p>
      </div>
      <p className="mt-auto font-number text-2xl font-bold text-text-primary">{metric}</p>
      <a href={href} className={getButtonClassName({ variant: "secondary", className: "w-full" })}>
        {cta}
      </a>
    </Card>
  );
}

function OutflowsHeader() {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {teamsCopy.workspace.outflows.title}
      </p>
      <h3 className="text-2xl font-bold text-text-primary">
        {teamsCopy.workspace.outflows.title}
      </h3>
      <p className="max-w-3xl text-sm leading-6 text-text-secondary">
        {teamsCopy.workspace.outflows.description}
      </p>
    </div>
  );
}

function WorkspaceStateOverview({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: "loading" | "idle";
}) {
  return (
    <section id="overview" className="scroll-mt-24">
      <Card className="space-y-5">
        <WorkspaceHeader title={title} description={description} />
        {state === "loading" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}
      </Card>
    </section>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className="text-right font-number text-sm font-bold text-text-primary">{value}</dd>
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
