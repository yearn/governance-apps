"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { useYbcGovernancePower } from "@/lib/hooks/useYbcGovernancePower";
import { useYbcSystemVotingPower } from "@/lib/hooks/useYbcSystemVotingPower";
import type { YbcGovernancePower, YbcSystemVotingPower } from "@/lib/clients/ybc";
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
import { useYbcEnsIdentities } from "@/lib/hooks/useYbcEnsIdentities";
import { useYbcProposalWrites } from "@/lib/hooks/useYbcProposalWrites";
import type { TxState } from "@/lib/tx/types";
import { useProtocol } from "@/state/protocol";
import { MembersTable, MembersTableSkeleton } from "./components/MembersTable";
import { MockControls } from "./components/MockControls";
import { OperatorPanel } from "./components/OperatorPanel";
import { ProposalBoard } from "./components/ProposalBoard";
import { RewardsCard } from "./components/RewardsCard";
import { YbcHero, YbcHeroSkeleton } from "./components/YbcHero";
import { buildYbcIdentityMap } from "./identity";
import { ybcCopy as copy } from "./messages";
import { useYbcMemberAliases } from "./useYbcMemberAliases";

type YbcPageClientProps = {
  scenarioOverride?: YbcPrototypeScenarioId;
  latencyMs?: number;
  hostname?: string | null;
};

