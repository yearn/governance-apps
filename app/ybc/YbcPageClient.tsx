"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    ybcState.backend === "feed" ? ybcState.feed : null
  );
  const {
    data,
    error,
    isError,
    isLoading,
    refetch,
  } = ybcState;
  const createProposal =
    ybcState.backend === "feed"
      ? proposalWrites.createProposal
      : ybcState.createProposal
        ? (type: YbcProposalType) => {
            ybcState.createProposal(type);
          }
        : undefined;
  const retractProposal =
    ybcState.backend === "feed"
      ? proposalWrites.retractProposal
      : ybcState.retractProposal
        ? (proposalId: string) => {
            ybcState.retractProposal(proposalId);
          }
        : undefined;
  const voteOnProposal =
    ybcState.backend === "feed"
      ? proposalWrites.voteOnProposal
      : ybcState.voteOnProposal
        ? (proposalId: string, choice: YbcVoteChoice) => {
            ybcState.voteOnProposal(proposalId, choice);
          }
        : undefined;
  const executeProposal =
    ybcState.backend === "feed"
      ? proposalWrites.executeProposal
      : ybcState.executeProposal
        ? (proposalId: string) => {
            ybcState.executeProposal(proposalId);
          }
        : undefined;

  if (isError) {
    return (
      <YbcPageErrorState
        errorMessage={error instanceof Error ? error.message : null}
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
          ybcState.backend === "feed" ? proposalWrites.reset : undefined
        }
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
    <div className="bg-app text-text-primary">
      <YbcHero data={data} />
      <main className="container mx-auto space-y-8 px-4 py-8 md:px-6 md:py-10">
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
  onRetry,
}: {
  errorMessage?: string | null;
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
              <Button type="button" variant="secondary" onClick={onRetry}>
                {copy.page.retryCta}
              </Button>
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
