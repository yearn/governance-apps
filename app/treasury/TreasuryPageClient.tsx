"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { UtcTime } from "@/components/ui/UtcTime";
import { useTreasury } from "@/lib/hooks/useTreasury";
import { groupTreasuryAccounts, isTreasuryStale, selectTreasuryHoldings, type TreasuryAccountGroup } from "@/lib/clients/treasury/display";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryTab } from "@/lib/clients/treasury/types";
import { TreasuryAccountHoldings } from "./components/TreasuryHoldings";
import { TreasuryAllocations, TreasuryHistory } from "./components/TreasuryAllocations";
import { UsdValue, treasuryLinkClass, treasurySummaryClass } from "./components/TreasuryPrimitives";
import { treasuryCopy as copy } from "./messages";

const controlClass = "h-10 min-w-0 rounded-lg border border-border bg-surface px-3 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary";
const badgeClass = "inline-flex items-center rounded bg-surface-secondary px-2 py-1 text-[11px] text-text-secondary";

export function TreasuryPageClient() {
  const query = useTreasury();
  return (
    <TreasuryDashboard
      feed={query.data}
      loading={query.loading}
      failed={query.isError}
      refreshing={query.isFetching}
      now={query.now}
      onRefresh={() => { void query.refetch(); }}
    />
  );
}

