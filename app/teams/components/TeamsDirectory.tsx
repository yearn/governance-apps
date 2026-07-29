"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddressLink } from "@/components/ui/ExplorerLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { usePersistentViewToggle } from "@/components/ui/usePersistentViewToggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  formatTeamsUsd,
  getFinancialNetState,
  type TeamFinancials,
  type TeamRecord,
} from "@/lib/clients/teams";
import { teamsCopy } from "../messages";

type DirectoryFinancialScope = "current" | "period" | "lifetime";
type DirectoryFinancialResult = TeamFinancials | null;

const DIRECTORY_FINANCIAL_PANEL_ID = "teams-directory-financial-panel";
const DIRECTORY_VIEW_STORAGE_KEY = "yearn.teams.directory.view";

type TeamsDirectoryProps = {
  teams: TeamRecord[];
  currentPeriod: number | null;
  onSelectTeam: (teamId: string) => void;
  state: "ready" | "loading" | "empty";
};

export function TeamsDirectory({
  teams,
  currentPeriod,
  onSelectTeam,
  state,
}: TeamsDirectoryProps) {
  const [viewMode, setViewMode] = usePersistentViewToggle(
    DIRECTORY_VIEW_STORAGE_KEY,
    "audit"
  );
  const [financialScope, setFinancialScope] =
    useState<DirectoryFinancialScope>("current");
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const financialDataAvailable = teams.every(
    (team) => team.financialData.status === "available"
  );
  const periodOptions = useMemo(
    () => getDirectoryPeriodOptions(teams, currentPeriod),
    [currentPeriod, teams]
  );
  const effectiveSelectedPeriod =
    selectedPeriod !== null && periodOptions.includes(selectedPeriod)
      ? selectedPeriod
      : getDefaultSelectedPeriod(periodOptions, currentPeriod);
  const effectiveFinancialScope =
    financialScope === "period" && effectiveSelectedPeriod === null
      ? "current"
      : financialScope;
  const scopeLabel = getDirectoryScopeLabel(
    effectiveFinancialScope,
    effectiveSelectedPeriod,
    currentPeriod
  );

  if (state === "loading") {
    return (
      <section className="space-y-4" aria-busy="true">
        <DirectoryHeader
          title={teamsCopy.directory.loadingTitle}
          description={teamsCopy.directory.loadingBody}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} variant="flat" className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (state === "empty") {
    return (
      <Card className="space-y-4">
        <DirectoryHeader
          title={teamsCopy.directory.emptyTitle}
          description={teamsCopy.directory.emptyBody}
        />
        <div className="rounded-box border border-dashed border-border bg-app px-5 py-6">
          <p className="text-sm text-text-secondary">{teamsCopy.directory.emptyHint}</p>
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <DirectoryHeader
          title={teamsCopy.directory.title}
          description={teamsCopy.directory.description}
        />
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
          {financialDataAvailable ? (
            <DirectoryFinancialScopeControls
              scope={effectiveFinancialScope}
              onScopeChange={setFinancialScope}
              periodOptions={periodOptions}
              selectedPeriod={effectiveSelectedPeriod}
              onPeriodChange={setSelectedPeriod}
              currentPeriod={currentPeriod}
            />
          ) : null}
          <ViewToggle
            aria-label="Team directory view"
            value={viewMode}
            onChange={setViewMode}
            className="shrink-0"
          />
        </div>
      </div>

      {!financialDataAvailable ? <FinancialDataUnavailableNotice /> : null}

      <div
        id={DIRECTORY_FINANCIAL_PANEL_ID}
        role="tabpanel"
        aria-label={scopeLabel}
      >
        {viewMode === "visual" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <TeamDirectoryCard
                key={team.id}
                team={team}
                financialScope={effectiveFinancialScope}
                selectedPeriod={effectiveSelectedPeriod}
                scopeLabel={scopeLabel}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </div>
        ) : (
          <DirectoryAuditTable
            teams={teams}
            financialScope={effectiveFinancialScope}
            selectedPeriod={effectiveSelectedPeriod}
            scopeLabel={scopeLabel}
            onSelectTeam={onSelectTeam}
          />
        )}
      </div>
    </section>
  );
}

function TeamDirectoryCard({
  team,
  financialScope,
  selectedPeriod,
  scopeLabel,
  onSelectTeam,
}: {
  team: TeamRecord;
  financialScope: DirectoryFinancialScope;
  selectedPeriod: number | null;
  scopeLabel: string;
  onSelectTeam: (teamId: string) => void;
}) {
  const status = teamsCopy.statuses[team.status];
  const scopedFinancials = getDirectoryFinancials(
    team,
    financialScope,
    selectedPeriod
  );
  const net = scopedFinancials ? getFinancialNetState(scopedFinancials) : null;
  const lifetimeNet =
    team.financialData.status === "available"
      ? getFinancialNetState(team.lifetime)
      : null;
  const netToneClassName =
    net?.tone === "profit"
      ? "text-green-700"
      : net?.tone === "loss"
        ? "text-red-700"
        : "text-text-primary";

  return (
    <Card
      variant="default"
      className="relative flex h-full cursor-pointer flex-col gap-5 bg-surface shadow-none hover:bg-surface-secondary/30 hover:shadow-sm"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-text-primary">
            <a
              href={getTeamHref(team)}
              className="rounded focus:outline-none focus-visible:after:absolute focus-visible:after:inset-0 focus-visible:after:rounded-box focus-visible:after:ring-2 focus-visible:after:ring-text-primary focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-app after:absolute after:inset-0 after:rounded-box after:content-['']"
              aria-label={`Open ${team.name} details`}
              onClick={(event) => handleTeamLinkClick(event, team.id, onSelectTeam)}
            >
              {team.name}
            </a>
          </h3>
          <p className="font-number text-xs text-text-secondary">{team.id}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.directory.headers.owner}
        </p>
        <AddressLink
          address={team.owner}
          variant="compact"
          className="relative z-10"
        />
        {team.readOnlyReason ? (
          <p className="text-xs text-text-secondary">
            {teamsCopy.readOnlyReasons[team.readOnlyReason]}
          </p>
        ) : null}
      </div>

      <div className="rounded-box border border-border bg-app px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.directory.scope.scopedSummary(scopeLabel)}
        </p>
        <p className={`mt-1 font-number text-3xl font-bold ${netToneClassName}`}>
          {net ? formatTeamsUsd(net.value) : teamsCopy.directory.scope.missingPeriodValue}
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {net?.label ?? teamsCopy.directory.scope.missingPeriod}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <DirectoryMetric
          label={teamsCopy.directory.headers.revenue}
          value={formatDirectoryFinancialValue(scopedFinancials?.revenueUsd)}
        />
        <DirectoryMetric
          label={teamsCopy.directory.headers.cost}
          value={formatDirectoryFinancialValue(scopedFinancials?.costUsd)}
        />
      </dl>

      <dl className="grid gap-2 rounded-box border border-border bg-surface-secondary/40 px-3 py-3 sm:grid-cols-3">
        <DirectoryMetricCompact
          label={`${teamsCopy.directory.scope.lifetimeStrip} ${teamsCopy.directory.headers.revenue}`}
          value={formatTeamFinancialValue(team, team.lifetime.revenueUsd)}
        />
        <DirectoryMetricCompact
          label={`${teamsCopy.directory.scope.lifetimeStrip} ${teamsCopy.directory.headers.cost}`}
          value={formatTeamFinancialValue(team, team.lifetime.costUsd)}
        />
        <DirectoryMetricCompact
          label={`${teamsCopy.directory.scope.lifetimeStrip} ${lifetimeNet?.label ?? teamsCopy.directory.headers.net}`}
          value={
            lifetimeNet
              ? formatTeamsUsd(lifetimeNet.value)
              : teamsCopy.financialData.unavailableValue
          }
          tone={lifetimeNet?.tone}
        />
      </dl>

    </Card>
  );
}

