"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { YbcMockDataV1, YbcPrototypeScenarioId } from "@/lib/clients/ybc";
import { useYbcState } from "@/lib/hooks/useYbc";
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
  createProposal?: (type: "addition" | "expulsion") => void;
  retractProposal?: (proposalId: string) => void;
  voteOnProposal?: (proposalId: string, choice: "yea" | "nay") => void;
  executeProposal?: (proposalId: string) => void;
};

export function YbcPageClient({
  scenarioOverride,
  latencyMs,
  hostname,
}: YbcPageClientProps = {}) {
  const { ybcUsesMockBackend } = useProtocol();
  const {
    createProposal,
    data,
    error,
    executeProposal,
    isError,
    isLoading,
    refetch,
    retractProposal,
    voteOnProposal,
  } = useYbcState({
    scenarioOverride,
    latencyMs,
  });

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
}: YbcPageContentProps) {
  return (
    <div className="bg-app text-text-primary">
      <YbcHero data={data} />
      <MembersTable roster={data.roster} currentAddress={data.me.address} />
      <section className="container mx-auto px-4 pb-16 md:px-6 md:pb-20">
        <ProposalBoard
          id="proposals"
          data={data}
          createProposal={createProposal}
          retractProposal={retractProposal}
          voteOnProposal={voteOnProposal}
          executeProposal={executeProposal}
        />
        <div className="pt-6">
          <RewardsCard id="rewards" data={data} hostname={hostname} />
        </div>
        <div className="pt-6">
          <OperatorPanel id="admin" data={data} createProposal={createProposal} />
        </div>
      </section>
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
