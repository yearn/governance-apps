"use client";

import { useState } from "react";
import { AmountInput } from "@/components/ui/AmountInput";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import {
  estimateRevenueCreditUsd,
  formatTeamsTokenAmount,
  formatTeamsUsd,
  type RevenueHistoryEntry,
  type TeamRecord,
  type TeamsViewerContext,
} from "@/lib/clients/teams";
import { nowSeconds } from "@/lib/mocks/time";
import { formatAddress } from "@/lib/format";
import { teamsCopy } from "../messages";

type RevenueDepositCardProps = {
  team: TeamRecord | null;
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  state: "ready" | "loading" | "empty";
};

type LocalRevenueHistoryEntry = RevenueHistoryEntry & {
  depositorLabel?: string;
};

export function RevenueDepositCard({
  team,
  viewer,
  currentPeriod,
  state,
}: RevenueDepositCardProps) {
  const initialOption = team?.revenueOptions[0] ?? null;
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(
    () => initialOption?.tokenAddress ?? null
  );
  const [amount, setAmount] = useState(() => initialOption?.previewAmount ?? "");
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<LocalRevenueHistoryEntry[]>(() =>
    (team?.revenueHistory ?? []).map((entry) => ({ ...entry }))
  );
  const [successEntry, setSuccessEntry] = useState<LocalRevenueHistoryEntry | null>(null);

  if (state === "loading") {
    return (
      <Card className="space-y-5" aria-busy="true">
        <RevenueHeader
          title={teamsCopy.revenue.loadingTitle}
          description={teamsCopy.revenue.loadingBody}
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-44" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="space-y-4">
        <RevenueHeader
          title={teamsCopy.revenue.emptyTitle}
          description={teamsCopy.revenue.emptyBody}
        />
      </Card>
    );
  }

  if (!team) {
    return (
      <Card className="space-y-4">
        <RevenueHeader
          title={teamsCopy.revenue.title}
          description={teamsCopy.revenue.description}
        />
        <div className="rounded-box border border-dashed border-border bg-surface-secondary px-4 py-5">
          <p className="text-sm font-bold text-text-primary">
            {teamsCopy.revenue.noTeamTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {teamsCopy.revenue.noTeamBody}
          </p>
        </div>
      </Card>
    );
  }

  const activeTeam = team;
  const selectedOption =
    activeTeam.revenueOptions.find(
      (option) => option.tokenAddress === selectedTokenAddress
    ) ??
    activeTeam.revenueOptions[0] ??
    null;

  const estimatedCreditUsd =
    selectedOption && amount ? estimateRevenueCreditUsd(selectedOption, amount) : null;
  const canDeposit =
    Boolean(viewer?.canDepositRevenue) &&
    activeTeam.readOnlyReason === null &&
    activeTeam.revenueOptions.length > 0;

  function handleSelectToken(tokenAddress: string) {
    const nextOption =
      activeTeam.revenueOptions.find(
        (option) => option.tokenAddress === tokenAddress
      ) ?? null;
    setSelectedTokenAddress(tokenAddress);
    setAmount(nextOption?.previewAmount ?? "");
    setAmountError(undefined);
    setSuccessEntry(null);
  }

  function handleSubmit() {
    if (!selectedOption) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError(teamsCopy.revenue.form.amountError);
      setSuccessEntry(null);
      return;
    }

    const creditedUsd = estimateRevenueCreditUsd(selectedOption, amount);
    if (!creditedUsd) {
      setAmountError(teamsCopy.revenue.form.amountError);
      setSuccessEntry(null);
      return;
    }

    const recordedAt = nowSeconds();
    const entry: LocalRevenueHistoryEntry = {
      id: `mock-${activeTeam.id}-${recordedAt}`,
      period: currentPeriod ?? 0,
      symbol: selectedOption.symbol,
      amount: normalizeDecimal(amount),
      creditedUsd,
      convertedToSymbol: selectedOption.convertToSymbol,
      depositedBy: viewer?.address ?? activeTeam.owner,
      createdAt: recordedAt,
      depositorLabel: viewer?.address
        ? formatAddress(viewer.address)
        : teamsCopy.revenue.history.permissionlessDepositor,
    };

    setHistory((currentHistory) => [entry, ...currentHistory]);
    setSuccessEntry(entry);
    setAmountError(undefined);
  }

  return (
    <Card className="space-y-6">
      <RevenueHeader
        title={teamsCopy.revenue.title}
        description={teamsCopy.revenue.description}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">{activeTeam.name}</Badge>
        {currentPeriod !== null && <Badge variant="neutral">Period #{currentPeriod}</Badge>}
      </div>

      {successEntry ? (
        <Banner variant="brand" title={teamsCopy.revenue.success.title}>
          <p>
            {teamsCopy.revenue.success.currentPeriodPrefix} #{successEntry.period}:{" "}
            {formatTeamsTokenAmount(successEntry.amount)} {successEntry.symbol} credited{" "}
            {formatTeamsUsd(successEntry.creditedUsd, 2)}.
          </p>
          <p>{teamsCopy.revenue.success.body}</p>
        </Banner>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <div className="space-y-4">
          {canDeposit ? (
            <>
              <Banner variant="brand" title={teamsCopy.revenue.permissionless.title}>
                <p>{teamsCopy.revenue.permissionless.body}</p>
              </Banner>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
                  {teamsCopy.revenue.form.tokenLabel}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {activeTeam.revenueOptions.map((option) => {
                    const isSelected = option.tokenAddress === selectedOption?.tokenAddress;

                    return (
                      <button
                        key={option.tokenAddress}
                        type="button"
                        onClick={() => handleSelectToken(option.tokenAddress)}
                        className={cn(
                          "rounded-box border px-4 py-3 text-left transition-colors",
                          isSelected
                            ? "border-text-primary bg-app"
                            : "border-border bg-surface-secondary hover:border-border-hover"
                        )}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-text-primary">
                            {option.symbol}
                          </span>
                          <Badge variant={option.isConvertible ? "warning" : "success"}>
                            {option.isConvertible
                              ? teamsCopy.revenue.tokenBadges.convertible
                              : teamsCopy.revenue.tokenBadges.direct}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-text-secondary">
                          {option.isConvertible && option.convertToSymbol
                            ? `${teamsCopy.revenue.preview.convertedPrefix} ${option.convertToSymbol}`
                            : teamsCopy.revenue.preview.direct}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="teams-revenue-amount"
                  className="text-xs font-bold uppercase tracking-wide text-text-tertiary"
                >
                  {teamsCopy.revenue.form.amountLabel}
                </label>
                <AmountInput
                  id="teams-revenue-amount"
                  value={amount}
                  onChange={(nextAmount) => {
                    setAmount(nextAmount);
                    setAmountError(undefined);
                    setSuccessEntry(null);
                  }}
                  tokenSymbol={selectedOption?.symbol}
                  error={amountError}
                  aria-label={teamsCopy.revenue.form.amountLabel}
                />
                <p className="text-sm leading-6 text-text-secondary">
                  {teamsCopy.revenue.form.amountHint}
                </p>
                <Button type="button" onClick={handleSubmit}>
                  {teamsCopy.revenue.form.submit}
                </Button>
              </div>
            </>
          ) : (
            <Banner variant="warning" title={teamsCopy.revenue.unavailable.title}>
              <p>{getUnavailableBody(activeTeam, viewer)}</p>
            </Banner>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-box border border-border bg-app p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
              {teamsCopy.revenue.preview.title}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <PreviewMetric
                label={teamsCopy.revenue.preview.submitted}
                value={
                  selectedOption && amount && Number(amount) > 0
                    ? `${formatTeamsTokenAmount(amount)} ${selectedOption.symbol}`
                    : "--"
                }
              />
              <PreviewMetric
                label={teamsCopy.revenue.preview.path}
                value={
                  selectedOption?.isConvertible && selectedOption.convertToSymbol
                    ? `${selectedOption.symbol} -> ${selectedOption.convertToSymbol}`
                    : teamsCopy.revenue.preview.direct
                }
              />
              <PreviewMetric
                label={teamsCopy.revenue.preview.credit}
                value={estimatedCreditUsd ? formatTeamsUsd(estimatedCreditUsd, 2) : "--"}
                emphasize={Boolean(estimatedCreditUsd)}
              />
            </div>
            {selectedOption ? (
              <div className="rounded-box border border-border bg-surface-secondary px-4 py-3">
                <p className="text-sm font-medium text-text-primary">
                  {teamsCopy.revenue.preview.quote}:{" "}
                  <span className="font-number">
                    {formatTeamsTokenAmount(selectedOption.previewAmount)}{" "}
                    {selectedOption.symbol}
                  </span>{" "}
                  {"->"}{" "}
                  <span className="font-number">
                    {formatTeamsUsd(selectedOption.estimatedCreditUsd, 2)}
                  </span>
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-box border border-border bg-app p-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-text-primary">
                {teamsCopy.revenue.history.title}
              </h3>
              <p className="text-sm leading-6 text-text-secondary">
                {teamsCopy.revenue.history.description}
              </p>
            </div>

            {history.length === 0 ? (
              <div className="rounded-box border border-dashed border-border bg-surface-secondary px-4 py-5">
                <p className="text-sm font-bold text-text-primary">
                  {teamsCopy.revenue.history.emptyTitle}
                </p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {teamsCopy.revenue.history.emptyBody}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{teamsCopy.revenue.history.headers.period}</TableHead>
                    <TableHead>{teamsCopy.revenue.history.headers.deposit}</TableHead>
                    <TableHead className="text-right">
                      {teamsCopy.revenue.history.headers.credit}
                    </TableHead>
                    <TableHead>{teamsCopy.revenue.history.headers.path}</TableHead>
                    <TableHead>{teamsCopy.revenue.history.headers.depositor}</TableHead>
                    <TableHead className="text-right">
                      {teamsCopy.revenue.history.headers.recorded}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-text-primary">
                        #{entry.period}
                      </TableCell>
                      <TableCell className="font-number text-text-primary">
                        {formatTeamsTokenAmount(entry.amount)} {entry.symbol}
                      </TableCell>
                      <TableCell className="text-right font-number text-text-primary">
                        {formatTeamsUsd(entry.creditedUsd, 2)}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {entry.convertedToSymbol
                          ? `${entry.symbol} -> ${entry.convertedToSymbol}`
                          : teamsCopy.revenue.history.direct}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {entry.depositorLabel ?? formatAddress(entry.depositedBy)}
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {formatRecordedAt(entry.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function RevenueHeader({
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

function PreviewMetric({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-1 rounded-box border border-border bg-surface-secondary px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <p
        className={cn(
          "font-number text-base font-bold text-text-primary",
          emphasize && "text-yearn-blue"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function getUnavailableBody(
  team: TeamRecord,
  viewer: TeamsViewerContext | null
): string {
  if (!viewer?.canDepositRevenue) {
    return teamsCopy.revenue.unavailable.viewerBody;
  }

  if (team.readOnlyReason) {
    return teamsCopy.revenue.unavailable.readOnlyBody;
  }

  return teamsCopy.revenue.unavailable.optionsBody;
}

function normalizeDecimal(value: string): string {
  if (!value.includes(".")) return value;

  return value.replace(/\.?0+$/, "");
}

function formatRecordedAt(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
