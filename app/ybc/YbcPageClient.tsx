"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UtcTime } from "@/components/ui/UtcTime";
import type {
  YbcMockDataV1,
  YbcProposalType,
  YbcPrototypeScenarioId,
  YbcVoteChoice,
} from "@/lib/clients/ybc";
import { useYbcState } from "@/lib/hooks/useYbc";
import { useYbcProposalWrites } from "@/lib/hooks/useYbcProposalWrites";
import type { TxState } from "@/lib/tx/types";
import { useProtocol } from "@/state/protocol";
import { MembersTable, MembersTableSkeleton } from "./components/MembersTable";
import { MockControls } from "./components/MockControls";
import { OperatorPanel } from "./components/OperatorPanel";
import { ProposalBoard } from "./components/ProposalBoard";
import { RewardsCard } from "./components/RewardsCard";
import { YbcHero, YbcHeroSkeleton } from "./components/YbcHero";
import { ybcCopy as copy } from "./messages";

type YbcPageClientProps = {
  scenarioOverride?: YbcPrototypeScenarioId;
  latencyMs?: number;
  hostname?: string | null;
};

type YbcPageContentProps = {
  data: YbcMockDataV1;
  hostname?: string | null;
  createProposal?: (
    type: YbcProposalType,
    targetAddress?: string
  ) => void | Promise<void>;
  retractProposal?: (proposalId: string) => void | Promise<void>;
  voteOnProposal?: (
    proposalId: string,
    choice: YbcVoteChoice
  ) => void | Promise<void>;
  executeProposal?: (proposalId: string) => void | Promise<void>;
  proposalTargetRequired?: boolean;
  proposalTxState?: TxState;
  resetProposalTx?: () => void;
  isRefreshing?: boolean;
  lastUpdatedAt?: number | null;
  onRetry?: () => void;
  readStatus?: "current" | "stale";
  warningMessage?: string | null;
};

const SECTION_HASHES = new Set(["overview", "members", "proposals", "rewards", "admin"]);
const PRIORITY_PROPOSAL_PHASES = new Set([
  "discussion",
  "voting",
  "awaiting-execution",
]);