export function TreasuryDashboard({ feed, loading = false, failed = false, refreshing = false, now, onRefresh }: {
  feed?: TreasuryFeed;
  loading?: boolean;
  failed?: boolean;
  refreshing?: boolean;
  now: number;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<TreasuryTab>("portfolio");
  const [accountId, setAccountId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [excludeYfi, setExcludeYfi] = useState(false);
  const holdings = feed ? selectTreasuryHoldings(feed, { accountId, teamId }) : [];
  const groups = feed ? groupTreasuryAccounts(feed, holdings, excludeYfi) : [];
  const allGroups = feed ? groupTreasuryAccounts(feed, feed.holdings, excludeYfi) : [];
  const allocations = feed?.allocations.filter((item) => !teamId || item.accountableTeamId === teamId) ?? [];
  const stale = feed ? isTreasuryStale(feed, now) : false;
  const unpricedPrimary = allGroups.reduce((count, group) => count + group.primary.filter((holding) => (excludeYfi ? holding.valuation.usdValueExcludingYfi : holding.valuation.usdValue) === null).length, 0);
  const partial = feed && (feed.coverage.inventory !== "indexed" || feed.summary.unpricedHoldingCount > 0 || (excludeYfi && feed.summary.unknownYfiSplitCount > 0));

  return (
    <div className="min-w-0 bg-app text-text-primary">
      <div className="container mx-auto min-w-0 space-y-5 px-4 py-6 [overflow-wrap:anywhere] md:px-6 md:py-8">
        <header className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-text-secondary">{copy.network}</span>
              {feed?.mode === "fixture" ? <span className={badgeClass} title={copy.exampleBody}>{copy.exampleTitle}</span> : null}
            </div>
          </div>
          {feed ? (
            <>
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs text-text-secondary">{copy.valuationLabel} · {excludeYfi ? copy.excludingYfiLabel : copy.includingYfiLabel}</p>
                  <p data-testid="treasury-portfolio-value" className="break-words font-number text-4xl font-bold leading-tight tracking-tight tabular-nums sm:text-5xl md:text-6xl">
                    <UsdValue value={excludeYfi ? feed.summary.pricedUsdValueExcludingYfi : feed.summary.pricedUsdValue} />
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                    <span>{copy.summaryScope}</span>
                    {!excludeYfi && feed.holdings.some((holding) => holding.valuation.redemption) ? <span>{copy.includesRedemptionReference}</span> : null}
                    {partial ? <span>{copy.partialValuation}</span> : null}
                    {tab === "portfolio" && unpricedPrimary > 0 ? <span>{unpricedPrimary} {copy.unpricedPositions}</span> : null}
                  </div>
                </div>
                <button type="button" aria-pressed={excludeYfi} onClick={() => setExcludeYfi(!excludeYfi)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs transition-[background-color,scale] hover:bg-surface-secondary active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none motion-reduce:active:scale-100">
                  <span aria-hidden="true" className={"flex size-3.5 items-center justify-center rounded border " + (excludeYfi ? "border-text-primary bg-text-primary text-app" : "border-border")}>{excludeYfi ? "✓" : ""}</span>
                  {copy.excludingYfi}
                </button>
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 text-[11px] text-text-secondary">
                <p><UtcTime timestamp={feed.generatedAt} />{failed ? " · " + copy.failedRefreshTitle : stale ? " · " + copy.staleTitle : ""}</p>
                <Button type="button" variant="ghost" size="sm" disabled={refreshing} onClick={onRefresh} className="min-h-10 motion-reduce:transition-none motion-reduce:active:scale-100">{refreshing ? copy.refreshing : copy.refresh}</Button>
              </div>
            </>
          ) : null}
        </header>

        {loading && !feed ? (
          <Card role="status" aria-busy="true" className="space-y-4">
            <p className="text-sm">{copy.loading}</p>
            <div aria-hidden="true" className="space-y-4"><Skeleton className="h-12 w-56 motion-reduce:animate-none" /><Skeleton className="h-48 w-full motion-reduce:animate-none" /></div>
          </Card>
        ) : null}
        {!loading && !feed ? (
          <Card role="alert" className="space-y-3">
            <h2 className="text-lg font-bold">{copy.errorTitle}</h2>
            <p className="text-sm text-text-secondary">{copy.errorBody}</p>
            <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>{copy.refresh}</Button>
          </Card>
        ) : null}

        {feed ? (
          <>
            {failed || stale ? <p role="status" className="text-xs text-text-secondary">{failed ? copy.failedRefreshBody : copy.staleBody}</p> : null}
            <Tabs
              tabs={[{ id: "portfolio", label: copy.portfolioTab }, { id: "allocations", label: copy.allocationsTab }]}
              activeTab={tab}
              onChange={(next) => setTab(next as TreasuryTab)}
              variant="line"
              aria-label={copy.tabLabel}
              getTabId={(id) => "treasury-tab-" + id}
              getPanelId={(id) => "treasury-panel-" + id}
            />
            <div className="flex min-w-0 flex-wrap justify-end gap-2">
              {tab === "portfolio" ? (
                <label className="min-w-0">
                  <span className="sr-only">{copy.accountFilter}</span>
                  <select className={controlClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                    <option value="">{copy.allAccounts}</option>
                    {allGroups.map((group) => <option key={group.id} value={group.id}>{accountLabel(group)}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="min-w-0">
                <span className="sr-only">{copy.teamFilter}</span>
                <select className={controlClass} value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                  <option value="">{copy.allTeams}</option>
                  {feed.teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
                </select>
              </label>
            </div>

            {tab === "portfolio" ? (
              <section id="treasury-panel-portfolio" role="tabpanel" aria-labelledby="treasury-tab-portfolio" className="space-y-6">
                {groups.length ? groups.map((group) => <TreasuryAccountHoldings key={group.id} feed={feed} group={group} excludeYfi={excludeYfi} />) : <EmptyState text={feed.holdings.length ? copy.emptyFiltered : copy.emptyTitle} />}
                <SnapshotDetails feed={feed} excludeYfi={excludeYfi} />
              </section>
            ) : (
              <section id="treasury-panel-allocations" role="tabpanel" aria-labelledby="treasury-tab-allocations" className="space-y-6">
                {allocations.length ? <TreasuryAllocations feed={feed} allocations={allocations} /> : <EmptyState text={copy.emptyAllocations} />}
                <TreasuryHistory history={feed.history} />
              </section>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function accountLabel(group: TreasuryAccountGroup) {
  return group.kind === "robo" ? copy.robo : group.accounts[0].label;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-border px-4 py-6 text-sm text-text-secondary">{text}</p>;
}

function SnapshotDetails({ feed, excludeYfi }: { feed: TreasuryFeed; excludeYfi: boolean }) {
  const warnings = feed.mode === "fixture" ? feed.coverage.warnings.filter((warning) => !warning.startsWith("Demonstration amounts.")) : feed.coverage.warnings;
  return (
    <details className="group border-t border-border pt-2">
      <summary className={treasurySummaryClass}><span aria-hidden="true" className="transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>{copy.snapshotDetails}</summary>
      <div className="space-y-2 pb-2 text-xs leading-5 text-text-secondary">
        <p>{copy.snapshotScope}</p>
        <p>{copy.cadence} · <a className={treasuryLinkClass} href={"https://etherscan.io/block/" + feed.blockNumber} target="_blank" rel="noopener noreferrer">{copy.block} {feed.blockNumber.toLocaleString("en-US")} ↗</a></p>
        {feed.coverage.inventory === "registry-only" ? <p>{copy.inventoryLimited}</p> : null}
        {feed.summary.unpricedHoldingCount > 0 ? <p>{feed.summary.unpricedHoldingCount} {copy.unpriced}.</p> : null}
        {excludeYfi && feed.summary.unknownYfiSplitCount > 0 ? <p>{feed.summary.unknownYfiSplitCount} {copy.unknownYfi}.</p> : null}
        {warnings.map((warning) => <p key={warning}>{warning}</p>)}
      </div>
    </details>
  );
}