type YbcPageContentProps = {
  data: YbcMockDataV1;
  power?: YbcGovernancePower | null;
  powerLoading?: boolean;
  systemPower?: YbcSystemVotingPower | null;
  systemLoading?: boolean;
  hostname?: string | null;
  trustRecordEns?: boolean;
  verifiedEns?: Record<string, string>;
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
type YbcTab = "proposals" | "members" | "rewards" | "admin";

export function YbcPageClient({
  scenarioOverride,
  latencyMs,
  hostname,
}: YbcPageClientProps = {}) {
  const { mainnetPublicClient, ybcUsesMockBackend } = useProtocol();
  const ybcState = useYbcState({
    scenarioOverride,
    latencyMs,
  });
  const powerQuery = useYbcGovernancePower(mainnetPublicClient, ybcState.backend === "feed" ? ybcState.feed : null);
  const systemQuery = useYbcSystemVotingPower(mainnetPublicClient, ybcState.backend === "feed" ? ybcState.feed : null);
  const ensAddresses = useMemo(
    () => getYbcIdentityAddresses(ybcState.data, false),
    [ybcState.data]
  );
  const verifiedEns = useYbcEnsIdentities(
    mainnetPublicClient,
    ensAddresses,
    ybcState.backend === "feed"
  );
  const hasLiveWriteContext =
    ybcState.backend === "feed" && ybcState.writeFeed !== null;
  const proposalWrites = useYbcProposalWrites(
    ybcState.backend === "feed" ? ybcState.writeFeed : null
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
      ? hasLiveWriteContext
        ? proposalWrites.createProposal
        : undefined
      : ybcState.createProposal
        ? (type: YbcProposalType) => {
            ybcState.createProposal(type);
          }
        : undefined;
  const retractProposal =
    ybcState.backend === "feed"
      ? hasLiveWriteContext
        ? proposalWrites.retractProposal
        : undefined
      : ybcState.retractProposal
        ? (proposalId: string) => {
            ybcState.retractProposal(proposalId);
          }
        : undefined;
  const voteOnProposal =
    ybcState.backend === "feed"
      ? hasLiveWriteContext
        ? proposalWrites.voteOnProposal
        : undefined
      : ybcState.voteOnProposal
        ? (proposalId: string, choice: YbcVoteChoice) => {
            ybcState.voteOnProposal(proposalId, choice);
          }
        : undefined;
  const executeProposal =
    ybcState.backend === "feed"
      ? hasLiveWriteContext
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
        power={ybcState.backend === "mock" ? data.governancePower : powerQuery.isError ? null : powerQuery.data ?? null}
        powerLoading={ybcState.backend === "feed" && powerQuery.isLoading}
        systemPower={ybcState.backend === "mock" ? data.systemPower : systemQuery.data}
        systemLoading={ybcState.backend === "feed" && systemQuery.isLoading}
        hostname={hostname}
        trustRecordEns={ybcState.backend === "mock"}
        verifiedEns={verifiedEns}
        createProposal={createProposal}
        retractProposal={retractProposal}
        voteOnProposal={voteOnProposal}
        executeProposal={executeProposal}
        proposalTargetRequired={ybcState.backend === "feed"}
        proposalTxState={
          ybcState.backend === "feed" ? proposalWrites.state : undefined
        }
        resetProposalTx={
          hasLiveWriteContext
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
  power = data.governancePower,
  powerLoading = false,
  systemPower = data.systemPower,
  systemLoading = false,
  hostname,
  trustRecordEns = true,
  verifiedEns = {},
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
  const [focusedProposalId, setFocusedProposalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<YbcTab>("proposals");
  const {
    aliases,
    clearAliases,
    resetAlias,
    setAlias,
  } = useYbcMemberAliases();
  const showOperatorSection = Boolean(data.admin && data.me.isOperator);
  const proposalIds = data.proposals.items.map(proposal => proposal.id).join("|");
  const visibleIdentityAddresses = useMemo(
    () => getYbcIdentityAddresses(data),
    [data]
  );
  const identities = useMemo(
    () =>
      buildYbcIdentityMap(
        data.roster.members,
        data.admin?.operators ?? [],
        {
          aliases,
          trustRecordEns,
          verifiedEns,
          visibleAddresses: visibleIdentityAddresses,
        }
      ),
    [
      aliases,
      data.admin?.operators,
      data.roster.members,
      trustRecordEns,
      verifiedEns,
      visibleIdentityAddresses,
    ]
  );

  useEffect(() => {
    const applyLocation = () => {
      const url = new URL(window.location.href);
      const hash = url.hash.slice(1);
      const rawProposal = url.searchParams.get("proposal");
      let selected: YbcTab = hash === "members" || hash === "rewards" || (hash === "admin" && showOperatorSection) ? hash as YbcTab : "proposals";
      const proposalId = rawProposal !== null && /^\d+$/.test(rawProposal) ? `YBC-${BigInt(rawProposal).toString()}` : null;
      const exists = proposalId !== null && proposalIds.split("|").includes(proposalId);
      if (rawProposal !== null && !exists) {
        url.searchParams.delete("proposal");
        url.hash = "proposals";
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        selected = "proposals";
      }
      setActiveTab(selected);
      setFocusedProposalId(exists ? proposalId : null);
      if (exists && selected === "proposals") {
        window.requestAnimationFrame(() => document.getElementById(`ybc-proposal-${proposalId}`)?.scrollIntoView?.({ block: "center" }));
      } else if (SECTION_HASHES.has(hash) && (hash !== "admin" || showOperatorSection)) {
        window.requestAnimationFrame(() => scrollToHashTarget(hash === "overview" ? "overview" : "ybc-panels"));
      }
    };
    applyLocation();
    window.addEventListener("hashchange", applyLocation);
    window.addEventListener("popstate", applyLocation);
    return () => {
      window.removeEventListener("hashchange", applyLocation);
      window.removeEventListener("popstate", applyLocation);
    };
  }, [showOperatorSection, proposalIds]);

  const selectTab = (tab: string) => {
    setActiveTab(tab as YbcTab);
    const url = new URL(window.location.href);
    url.hash = tab;
    if (tab !== "proposals") {
      url.searchParams.delete("proposal");
      setFocusedProposalId(null);
    }
    if (url.href !== window.location.href) {
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  };

  const membersSection = (
    <MembersTable
      key="members"
      aliases={aliases}
      identities={identities}
      roster={data.roster}
      power={power}
      currentAddress={data.me.address}
      onClearAliases={clearAliases}
      onResetAlias={resetAlias}
      onSetAlias={setAlias}
    />
  );
  const proposalsSection = (
    <ProposalBoard
      key="proposals"
      id="proposals"
      data={data}
      identities={identities}
      resolveVoterEns={!trustRecordEns}
      createProposal={createProposal}
      retractProposal={retractProposal}
      voteOnProposal={voteOnProposal}
      executeProposal={executeProposal}
      proposalTargetRequired={proposalTargetRequired}
      proposalTxState={proposalTxState}
      resetProposalTx={resetProposalTx}
      focusedProposalId={focusedProposalId}
    />
  );

  return (
    <div
      className="bg-app text-text-primary"
      aria-busy={isRefreshing || undefined}
    >
      <YbcHero data={data} power={power} powerLoading={powerLoading} systemPower={systemPower} systemLoading={systemLoading} />
      <main className="container mx-auto space-y-6 px-4 pb-10 pt-4 md:px-6">
        <YbcDataStatusNotice
          isRefreshing={isRefreshing}
          lastUpdatedAt={lastUpdatedAt}
          onRetry={onRetry}
          readStatus={readStatus}
          warningMessage={warningMessage}
        />
        <Tabs variant="line" aria-label={copy.hero.navigation} activeTab={activeTab} onChange={selectTab}
          getTabId={id => `ybc-tab-${id}`} getPanelId={id => `ybc-panel-${id}`}
          tabs={["proposals", "members", "rewards", ...(showOperatorSection ? ["admin"] : [])].map(id => ({ id, label: copy.sections[id as YbcTab] }))} />
        <div id="ybc-panels" className="scroll-mt-24">
          <div id="ybc-panel-proposals" role="tabpanel" aria-labelledby="ybc-tab-proposals" tabIndex={0} hidden={activeTab !== "proposals"}>{proposalsSection}</div>
          <div id="ybc-panel-members" role="tabpanel" aria-labelledby="ybc-tab-members" tabIndex={0} hidden={activeTab !== "members"}>{membersSection}</div>
          <div id="ybc-panel-rewards" role="tabpanel" aria-labelledby="ybc-tab-rewards" tabIndex={0} hidden={activeTab !== "rewards"}><RewardsCard id="rewards" data={data} hostname={hostname} /></div>
          {showOperatorSection ? <div id="ybc-panel-admin" role="tabpanel" aria-labelledby="ybc-tab-admin" tabIndex={0} hidden={activeTab !== "admin"}>
            <OperatorPanel id="admin" identities={identities} data={data} createProposal={createProposal ? type => {
              selectTab("proposals");
              window.requestAnimationFrame(() => document.getElementById("ybc-panel-proposals")?.focus());
              return createProposal(type);
            } : undefined} />
          </div> : null}
        </div>
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
        className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary"
        role="status"
        aria-live="polite"
      >
        {isRefreshing ? <span>{copy.page.refreshing}</span> : null}
        {lastUpdatedAt !== null && lastUpdatedAt !== undefined ? (
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {copy.page.lastUpdated}:{" "}
            <UtcTime
              className="font-number"
              timestamp={lastUpdatedAt}
            />
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-col gap-3 rounded-box border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 space-y-1">
        {warningMessage ? (
          <p className="min-w-0 text-pretty break-words [overflow-wrap:anywhere]">
            {warningMessage}
          </p>
        ) : null}
        {lastUpdatedAt !== null && lastUpdatedAt !== undefined ? (
          <p className="min-w-0 break-words font-number text-xs tabular-nums [overflow-wrap:anywhere]">
            {copy.page.lastUpdated}:{" "}
            <UtcTime timestamp={lastUpdatedAt} />
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
  );
}

export function getYbcIdentityAddresses(
  data: YbcMockDataV1 | null | undefined,
  includeVoters = true
): string[] {
  if (!data) return [];

  return [
    ...data.roster.members.map((member) => member.address),
    ...(data.admin?.operators.map((operator) => operator.address) ?? []),
    ...data.proposals.items.flatMap((proposal) => [
      proposal.proposer,
      proposal.targetAccount,
      ...(includeVoters ? proposal.voteRecords?.map((vote) => vote.voter) ?? [] : []),
    ]),
    ...(data.me.address ? [data.me.address] : []),
  ];
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