export function YbcPageClient({
  scenarioOverride,
  latencyMs,
  hostname,
}: YbcPageClientProps = {}) {
  const { ybcUsesMockBackend } = useProtocol();
  const ybcState = useYbcState({
    scenarioOverride,
    latencyMs,
  });
  const proposalWrites = useYbcProposalWrites(
    ybcState.backend === "feed" && ybcState.readStatus === "current"
      ? ybcState.feed
      : null
  );
  const {
    data,
    error,
    isError,
    isLoading,
    isRefreshing,
    lastUpdatedAt,
    readStatus,
    refetch,
    warning,
  } = ybcState;
  const createProposal =
    ybcState.backend === "feed"
      ? ybcState.readStatus === "current"
        ? proposalWrites.createProposal
        : undefined
      : ybcState.createProposal
        ? (type: YbcProposalType) => {
            ybcState.createProposal(type);
          }
        : undefined;
  const retractProposal =
    ybcState.backend === "feed"
      ? ybcState.readStatus === "current"
        ? proposalWrites.retractProposal
        : undefined
      : ybcState.retractProposal
        ? (proposalId: string) => {
            ybcState.retractProposal(proposalId);
          }
        : undefined;
  const voteOnProposal =
    ybcState.backend === "feed"
      ? ybcState.readStatus === "current"
        ? proposalWrites.voteOnProposal
        : undefined
      : ybcState.voteOnProposal
        ? (proposalId: string, choice: YbcVoteChoice) => {
            ybcState.voteOnProposal(proposalId, choice);
          }
        : undefined;
  const executeProposal =
    ybcState.backend === "feed"
      ? ybcState.readStatus === "current"
        ? proposalWrites.executeProposal
        : undefined
      : ybcState.executeProposal
        ? (proposalId: string) => {
            ybcState.executeProposal(proposalId);
          }
        : undefined;

  if (isError) {
    return (
      <YbcPageErrorState
        errorMessage={error instanceof Error ? error.message : null}
        isRetrying={isRefreshing}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (isLoading || !data) {
    return <YbcPageLoadingState />;
  }

  return (
    <>
      <YbcPageContent
        data={data}
        hostname={hostname}
        createProposal={createProposal}
        retractProposal={retractProposal}
        voteOnProposal={voteOnProposal}
        executeProposal={executeProposal}
        proposalTargetRequired={ybcState.backend === "feed"}
        proposalTxState={
          ybcState.backend === "feed" ? proposalWrites.state : undefined
        }
        resetProposalTx={
          ybcState.backend === "feed" &&
          ybcState.readStatus === "current"
            ? proposalWrites.reset
            : undefined
        }
        isRefreshing={isRefreshing}
        lastUpdatedAt={lastUpdatedAt}
        onRetry={() => {
          void refetch();
        }}
        readStatus={readStatus}
        warningMessage={warning?.message ?? null}
      />
      {ybcUsesMockBackend ? <MockControls /> : null}
    </>
  );
}

export function YbcPageContent({
  data,
  hostname,
  createProposal,
  retractProposal,
  voteOnProposal,
  executeProposal,
  proposalTargetRequired = false,
  proposalTxState,
  resetProposalTx,
  isRefreshing = false,
  lastUpdatedAt = null,
  onRetry,
  readStatus = "current",
  warningMessage,
}: YbcPageContentProps) {
  const showOperatorSection = Boolean(data.admin && data.me.isOperator);
  const hasPriorityProposals = data.proposals.items.some((proposal) =>
    PRIORITY_PROPOSAL_PHASES.has(proposal.phase)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!SECTION_HASHES.has(hash)) return;
      if (hash === "admin" && !showOperatorSection) return;

      window.requestAnimationFrame(() => {
        scrollToHashTarget(hash);
      });
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [showOperatorSection]);

  const membersSection = (
    <MembersTable roster={data.roster} currentAddress={data.me.address} />
  );
  const proposalsSection = (
    <ProposalBoard
      id="proposals"
      data={data}
      createProposal={createProposal}
      retractProposal={retractProposal}
      voteOnProposal={voteOnProposal}
      executeProposal={executeProposal}
      proposalTargetRequired={proposalTargetRequired}
      proposalTxState={proposalTxState}
      resetProposalTx={resetProposalTx}
    />
  );

  return (
    <div
      className="bg-app text-text-primary"
      aria-busy={isRefreshing || undefined}
    >
      <YbcHero data={data} />
      <main className="container mx-auto space-y-8 px-4 py-8 md:px-6 md:py-10">
        <YbcDataStatusNotice
          isRefreshing={isRefreshing}
          lastUpdatedAt={lastUpdatedAt}
          onRetry={onRetry}
          readStatus={readStatus}
          warningMessage={warningMessage}
        />
        {hasPriorityProposals ? proposalsSection : membersSection}
        {hasPriorityProposals ? membersSection : proposalsSection}
        <RewardsCard id="rewards" data={data} hostname={hostname} />

        {showOperatorSection ? (
          <OperatorPanel id="admin" data={data} createProposal={createProposal} />
        ) : null}
      </main>
    </div>
  );
}

export function YbcDataStatusNotice({
  isRefreshing = false,
  lastUpdatedAt,
  onRetry,
  readStatus,
  warningMessage,
}: {
  isRefreshing?: boolean;
  lastUpdatedAt?: number | null;
  onRetry?: () => void;
  readStatus: "current" | "stale";
  warningMessage?: string | null;
}) {
  if (readStatus === "current") {
    return (
      <div
        className="flex min-w-0 flex-wrap items-center gap-2 rounded-box border border-border bg-surface px-4 py-3 text-sm text-text-secondary"
        role="status"
        aria-live="polite"
      >
        <Badge variant={isRefreshing ? "neutral" : "success"}>
          {isRefreshing ? copy.page.refreshing : copy.page.current}
        </Badge>
        {lastUpdatedAt !== null && lastUpdatedAt !== undefined ? (
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {copy.page.lastUpdated}:{" "}
            <UtcTime className="font-number" timestamp={lastUpdatedAt} />
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Card
      className="border-amber-300 bg-amber-50 text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="font-bold">{copy.page.staleTitle}</p>
          <p className="text-sm leading-6">{copy.page.staleBody}</p>
          {lastUpdatedAt !== null && lastUpdatedAt !== undefined ? (
            <p className="min-w-0 break-words font-number text-xs [overflow-wrap:anywhere]">
              {copy.page.snapshot}: <UtcTime timestamp={lastUpdatedAt} />
            </p>
          ) : null}
          {warningMessage ? (
            <p className="min-w-0 break-words font-number text-xs opacity-80 [overflow-wrap:anywhere]">
              {warningMessage}
            </p>
          ) : null}
        </div>
        {onRetry ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            disabled={isRefreshing}
            aria-busy={isRefreshing || undefined}
            onClick={onRetry}
          >
            {isRefreshing ? copy.page.retrying : copy.page.retryCta}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function YbcPageLoadingState() {
  return (
    <div className="bg-app text-text-primary" aria-busy="true">
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto space-y-3 px-4 py-8 md:px-6">
          <p className="text-sm font-bold uppercase text-text-tertiary">
            {copy.page.loadingTitle}
          </p>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {copy.page.loadingBody}
          </p>
        </div>
      </section>
      <YbcHeroSkeleton />
      <MembersTableSkeleton />
    </div>
  );
}

function scrollToHashTarget(id: string) {
  if (typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (typeof target?.scrollIntoView === "function") {
      target.scrollIntoView({ block: "start" });
    }
  });
}

export function YbcPageErrorState({
  errorMessage,
  isRetrying = false,
  onRetry,
}: {
  errorMessage?: string | null;
  isRetrying?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-app text-text-primary">
      <section className="container mx-auto px-4 py-16 md:px-6 md:py-24">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase text-text-tertiary">
              {copy.page.errorTitle}
            </p>
            <h1 className="text-3xl font-bold">{copy.app.displayLabel}</h1>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              {copy.page.errorBody}
            </p>
            {errorMessage ? (
              <p className="font-number text-xs text-text-tertiary">
                {errorMessage}
              </p>
            ) : null}
          </div>
          {onRetry ? (
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={isRetrying}
                aria-busy={isRetrying || undefined}
                onClick={onRetry}
              >
                {isRetrying ? copy.page.retrying : copy.page.retryCta}
              </Button>
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
