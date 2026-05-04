"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
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

type YbcBodyTab = "members" | "proposals" | "rewards" | "admin";

function getYbcTabId(tabId: string) {
  return `ybc-section-tab-${tabId}`;
}

function getYbcPanelId(tabId: string) {
  return `ybc-section-panel-${tabId}`;
}

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
  const showOperatorTab = Boolean(data.admin && data.me.isOperator);
  const [activeTab, setActiveTab] = useState<YbcBodyTab>("members");
  const resolvedActiveTab =
    activeTab === "admin" && !showOperatorTab ? "members" : activeTab;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const activateHashTab = (tab: YbcBodyTab) => {
      window.requestAnimationFrame(() => {
        setActiveTab(tab);
        scrollToHashTarget(tab);
      });
    };

    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash === "overview") {
        scrollToHashTarget(hash);
        return;
      }

      if (hash === "members" || hash === "proposals" || hash === "rewards") {
        activateHashTab(hash);
        return;
      }

      if (hash === "admin" && showOperatorTab) {
        activateHashTab("admin");
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [showOperatorTab]);

  const tabs = [
    {
      id: "members",
      label: copy.sections.members,
      badge: data.roster.members.length.toLocaleString("en-US"),
    },
    {
      id: "proposals",
      label: copy.sections.proposals,
      badge: data.proposals.summary.activeCount.toLocaleString("en-US"),
    },
    {
      id: "rewards",
      label: copy.sections.rewards,
    },
    ...(showOperatorTab
      ? [
          {
            id: "admin",
            label: copy.sections.admin,
          },
        ]
      : []),
  ];

  return (
    <div className="bg-app text-text-primary">
      <YbcHero data={data} />
      <main className="container mx-auto space-y-6 px-4 py-8 md:px-6 md:py-10">
        <Tabs
          aria-label="YBC sections"
          activeTab={resolvedActiveTab}
          getPanelId={getYbcPanelId}
          getTabId={getYbcTabId}
          onChange={(tabId) => {
            const nextTab = tabId as YbcBodyTab;
            setActiveTab(nextTab);
            replaceHash(nextTab);
          }}
          tabs={tabs}
          variant="line"
          className="overflow-x-auto"
        />

        <section
          id={getYbcPanelId("members")}
          role="tabpanel"
          aria-labelledby={getYbcTabId("members")}
          hidden={resolvedActiveTab !== "members"}
        >
          <div id="members">
            <MembersTable roster={data.roster} currentAddress={data.me.address} />
          </div>
        </section>

        <section
          id={getYbcPanelId("proposals")}
          role="tabpanel"
          aria-labelledby={getYbcTabId("proposals")}
          hidden={resolvedActiveTab !== "proposals"}
        >
          <ProposalBoard
            id="proposals"
            data={data}
            createProposal={createProposal}
            retractProposal={retractProposal}
            voteOnProposal={voteOnProposal}
            executeProposal={executeProposal}
          />
        </section>

        <section
          id={getYbcPanelId("rewards")}
          role="tabpanel"
          aria-labelledby={getYbcTabId("rewards")}
          hidden={resolvedActiveTab !== "rewards"}
        >
          <RewardsCard id="rewards" data={data} hostname={hostname} />
        </section>

        {showOperatorTab ? (
          <section
            id={getYbcPanelId("admin")}
            role="tabpanel"
            aria-labelledby={getYbcTabId("admin")}
            hidden={resolvedActiveTab !== "admin"}
          >
            <OperatorPanel id="admin" data={data} createProposal={createProposal} />
          </section>
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

function replaceHash(id: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#${id}`);
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
