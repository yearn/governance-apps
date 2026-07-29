import { type ReactNode, useId } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AddressLink } from "@/components/ui/ExplorerLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatTokenAmount } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  formatTeamsDate,
  formatTeamsTokenAmount,
  formatTeamsUsd,
  getFinancialNetState,
  type FundingApproval,
  isTeamsFundingApprovalClaimable,
  isTeamsFundingApprovalReturnable,
  type TeamRecord,
  type TeamsViewerContext,
} from "@/lib/clients/teams";
import type { TxState } from "@/lib/tx/types";
import { BonusCard } from "./BonusCard";
import { FundingApprovalsTable } from "./FundingApprovalsTable";
import { RevenueDepositCard, RevenueHistoryLedger } from "./RevenueDepositCard";
import { TeamLifecycleCard } from "./TeamLifecycleCard";
import { TeamOverviewCard } from "./TeamOverviewCard";
import { TeamOwnership } from "./TeamOwnership";
import { teamsCopy } from "../messages";
import type { TeamsRouteSection } from "../route-state";

type TeamWorkspaceProps = {
  team: TeamRecord | null;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  onUpdateTeam: (team: TeamRecord) => void;
  onNavigateSection: (section: TeamsRouteSection) => void;
  revenueCardKey: string;
  state: "ready" | "loading" | "empty";
  liveWrites?: TeamsLiveWriteHandlers;
};

export type TeamsLiveWriteHandlers = {
  approveRevenueDeposit: (
    team: TeamRecord,
    tokenAddress: string,
    amount: string
  ) => Promise<boolean>;
  approveFundingReturn: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<boolean>;
  depositRevenue: (
    team: TeamRecord,
    tokenAddress: string,
    amount: string,
    decimals: number
  ) => Promise<boolean>;
  claimFunding: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string,
    recipient: string
  ) => Promise<boolean>;
  returnFunding: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<boolean>;
  claimBonus: (team: TeamRecord, recipient: string) => Promise<boolean>;
  state: TxState;
};

