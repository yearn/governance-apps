import { Card } from "@/components/ui/Card";
import { UtcTime } from "@/components/ui/UtcTime";
import { formatTreasuryAmount } from "@/lib/clients/treasury/display";
import type { TreasuryAllocation } from "@/lib/clients/treasury/types";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import { treasuryCopy as copy } from "../messages";
import { treasuryLinkClass, treasurySummaryClass } from "./TreasuryHoldings";

type Amount = TreasuryAllocation["originalFunding"][number];

function Amounts({ values, fallback = copy.unconfirmed }: { values: Amount[] | null; fallback?: string }) {
  if (!values?.length) return <span className="text-sm text-text-secondary">{fallback}</span>;
  return <ul className="space-y-1 font-number text-sm tabular-nums">{values.map((amount) => <li key={amount.asset.chainId + ":" + amount.asset.address + ":" + amount.asset.symbol}>{formatTreasuryAmount(amount.raw, amount.asset.decimals)} {amount.asset.symbol}</li>)}</ul>;
}

export function TreasuryAllocations({ feed, allocations }: { feed: TreasuryFeed; allocations: TreasuryAllocation[] }) {
  return <div className="space-y-4">{allocations.map((allocation) => {
    const team = feed.teams.find((entry) => entry.id === allocation.accountableTeamId);
    const pending = allocation.status === "pending";
    return <Card key={allocation.id} data-testid={"treasury-allocation-" + allocation.id} className="min-w-0 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-balance text-lg font-bold">{allocation.title}</h3>
          <p className="text-sm text-text-secondary">{copy.kindLabels[allocation.kind]} · {allocation.counterparty}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-surface-secondary px-2 py-1.5 font-medium">{team?.label ?? copy.noTeam}</span>
          {pending ? <span className="rounded-md border border-border px-2 py-1.5">{copy.pending}</span> : null}
        </div>
      </div>
      {pending ? <p className="mt-4 text-sm text-text-secondary">{copy.pendingBody}</p> : null}
      <dl className="mt-5 grid gap-5 sm:grid-cols-3">
        <div><dt className="mb-2 text-xs text-text-secondary">{pending ? copy.plannedFunding : copy.originalFunding}</dt><dd><Amounts values={pending ? allocation.plannedFunding : allocation.originalFunding} /></dd></div>
        <div><dt className="mb-2 text-xs text-text-secondary">{copy.expectedReturn}</dt><dd><Amounts values={allocation.expectedReturn.amounts} />{allocation.expectedReturn.terms === "provisional" ? <span className="mt-1.5 block text-xs text-text-secondary">{copy.provisional}</span> : null}</dd></div>
        <div><dt className="mb-2 text-xs text-text-secondary">{copy.currentAmount}</dt><dd><Amounts values={allocation.outstanding.amounts} />{allocation.outstanding.asOf !== null ? <span className="mt-1.5 block text-xs text-text-secondary"><UtcTime timestamp={allocation.outstanding.asOf} format="date" /> · {copy.sourceLabels[allocation.outstanding.sourceKind]}</span> : null}</dd></div>
      </dl>
      {allocation.note ? <p className="mt-5 max-w-4xl text-pretty text-sm leading-6 text-text-secondary">{allocation.note}</p> : null}
      <details className="group mt-2">
        <summary className={treasurySummaryClass}><span aria-hidden="true" className="text-xs transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>{copy.returnTerms}<span className="sr-only"> — {allocation.title}</span></summary>
        <div className="space-y-2 pt-1 text-sm leading-6 text-text-secondary">
          {allocation.originalFundingNote ? <p>{allocation.originalFundingNote}</p> : null}
          <p>{allocation.expectedReturn.note ?? copy.termsLabels[allocation.expectedReturn.terms]}</p>
          {allocation.outstanding.note ? <p>{allocation.outstanding.note}</p> : null}
          {allocation.evidence.length ? <div className="flex flex-wrap gap-x-5">{allocation.evidence.map((evidence) => <a key={evidence.url} href={evidence.url} target="_blank" rel="noopener noreferrer" className={treasuryLinkClass}>{evidence.label} ↗<span className="sr-only"> — {allocation.title}</span></a>)}</div> : null}
        </div>
      </details>
    </Card>;
  })}</div>;
}

export function TreasuryHistory({ history }: { history: TreasuryFeed["history"] }) {
  if (!history.length) return null;
  return <details className="group border-t border-border pt-3">
    <summary className={treasurySummaryClass}><span aria-hidden="true" className="text-xs transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>{copy.history}<span className="ml-1 font-number text-xs tabular-nums">{history.length}</span></summary>
    <p className="mb-4 mt-1 text-sm text-text-secondary">{copy.historyBody}</p>
    <ul className="divide-y divide-border">{history.map((item) => <li key={item.id} className="flex min-w-0 flex-wrap justify-between gap-x-5 gap-y-1 py-3 text-sm">
      <div className="min-w-0"><span className="font-medium">{item.title}</span><span className="ml-2 text-xs text-text-secondary">{copy.historyLabels[item.status]}</span><p className="mt-1 text-xs leading-5 text-text-secondary">{item.note}</p></div>
      {item.evidence[0] ? <a className={treasuryLinkClass} href={item.evidence[0].url} target="_blank" rel="noopener noreferrer">{copy.source} ↗<span className="sr-only"> — {item.title}</span></a> : null}
    </li>)}</ul>
  </details>;
}
