"use client";

import { useState } from "react";
import { formatAddress } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewToggle, type ViewToggleValue } from "@/components/ui/ViewToggle";
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
  type TeamRecord,
} from "@/lib/clients/teams";
import { teamsCopy } from "../messages";

type TeamsDirectoryProps = {
  teams: TeamRecord[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  state: "ready" | "loading" | "empty";
};

export function TeamsDirectory({
  teams,
  selectedTeamId,
  onSelectTeam,
  state,
}: TeamsDirectoryProps) {
  const [viewMode, setViewMode] = useState<ViewToggleValue>("visual");

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
        <ViewToggle
          aria-label="Team directory view"
          value={viewMode}
          onChange={setViewMode}
          className="shrink-0"
        />
      </div>

      {viewMode === "visual" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamDirectoryCard
              key={team.id}
              team={team}
              isSelected={team.id === selectedTeamId}
              onSelectTeam={onSelectTeam}
            />
          ))}
        </div>
      ) : (
        <DirectoryAuditTable
          teams={teams}
          selectedTeamId={selectedTeamId}
          onSelectTeam={onSelectTeam}
        />
      )}
    </section>
  );
}

function TeamDirectoryCard({
  team,
  isSelected,
  onSelectTeam,
}: {
  team: TeamRecord;
  isSelected: boolean;
  onSelectTeam: (teamId: string) => void;
}) {
  const status = teamsCopy.statuses[team.status];
  const net = getFinancialNetState(team.currentPeriod);
  const netToneClassName =
    net.tone === "profit"
      ? "text-green-700"
      : net.tone === "loss"
        ? "text-red-700"
        : "text-text-primary";

  return (
    <Card
      variant={isSelected ? "default" : "flat"}
      className="flex min-h-[22rem] flex-col gap-5"
      data-state={isSelected ? "selected" : undefined}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {isSelected ? <Badge variant="brand">{teamsCopy.directory.selected}</Badge> : null}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-text-primary">{team.name}</h3>
          <p className="font-number text-xs text-text-secondary">{team.id}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.directory.headers.owner}
        </p>
        <p className="font-number text-sm font-bold text-text-primary">
          {formatAddress(team.owner)}
        </p>
        {team.readOnlyReason ? (
          <p className="text-xs text-text-secondary">
            {teamsCopy.readOnlyReasons[team.readOnlyReason]}
          </p>
        ) : null}
      </div>

      <div className="rounded-box border border-border bg-app px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {net.label}
        </p>
        <p className={`mt-1 font-number text-3xl font-bold ${netToneClassName}`}>
          {formatTeamsUsd(net.value)}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <DirectoryMetric
          label={teamsCopy.directory.headers.revenue}
          value={formatTeamsUsd(team.currentPeriod.revenueUsd)}
        />
        <DirectoryMetric
          label={teamsCopy.directory.headers.cost}
          value={formatTeamsUsd(team.currentPeriod.costUsd)}
        />
      </dl>

      <Button
        className="mt-auto w-full"
        variant={isSelected ? "primary" : "secondary"}
        onClick={() => onSelectTeam(team.id)}
        aria-label={`Open ${team.name} workspace`}
      >
        {teamsCopy.directory.openWorkspace}
      </Button>
    </Card>
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

function DirectoryAuditTable({
  teams,
  selectedTeamId,
  onSelectTeam,
}: {
  teams: TeamRecord[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{teamsCopy.directory.headers.team}</TableHead>
            <TableHead>{teamsCopy.directory.headers.owner}</TableHead>
            <TableHead>{teamsCopy.directory.headers.status}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.revenue}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.cost}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.net}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.action}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const status = teamsCopy.statuses[team.status];
            const net = getFinancialNetState(team.currentPeriod);
            const isSelected = team.id === selectedTeamId;
            const netToneClassName =
              net.tone === "profit"
                ? "text-green-700"
                : net.tone === "loss"
                  ? "text-red-700"
                  : "text-text-primary";

            return (
              <TableRow key={team.id} data-state={isSelected ? "selected" : undefined}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-text-primary">{team.name}</span>
                      {isSelected && (
                        <Badge variant="brand">{teamsCopy.directory.selected}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {team.id}
                      {team.readOnlyReason
                        ? ` - ${teamsCopy.readOnlyReasons[team.readOnlyReason]}`
                        : ""}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-number text-text-secondary">
                  {formatAddress(team.owner)}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right font-number text-text-primary">
                  {formatTeamsUsd(team.currentPeriod.revenueUsd)}
                </TableCell>
                <TableCell className="text-right font-number text-text-primary">
                  {formatTeamsUsd(team.currentPeriod.costUsd)}
                </TableCell>
                <TableCell className={`text-right font-number font-bold ${netToneClassName}`}>
                  {formatTeamsUsd(net.value)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={isSelected ? "primary" : "secondary"}
                    onClick={() => onSelectTeam(team.id)}
                    aria-label={`Open ${team.name} workspace`}
                  >
                    {teamsCopy.directory.openWorkspace}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