export function TeamWorkspace({
  team,
  viewer,
  currentPeriod,
  onUpdateTeam,
  onNavigateSection,
  revenueCardKey,
  state,
  liveWrites,
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
        <section id="funding" className="scroll-mt-24">
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
        <section id="funding" className="scroll-mt-24">
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-box border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {readyTeam.readOnlyReason ? (
              <Badge variant="neutral">
                {teamsCopy.readOnlyReasons[readyTeam.readOnlyReason]}
              </Badge>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
              {teamsCopy.workspace.fields.viewer}
            </p>
            <p className="text-sm font-bold text-text-primary">
              {viewer ? teamsCopy.viewerRoles[viewer.role] : teamsCopy.viewerRoles.observer}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
          <WorkspaceSummaryCard team={readyTeam} />
          {readyTeam.financialData.status === "available" ? (
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <TeamOverviewCard
                title={teamsCopy.workspace.cards.current}
                financials={readyTeam.currentPeriod}
              />
              <TeamOverviewCard
                title={teamsCopy.workspace.cards.lifetime}
                financials={readyTeam.lifetime}
              />
            </div>
          ) : (
            <FinancialDataUnavailableCard />
          )}
        </div>
        {readyTeam.financialData.status === "available" ? (
          <FinancialHistoryTable team={readyTeam} currentPeriod={currentPeriod} />
        ) : null}
      </section>

      <section id="revenue" className="scroll-mt-24">
        <ActionDeck
          team={readyTeam}
          viewer={viewer}
          currentPeriod={currentPeriod}
          onUpdateTeam={onUpdateTeam}
          revenueCardKey={revenueCardKey}
          state={state}
          liveWrites={liveWrites}
          onNavigateSection={onNavigateSection}
        />
      </section>

      <section id="revenue-ledger" className="scroll-mt-24">
        <Card className="min-w-0 space-y-4 overflow-hidden">
          <RevenueHistoryLedger
            history={readyTeam.revenueHistory}
            title={teamsCopy.revenue.history.auditTitle}
            description={teamsCopy.revenue.history.auditDescription}
            headingLevel={2}
            financialDataAvailable={
              readyTeam.financialData.status === "available"
            }
          />
        </Card>
      </section>

      <section id="funding" className="scroll-mt-24">
        {currentPeriod !== null ? (
          <FundingApprovalsTable
            team={readyTeam}
            viewer={viewer}
            currentPeriod={currentPeriod}
            onUpdateTeam={onUpdateTeam}
            onClaimFunding={liveWrites?.claimFunding}
            onReturnFunding={liveWrites?.returnFunding}
            onApproveFundingReturn={liveWrites?.approveFundingReturn}
            txState={liveWrites?.state}
          />
        ) : null}
      </section>

      <section id="bonus" className="scroll-mt-24">
        <BonusCard
          key={getBonusCardKey(readyTeam, viewer)}
          bonus={readyTeam.bonus}
          financialDataAvailable={readyTeam.financialData.status === "available"}
          canClaimBonus={viewer?.canClaimBonus ?? false}
          viewerAddress={viewer?.address ?? null}
          onClaimBonus={
            liveWrites
              ? (recipient) => liveWrites.claimBonus(readyTeam, recipient)
              : undefined
          }
          txState={liveWrites?.state}
        />
      </section>

      <section id="lifecycle" className="scroll-mt-24">
        <TeamLifecycleCard team={readyTeam} />
      </section>
    </section>
  );
}

function FinancialHistoryTable({
  team,
  currentPeriod,
}: {
  team: TeamRecord;
  currentPeriod: number | null;
}) {
  const periods = team.financialPeriods;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-xl font-bold text-text-primary">
          {teamsCopy.workspace.financialHistory.title}
        </h2>
      </div>
      {periods.length === 0 ? (
        <div className="px-5 py-6 text-sm text-text-secondary">
          {teamsCopy.workspace.financialHistory.empty}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{teamsCopy.workspace.financialHistory.headers.period}</TableHead>
              <TableHead>{teamsCopy.workspace.financialHistory.headers.dates}</TableHead>
              <TableHead className="text-right">
                {teamsCopy.workspace.financialHistory.headers.revenue}
              </TableHead>
              <TableHead className="text-right">
                {teamsCopy.workspace.financialHistory.headers.cost}
              </TableHead>
              <TableHead className="text-right">
                {teamsCopy.workspace.financialHistory.headers.net}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((entry) => {
              const net = getFinancialNetState(entry.financials);
              const netToneClassName =
                net.tone === "profit"
                  ? "text-green-700"
                  : net.tone === "loss"
                    ? "text-red-700"
                    : "text-text-primary";

              return (
                <TableRow key={entry.period}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-number font-bold text-text-primary">
                        {teamsCopy.directory.scope.periodLabel(entry.period)}
                      </span>
                      {currentPeriod === entry.period ? (
                        <Badge variant="brand">
                          {teamsCopy.workspace.financialHistory.currentBadge}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-number text-text-secondary">
                    {formatPeriodRange(entry.startsAt, entry.endsAt)}
                  </TableCell>
                  <TableCell className="text-right font-number text-text-primary">
                    {formatTeamsUsd(entry.financials.revenueUsd)}
                  </TableCell>
                  <TableCell className="text-right font-number text-text-primary">
                    {formatTeamsUsd(entry.financials.costUsd)}
                  </TableCell>
                  <TableCell className={`text-right font-number font-bold ${netToneClassName}`}>
                    {net.label} {formatTeamsUsd(net.value)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function formatPeriodRange(
  startsAt: number | null | undefined,
  endsAt: number | null | undefined
) {
  const start = formatTeamsDate(startsAt);
  const end = formatTeamsDate(endsAt);

  if (start && end) {
    return `${start} - ${end}`;
  }

  return "--";
}

function WorkspaceSummaryCard({ team }: { team: TeamRecord }) {
  return (
    <Card className="min-w-0 space-y-4">
      <h2 className="text-xl font-bold text-text-primary">
        {teamsCopy.workspace.title}
      </h2>
      <dl className="space-y-3">
        <SummaryRow
          label={teamsCopy.workspace.fields.owner}
          value={
            <TeamOwnership
              owner={team.owner}
              pendingOwner={team.pendingOwner}
            />
          }
        />
        <SummaryRow
          label={teamsCopy.workspace.fields.teamId}
          value={team.id}
        />
        <SummaryRow
          label={teamsCopy.workspace.fields.contract}
          value={
            <AddressLink
              address={team.address}
              label={team.name}
              variant="compact"
            />
          }
        />
      </dl>
    </Card>
  );
}

function FinancialDataUnavailableCard() {
  return (
    <Card className="flex min-h-48 flex-col justify-center border-yellow-500/30 bg-yellow-500/5">
      <h3 className="text-lg font-bold text-text-primary">
        {teamsCopy.financialData.unavailableTitle}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        {teamsCopy.financialData.unavailableBody}
      </p>
    </Card>
  );
}

function ActionDeck({
  team,
  viewer,
  currentPeriod,
  onUpdateTeam,
  revenueCardKey,
  state,
  liveWrites,
  onNavigateSection,
}: {
  team: TeamRecord;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  onUpdateTeam: (team: TeamRecord) => void;
  revenueCardKey: string;
  state: "ready" | "loading" | "empty";
  liveWrites?: TeamsLiveWriteHandlers;
  onNavigateSection: (section: TeamsRouteSection) => void;
}) {
  return (
    <section
      id="actions"
      aria-labelledby="teams-action-deck-title"
      className="scroll-mt-24 space-y-4"
    >
      <div className="space-y-1">
        <h2 id="teams-action-deck-title" className="text-2xl font-bold text-text-primary">
          {teamsCopy.workspace.actionDeck.title}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-text-secondary">
          {teamsCopy.workspace.actionDeck.description}
        </p>
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <RevenueDepositCard
          key={revenueCardKey}
          team={team}
          viewer={viewer}
          currentPeriod={currentPeriod}
          headingLevel={3}
          onUpdateTeam={onUpdateTeam}
          state={state}
          onDepositRevenue={liveWrites?.depositRevenue}
          onApproveRevenueDeposit={liveWrites?.approveRevenueDeposit}
          txState={liveWrites?.state}
        />
        <OutflowsCommandPanel
          team={team}
          viewer={viewer}
          currentPeriod={currentPeriod}
          onNavigateSection={onNavigateSection}
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
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="space-y-5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-56 w-full" />
        </Card>
        <Card className="space-y-5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
    </section>
  );
}

function OutflowsCommandPanel({
  team,
  viewer,
  currentPeriod,
  onNavigateSection,
}: {
  team: TeamRecord;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  onNavigateSection: (section: TeamsRouteSection) => void;
}) {
  const claimableApprovals =
    currentPeriod === null
      ? []
      : team.fundingApprovals.filter((approval) =>
          isTeamsFundingApprovalClaimable(approval, currentPeriod)
        );
  const returnableApprovals =
    currentPeriod === null
      ? []
      : team.fundingApprovals.filter((approval) =>
          isTeamsFundingApprovalReturnable(approval, currentPeriod)
        );
  const firstClaimableApproval = claimableApprovals[0] ?? null;
  const firstReturnableApproval = returnableApprovals[0] ?? null;
  const fundingState = teamsCopy.funding.summaryStates[team.fundingSummary.state];
  const bonusStatus = teamsCopy.bonus.statuses[team.bonus.status];
  const bonusAction = getBonusCommandAction(team, viewer);

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-text-primary">
          {teamsCopy.workspace.actionDeck.outflowsTitle}
        </h3>
      </div>

      <div className="space-y-4 rounded-box border border-border bg-app p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-text-primary">
              {teamsCopy.workspace.actionDeck.fundingTitle}
            </h4>
          </div>
          <Badge
            variant={
              team.fundingSummary.state === "has-expired"
                ? "warning"
                : team.fundingSummary.state === "current-unavailable"
                  ? "warning"
                : team.fundingSummary.state === "fully-used" ||
                    team.fundingSummary.state === "no-approvals"
                  ? "neutral"
                  : "success"
            }
          >
            {fundingState}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-text-secondary">
          {teamsCopy.workspace.actionDeck.fundingBody}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.fundingClaimableCount}
            value={claimableApprovals.length.toLocaleString("en-US")}
          />
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.fundingReturnableCount}
            value={returnableApprovals.length.toLocaleString("en-US")}
          />
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.fundingClaimableValue}
            value={
              team.financialData.status === "available" &&
              team.fundingSummary.claimableUsd !== null
                ? formatTeamsUsd(team.fundingSummary.claimableUsd)
                : teamsCopy.financialData.unavailableValue
            }
          />
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.fundingRefundableValue}
            value={
              team.financialData.status === "available" &&
              team.fundingSummary.refundableUsd !== null
                ? formatTeamsUsd(team.fundingSummary.refundableUsd)
                : teamsCopy.financialData.unavailableValue
            }
          />
        </div>

        <div className="grid gap-3">
          <FundingCommandSource
            title={teamsCopy.workspace.actionDeck.fundingClaimSource}
            approval={firstClaimableApproval}
            body={getFundingClaimCommandBody(firstClaimableApproval, currentPeriod)}
            blockedBody={
              !viewer?.canClaimFunding
                ? teamsCopy.funding.claimForm.disabledPermission
                : teamsCopy.workspace.actionDeck.fundingNoClaimable
            }
            canAct={Boolean(viewer?.canClaimFunding && firstClaimableApproval)}
            cta={teamsCopy.workspace.actionDeck.fundingClaimCta}
            disabledCta={
              !viewer?.canClaimFunding
                ? teamsCopy.funding.claimForm.disabledPermissionCta
                : teamsCopy.funding.claimForm.disabledNoApprovalCta
            }
            section="funding"
            onNavigateSection={onNavigateSection}
          />
          <FundingCommandSource
            title={teamsCopy.workspace.actionDeck.fundingReturnSource}
            approval={firstReturnableApproval}
            body={getFundingReturnCommandBody(firstReturnableApproval)}
            blockedBody={
              !viewer?.canReturnFunding
                ? teamsCopy.funding.returnForm.disabledPermission
                : teamsCopy.workspace.actionDeck.fundingNoReturnable
            }
            canAct={Boolean(viewer?.canReturnFunding && firstReturnableApproval)}
            cta={teamsCopy.workspace.actionDeck.fundingReturnCta}
            disabledCta={
              !viewer?.canReturnFunding
                ? teamsCopy.funding.returnForm.disabledPermissionCta
                : teamsCopy.funding.returnForm.disabledNoApprovalCta
            }
            section="funding"
            onNavigateSection={onNavigateSection}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-box border border-border bg-app p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-text-primary">
              {teamsCopy.workspace.actionDeck.bonusTitle}
            </h4>
          </div>
          <Badge variant={bonusStatus.variant}>{bonusStatus.label}</Badge>
        </div>
        <p className="text-sm leading-6 text-text-secondary">
          {teamsCopy.workspace.actionDeck.bonusBody}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.bonusClaimable}
            value={formatTeamsTokenAmount(team.bonus.totalClaimable, team.bonus.tokenSymbol)}
          />
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.bonusPeriods}
            value={team.bonus.includedPeriodCount.toLocaleString("en-US")}
          />
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.bonusPending}
            value={getPendingBonusPeriodCount(team).toLocaleString("en-US")}
          />
          <CommandMetric
            label={teamsCopy.workspace.actionDeck.bonusStatus}
            value={bonusStatus.label}
          />
        </div>

        <CommandAction
          canAct={bonusAction.canAct}
          section="bonus"
          onNavigateSection={onNavigateSection}
          cta={bonusAction.cta}
          body={bonusAction.body}
          enabledVariant="primary"
        />
      </div>
    </Card>
  );
}

function FundingCommandSource({
  title,
  approval,
  body,
  blockedBody,
  canAct,
  cta,
  disabledCta,
  section,
  onNavigateSection,
}: {
  title: string;
  approval: FundingApproval | null;
  body: string;
  blockedBody: string;
  canAct: boolean;
  cta: string;
  disabledCta: string;
  section: TeamsRouteSection;
  onNavigateSection: (section: TeamsRouteSection) => void;
}) {
  return (
    <div className="rounded-box border border-border bg-surface-secondary px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {title}
        </p>
        {approval ? (
          <Badge variant={teamsCopy.funding.statuses[approval.status].variant}>
            {teamsCopy.funding.statuses[approval.status].label}
          </Badge>
        ) : null}
      </div>
      <CommandAction
        canAct={canAct}
        section={section}
        onNavigateSection={onNavigateSection}
        cta={canAct ? cta : disabledCta}
        body={canAct ? body : blockedBody}
      />
    </div>
  );
}

function CommandMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box border border-border bg-surface px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 font-number text-base font-bold text-text-primary">{value}</p>
    </div>
  );
}

function CommandAction({
  canAct,
  section,
  onNavigateSection,
  cta,
  body,
  enabledVariant = "secondary",
}: {
  canAct: boolean;
  section: TeamsRouteSection;
  onNavigateSection: (section: TeamsRouteSection) => void;
  cta: string;
  body: string;
  enabledVariant?: "primary" | "secondary";
}) {
  const reactId = useId().replace(/:/g, "");
  const descriptionId = `teams-command-action-${reactId}-description`;

  return (
    <div className="mt-3 space-y-3">
      <p id={descriptionId} className="text-sm leading-6 text-text-secondary">
        {body}
      </p>
      {canAct ? (
        <Button
          type="button"
          variant={enabledVariant}
          onClick={() => onNavigateSection(section)}
          aria-describedby={descriptionId}
          className="w-full"
        >
          {cta}
        </Button>
      ) : (
        <Button
          type="button"
          disabled
          aria-describedby={descriptionId}
          className="w-full"
        >
          {cta}
        </Button>
      )}
    </div>
  );
}

function getFundingClaimCommandBody(
  approval: FundingApproval | null,
  currentPeriod: number | null
) {
  if (!approval) {
    return teamsCopy.workspace.actionDeck.fundingNoClaimable;
  }

  return teamsCopy.workspace.actionDeck.fundingClaimBody(
    approval.idx,
    formatTeamsTokenAmount(approval.claimable, approval.symbol),
    getFundingPeriodLabel(approval, currentPeriod)
  );
}

function getFundingReturnCommandBody(approval: FundingApproval | null) {
  if (!approval) {
    return teamsCopy.workspace.actionDeck.fundingNoReturnable;
  }

  return teamsCopy.workspace.actionDeck.fundingReturnBody(
    approval.idx,
    `${formatTokenAmount(
      BigInt(approval.returnableRaw),
      approval.decimals
    )} ${approval.symbol}`
  );
}

function getFundingPeriodLabel(approval: FundingApproval, currentPeriod: number | null) {
  if (currentPeriod === null) {
    return `period #${approval.approvedPeriod}`;
  }

  if (approval.approvedPeriod === currentPeriod) {
    return `current period #${approval.approvedPeriod}`;
  }

  if (approval.approvedPeriod < currentPeriod) {
    return `expired period #${approval.approvedPeriod}`;
  }

  return `future period #${approval.approvedPeriod}`;
}

function getBonusCommandAction(
  team: TeamRecord,
  viewer: TeamsViewerContext | null
) {
  const hasClaimableBonus =
    team.bonus.status === "claimable" && Number(team.bonus.totalClaimable) > 0;

  if (hasClaimableBonus && viewer?.canClaimBonus) {
    return {
      canAct: true,
      cta: teamsCopy.workspace.actionDeck.bonusCta,
      body: teamsCopy.bonus.action.claimBody,
    };
  }

  if (hasClaimableBonus) {
    return {
      canAct: false,
      cta: teamsCopy.bonus.action.permissionCta,
      body: teamsCopy.bonus.action.permissionBody,
    };
  }

  if (team.bonus.status === "pending-finalization") {
    return {
      canAct: false,
      cta: teamsCopy.bonus.action.pendingCta,
      body: teamsCopy.bonus.action.pendingBody,
    };
  }

  if (team.bonus.status === "claimed") {
    return {
      canAct: false,
      cta: teamsCopy.bonus.action.claimedCta,
      body: teamsCopy.bonus.action.claimedBody,
    };
  }

  return {
    canAct: false,
    cta: teamsCopy.bonus.action.noneCta,
    body: teamsCopy.bonus.action.noneBody,
  };
}

function getPendingBonusPeriodCount(team: TeamRecord) {
  return team.bonus.periods.filter(
    (period) => period.status === "pending-finalization"
  ).length;
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
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      <p className="text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-t border-border pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start sm:gap-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className="min-w-0 text-left font-number text-sm font-bold text-text-primary">
        {value}
      </dd>
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