function DirectoryFinancialScopeControls({
  scope,
  onScopeChange,
  periodOptions,
  selectedPeriod,
  onPeriodChange,
  currentPeriod,
}: {
  scope: DirectoryFinancialScope;
  onScopeChange: (scope: DirectoryFinancialScope) => void;
  periodOptions: number[];
  selectedPeriod: number | null;
  onPeriodChange: (period: number | null) => void;
  currentPeriod: number | null;
}) {
  const currentLabel =
    currentPeriod !== null
      ? teamsCopy.directory.scope.currentCompactLabel(currentPeriod)
      : teamsCopy.directory.scope.current;

  return (
    <div className="flex w-full flex-col gap-2 sm:items-end">
      <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {teamsCopy.directory.scope.label}
      </p>
      <div
        role="tablist"
        aria-label={teamsCopy.directory.scope.label}
        className="grid w-full min-w-0 max-w-[42rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-lg bg-surface-secondary/70 p-1 sm:w-auto"
      >
        <FinancialScopeTab
          label={currentLabel}
          ariaLabel={
            currentPeriod !== null
              ? teamsCopy.directory.scope.currentPeriodLabel(currentPeriod)
              : teamsCopy.directory.scope.current
          }
          isActive={scope === "current"}
          onClick={() => onScopeChange("current")}
          controls={DIRECTORY_FINANCIAL_PANEL_ID}
        />
        <div className="mx-1 flex min-w-0 gap-1 overflow-x-auto">
          {periodOptions.map((period) => (
            <FinancialScopeTab
              key={period}
              label={teamsCopy.directory.scope.periodCompactLabel(period)}
              ariaLabel={teamsCopy.directory.scope.periodLabel(period)}
              isActive={scope === "period" && selectedPeriod === period}
              onClick={() => {
                onPeriodChange(period);
                onScopeChange("period");
              }}
              compact
              controls={DIRECTORY_FINANCIAL_PANEL_ID}
            />
          ))}
        </div>
        <FinancialScopeTab
          label={teamsCopy.directory.scope.lifetime}
          isActive={scope === "lifetime"}
          onClick={() => onScopeChange("lifetime")}
          alignRight
          controls={DIRECTORY_FINANCIAL_PANEL_ID}
        />
      </div>
    </div>
  );
}

