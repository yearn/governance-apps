"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { UtcTime } from "@/components/ui/UtcTime";
import { useTreasury } from "@/lib/hooks/useTreasury";
import { formatTreasuryUsd, groupTreasuryHoldings, isTreasuryStale, selectTreasuryHoldings, treasuryAddressHref } from "@/lib/clients/treasury/display";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryTab } from "@/lib/clients/treasury/types";
import { TreasuryHoldings, treasuryLinkClass, treasurySummaryClass } from "./components/TreasuryHoldings";
import { TreasuryAllocations, TreasuryHistory } from "./components/TreasuryAllocations";
import { treasuryCopy as copy } from "./messages";

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary sm:w-auto sm:min-w-44";

export function TreasuryPageClient() {
  const query = useTreasury();
  return <TreasuryDashboard feed={query.data} loading={query.loading} failed={query.isError} refreshing={query.isFetching} now={query.now} onRefresh={() => { void query.refetch(); }} />;
}

export function TreasuryDashboard({ feed, loading = false, failed = false, refreshing = false, now, onRefresh }: {
  feed?: TreasuryFeed; loading?: boolean; failed?: boolean; refreshing?: boolean; now: number; onRefresh: () => void;
}) {
  const [tab, setTab] = useState<TreasuryTab>("portfolio");
  const [accountId, setAccountId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [excludeYfi, setExcludeYfi] = useState(false);
  const holdings = feed ? selectTreasuryHoldings(feed, { accountId, teamId }) : [];
  const groups = groupTreasuryHoldings(holdings);
  const allocations = feed?.allocations.filter((item) => !teamId || item.accountableTeamId === teamId) ?? [];
  const stale = feed ? isTreasuryStale(feed, now) : false;

  return <div className="min-w-0 bg-app text-text-primary">
    <div className="container mx-auto min-w-0 space-y-6 [overflow-wrap:anywhere] px-4 py-8 md:px-6 md:py-10">
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-bold md:text-4xl">{copy.title}</h1>
          <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">{copy.subtitle}</p>
        </div>
        <p className="text-xs text-text-secondary">{copy.network} · {copy.readOnly}</p>
      </header>

      {loading && !feed ? <Card role="status" aria-busy="true" className="space-y-5"><p className="font-medium">{copy.loading}</p><div className="space-y-4" aria-hidden="true"><Skeleton className="h-9 w-48 motion-reduce:animate-none" /><Skeleton className="h-32 w-full motion-reduce:animate-none" /><Skeleton className="h-32 w-full motion-reduce:animate-none" /></div></Card> : null}
      {!loading && !feed ? <Card role="alert" className="space-y-3"><h2 className="text-xl font-bold">{copy.errorTitle}</h2><p className="text-sm text-text-secondary">{copy.errorBody}</p><Button type="button" variant="secondary" className="min-h-11 motion-reduce:transition-none motion-reduce:active:scale-100" onClick={onRefresh}>{copy.refresh}</Button></Card> : null}

      {feed ? <>
        {feed.mode === "fixture" ? <Notice title={copy.exampleTitle} body={copy.exampleBody} /> : null}
        {failed ? <Notice title={copy.failedRefreshTitle} body={copy.failedRefreshBody} /> : stale ? <Notice title={copy.staleTitle} body={copy.staleBody} /> : null}

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-text-secondary">
          <p className="min-w-0">{copy.lastUpdated} <UtcTime timestamp={feed.generatedAt} /> · <a className="rounded-sm underline decoration-border underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary" href={"https://etherscan.io/block/" + feed.blockNumber} target="_blank" rel="noopener noreferrer">{copy.block} {feed.blockNumber.toLocaleString("en-US")}</a></p>
          <div className="flex items-center gap-3"><span>{copy.cadence}</span><Button type="button" variant="ghost" size="sm" disabled={refreshing} onClick={onRefresh} className="min-h-11 motion-reduce:transition-none motion-reduce:active:scale-100">{refreshing ? copy.refreshing : copy.refresh}</Button></div>
        </div>

        <Tabs tabs={[{ id: "portfolio", label: copy.portfolioTab }, { id: "allocations", label: copy.allocationsTab }]} activeTab={tab} onChange={(next) => setTab(next as TreasuryTab)} variant="line" aria-label={copy.tabLabel} getTabId={(id) => "treasury-tab-" + id} getPanelId={(id) => "treasury-panel-" + id} />

        {tab === "portfolio" ? <section id="treasury-panel-portfolio" role="tabpanel" aria-labelledby="treasury-tab-portfolio" className="space-y-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-5">
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">{copy.valuationLabel} · {excludeYfi ? copy.excludingYfiLabel : copy.includingYfiLabel}</p>
              <p data-testid="treasury-portfolio-value" className="break-words font-number text-3xl font-bold tabular-nums sm:text-4xl">{formatTreasuryUsd(excludeYfi ? feed.summary.pricedUsdValueExcludingYfi : feed.summary.pricedUsdValue)}</p>
              <p className="text-xs text-text-secondary">{copy.summaryScope}</p>
            </div>
            <button type="button" aria-pressed={excludeYfi} onClick={() => setExcludeYfi(!excludeYfi)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition-[background-color,scale] hover:bg-surface-secondary active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none motion-reduce:active:scale-100">
              <span aria-hidden="true" className={"flex size-4 items-center justify-center rounded border " + (excludeYfi ? "border-text-primary bg-text-primary text-app" : "border-border")}>{excludeYfi ? "✓" : ""}</span>{copy.excludingYfi}
            </button>
          </div>
          <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">{copy.valuationNote}</p>
          <Coverage feed={feed} excludeYfi={excludeYfi} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-lg font-bold">{copy.portfolioTitle}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{copy.portfolioBody}</p></div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-text-secondary">{copy.accountFilter}<select className={controlClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">{copy.allAccounts}</option>{feed.accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label>
              <TeamFilter feed={feed} value={teamId} onChange={setTeamId} />
            </div>
          </div>
          {holdings.length ? <>
            {groups.primary.length ? <TreasuryHoldings feed={feed} holdings={groups.primary} excludeYfi={excludeYfi} /> : null}
            {groups.other.length ? <details className="group" data-testid="treasury-other-holdings"><summary className={treasurySummaryClass}><span aria-hidden="true" className="text-xs transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>{copy.otherHoldings}<span className="font-number text-xs tabular-nums">{groups.other.length}</span></summary><p className="mb-4 text-xs leading-6 text-text-secondary">{copy.otherHoldingsBody}</p><TreasuryHoldings feed={feed} holdings={groups.other} excludeYfi={excludeYfi} label={copy.otherHoldings} /></details> : null}
          </> : <Card variant="flat"><p className="text-sm text-text-secondary">{feed.holdings.length ? copy.emptyFiltered : copy.emptyTitle}</p></Card>}
          <TrackedAddresses feed={feed} />
        </section> : <section id="treasury-panel-allocations" role="tabpanel" aria-labelledby="treasury-tab-allocations" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2"><h2 className="text-lg font-bold">{copy.allocationsTab}</h2><p className="text-sm leading-6 text-text-secondary">{copy.allocationsBody}</p><p className="text-xs leading-5 text-text-secondary">{copy.accountability}</p></div>
            <TeamFilter feed={feed} value={teamId} onChange={setTeamId} />
          </div>
          {allocations.length ? <TreasuryAllocations feed={feed} allocations={allocations} /> : <Card variant="flat"><p className="text-sm text-text-secondary">{copy.emptyAllocations}</p></Card>}
        </section>}
        <TreasuryHistory history={feed.history} />
      </> : null}
    </div>
  </div>;
}

function TeamFilter({ feed, value, onChange }: { feed: TreasuryFeed; value: string; onChange: (value: string) => void }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-xs text-text-secondary">{copy.teamFilter}<select className={controlClass} value={value} onChange={(event) => onChange(event.target.value)}><option value="">{copy.allTeams}</option>{feed.teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}</select></label>;
}

function Notice({ title, body }: { title: string; body: string }) {
  return <Card role="status" variant="flat" className="space-y-1 p-4"><h2 className="text-sm font-bold">{title}</h2><p className="text-pretty text-sm leading-6 text-text-secondary">{body}</p></Card>;
}

function Coverage({ feed, excludeYfi }: { feed: TreasuryFeed; excludeYfi: boolean }) {
  const limited = feed.coverage.inventory === "registry-only";
  const unpriced = feed.summary.unpricedHoldingCount;
  const split = excludeYfi ? feed.summary.unknownYfiSplitCount : 0;
  const warnings = feed.mode === "fixture" ? feed.coverage.warnings.filter((warning) => !warning.startsWith("Demonstration amounts.")) : feed.coverage.warnings;
  if (!limited && !unpriced && !split && !warnings.length) return null;
  return <div role="status" className="rounded-lg bg-surface-secondary/60 px-4 py-3 text-xs leading-6 text-text-secondary">
    {limited ? <p>{copy.inventoryLimited}</p> : null}
    {unpriced > 0 ? <p className="tabular-nums">{unpriced} {copy.unpriced}.</p> : null}
    {split > 0 ? <p className="tabular-nums">{split} {copy.unknownYfi}.</p> : null}
    {warnings.length ? <details className="group"><summary className={treasurySummaryClass}><span aria-hidden="true" className="text-xs transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>{copy.coverageDetails}</summary><ul className="space-y-2 pb-2">{warnings.map((warning) => <li key={warning} className="break-words">{warning}</li>)}</ul></details> : null}
  </div>;
}

function TrackedAddresses({ feed }: { feed: TreasuryFeed }) {
  return <aside aria-label={copy.trackedAddresses} className="space-y-2"><h2 className="text-xs font-medium text-text-secondary">{copy.trackedAddresses}</h2><ul className="flex flex-wrap gap-x-6 gap-y-1">{feed.accounts.map((account) => <li key={account.id}><a className={treasuryLinkClass} href={treasuryAddressHref(account.address)} target="_blank" rel="noopener noreferrer">{account.label} ↗</a></li>)}</ul></aside>;
}