function FinancialScopeTab({
  label,
  ariaLabel,
  isActive,
  onClick,
  controls,
  compact = false,
  alignRight = false,
}: {
  label: string;
  ariaLabel?: string;
  isActive: boolean;
  onClick: () => void;
  controls: string;
  compact?: boolean;
  alignRight?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-label={ariaLabel ?? label}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center justify-center rounded-md px-3 text-sm font-bold transition-[background-color,color,box-shadow] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 focus:ring-offset-app",
        compact ? "min-w-[5.75rem] font-number" : "min-w-[7rem]",
        alignRight && "justify-self-end",
        isActive
          ? "bg-surface text-text-primary shadow-sm"
          : "text-text-secondary hover:text-text-primary"
      )}
    >
      {label}
    </button>
  );
}

function DirectoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box border border-border bg-app px-3 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className="mt-1 font-number text-sm font-bold text-text-primary">{value}</dd>
    </div>
  );
}

function DirectoryMetricCompact({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  const toneClassName =
    tone === "profit"
      ? "text-green-700"
      : tone === "loss"
        ? "text-red-700"
        : "text-text-primary";

  return (
    <div className="min-w-0 space-y-1">
      <dt className="truncate text-[0.6875rem] font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </dt>
      <dd className={`font-number text-xs font-bold ${toneClassName}`}>{value}</dd>
    </div>
  );
}

function DirectoryAuditTable({
  teams,
  financialScope,
  selectedPeriod,
  scopeLabel,
  onSelectTeam,
}: {
  teams: TeamRecord[];
  financialScope: DirectoryFinancialScope;
  selectedPeriod: number | null;
  scopeLabel: string;
  onSelectTeam: (teamId: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-5 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.directory.scope.scopedSummary(scopeLabel)}
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{teamsCopy.directory.headers.team}</TableHead>
            <TableHead>{teamsCopy.directory.headers.owner}</TableHead>
            <TableHead>{teamsCopy.directory.headers.status}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.revenue}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.cost}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.net}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const status = teamsCopy.statuses[team.status];
            const scopedFinancials = getDirectoryFinancials(
              team,
              financialScope,
              selectedPeriod
            );
            const net = scopedFinancials ? getFinancialNetState(scopedFinancials) : null;
            const netToneClassName =
              net?.tone === "profit"
                ? "text-green-700"
                : net?.tone === "loss"
                  ? "text-red-700"
                  : "text-text-primary";

            return (
              <TableRow
                key={team.id}
                interactive
                className="relative cursor-pointer"
              >
                <TableCell>
                  <div className="space-y-1">
                    <a
                      href={getTeamHref(team)}
                      className="font-bold text-text-primary focus:outline-none focus-visible:after:absolute focus-visible:after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-text-primary after:absolute after:inset-0 after:content-['']"
                      aria-label={`Open ${team.name} details`}
                      onClick={(event) =>
                        handleTeamLinkClick(event, team.id, onSelectTeam)
                      }
                    >
                      {team.name}
                    </a>
                    <div className="text-xs text-text-secondary">
                      {team.id}
                      {team.readOnlyReason
                        ? ` - ${teamsCopy.readOnlyReasons[team.readOnlyReason]}`
                        : ""}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <AddressLink
                    address={team.owner}
                    variant="compact"
                    className="relative z-10"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right font-number text-text-primary">
                  {formatDirectoryFinancialValue(scopedFinancials?.revenueUsd)}
                </TableCell>
                <TableCell className="text-right font-number text-text-primary">
                  {formatDirectoryFinancialValue(scopedFinancials?.costUsd)}
                </TableCell>
                <TableCell className={`text-right font-number font-bold ${netToneClassName}`}>
                  {net
                    ? formatTeamsUsd(net.value)
                    : teamsCopy.directory.scope.missingPeriodValue}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function getTeamHref(team: TeamRecord) {
  return `/teams?section=overview&team=${team.address.toLowerCase()}`;
}

function handleTeamLinkClick(
  event: MouseEvent<HTMLAnchorElement>,
  teamId: string,
  onSelectTeam: (teamId: string) => void
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  onSelectTeam(teamId);
}

function getDirectoryFinancials(
  team: TeamRecord,
  financialScope: DirectoryFinancialScope,
  selectedPeriod: number | null
): DirectoryFinancialResult {
  if (team.financialData.status === "unavailable") return null;

  if (financialScope === "lifetime") {
    return team.lifetime;
  }

  if (financialScope === "period" && selectedPeriod !== null) {
    return (
      team.financialPeriods.find((entry) => entry.period === selectedPeriod)
        ?.financials ?? null
    );
  }

  return team.currentPeriod;
}

function getDirectoryPeriodOptions(
  teams: readonly TeamRecord[],
  currentPeriod: number | null
) {
  const periods = new Set<number>();

  for (const team of teams) {
    for (const entry of team.financialPeriods) {
      if (entry.period === currentPeriod) {
        continue;
      }
      periods.add(entry.period);
    }
  }

  return Array.from(periods).sort((left, right) => right - left);
}

function getDefaultSelectedPeriod(
  periodOptions: readonly number[],
  currentPeriod: number | null
) {
  void currentPeriod;
  return periodOptions[0] ?? null;
}

function getDirectoryScopeLabel(
  scope: DirectoryFinancialScope,
  selectedPeriod: number | null,
  currentPeriod: number | null
) {
  if (scope === "lifetime") {
    return teamsCopy.directory.scope.lifetime;
  }

  if (scope === "period" && selectedPeriod !== null) {
    return teamsCopy.directory.scope.periodLabel(selectedPeriod);
  }

  return currentPeriod !== null
    ? teamsCopy.directory.scope.currentPeriodLabel(currentPeriod)
    : teamsCopy.directory.scope.current;
}

function formatDirectoryFinancialValue(value: string | null | undefined) {
  return value ? formatTeamsUsd(value) : teamsCopy.directory.scope.missingPeriodValue;
}

function formatTeamFinancialValue(team: TeamRecord, value: string) {
  return team.financialData.status === "available"
    ? formatTeamsUsd(value)
    : teamsCopy.financialData.unavailableValue;
}

function FinancialDataUnavailableNotice() {
  return (
    <Card className="border-warning/40 bg-warning/5">
      <h3 className="text-base font-bold text-text-primary">
        {teamsCopy.financialData.unavailableTitle}
      </h3>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
        {teamsCopy.financialData.unavailableBody}
      </p>
    </Card>
  );
}

function DirectoryHeader({
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
