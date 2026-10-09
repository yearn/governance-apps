"use client";

import { Fragment, useState } from "react";
import { UtcTime } from "@/components/ui/UtcTime";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTreasuryAmount } from "@/lib/clients/treasury/display";
import type { TreasuryAllocation } from "@/lib/clients/treasury/types";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import { treasuryCopy as copy } from "../messages";
import { Chevron, MissingValue, TreasuryAssetIcon, treasuryLinkClass, treasurySummaryClass } from "./TreasuryPrimitives";

type Amount = TreasuryAllocation["originalFunding"][number];

function Amounts({ values, compact = true }: { values: Amount[] | null; compact?: boolean }) {
  if (!values?.length) return <MissingValue />;
  return (
    <ul className="space-y-1.5">
      {values.map((amount) => {
        const full = formatTreasuryAmount(amount.raw, amount.asset.decimals);
        const shortened = formatTreasuryAmount(amount.raw, amount.asset.decimals, BigInt(amount.raw) >= 10n ** BigInt(amount.asset.decimals) ? 2 : 4);
        return (
          <li key={amount.asset.chainId + ":" + amount.asset.address + ":" + amount.asset.symbol} aria-label={full + " " + amount.asset.symbol} title={full + " " + amount.asset.symbol} className="flex flex-col items-end gap-0.5 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-x-1.5">
            <span className="font-sans text-xs tabular-nums sm:font-number sm:text-sm">
              {compact ? <><span className="whitespace-nowrap sm:hidden">{shortened}</span><span className="hidden whitespace-nowrap sm:inline">{full}</span></> : <span className="break-words">{full}</span>}
            </span>
            <span className="inline-flex max-w-full items-center justify-end gap-1 text-[10px] text-text-secondary sm:text-xs">
              <TreasuryAssetIcon asset={amount.asset} small />
              <span className="min-w-0 break-words">{amount.asset.symbol}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function needsFullAmount(values: Amount[] | null): boolean {
  return values?.some((amount) => formatTreasuryAmount(amount.raw, amount.asset.decimals) !== formatTreasuryAmount(amount.raw, amount.asset.decimals, BigInt(amount.raw) >= 10n ** BigInt(amount.asset.decimals) ? 2 : 4)) ?? false;
}

export function TreasuryAllocations({ feed, allocations }: { feed: TreasuryFeed; allocations: TreasuryAllocation[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <Table className="table-fixed" aria-label={copy.allocationsTab}>
        <TableHeader>
          <TableRow className="bg-surface-secondary/30">
            <TableHead scope="col" className="h-9 w-[40%] px-3 text-xs md:w-[30%]">{copy.position}</TableHead>
            <TableHead scope="col" className="h-9 w-[30%] px-2 text-right text-xs md:w-[20%]">{copy.funded}</TableHead>
            <TableHead scope="col" className="h-9 w-[30%] px-2 text-right text-xs md:w-[20%] md:px-3">{copy.currentAmount}</TableHead>
            <TableHead scope="col" className="hidden h-9 w-[15%] px-3 text-xs md:table-cell">{copy.team}</TableHead>
            <TableHead scope="col" className="hidden h-9 w-[15%] px-3 text-xs md:table-cell">{copy.reference}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allocations.map((allocation) => {
            const team = feed.teams.find((entry) => entry.id === allocation.accountableTeamId);
            const open = expanded === allocation.id;
            const pending = allocation.status === "pending";
            const reference = allocation.evidence[0];
            return (
              <Fragment key={allocation.id}>
                <TableRow data-testid={"treasury-allocation-" + allocation.id}>
                  <TableCell className="px-3 py-2">
                    <button type="button" onClick={() => setExpanded(open ? null : allocation.id)} aria-expanded={open} aria-controls={"treasury-allocation-details-" + allocation.id} className="flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary">
                      <span className="text-text-secondary"><Chevron open={open} /></span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold sm:text-sm">{allocation.title}</span>
                        <span className="mt-0.5 block text-[10px] text-text-secondary">{pending ? copy.pending : copy.kindLabels[allocation.kind]}</span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-right"><Amounts values={allocation.originalFunding} /></TableCell>
                  <TableCell className="px-2 py-2 text-right md:px-3"><Amounts values={allocation.outstanding.amounts} /></TableCell>
                  <TableCell className="hidden px-3 py-2 text-xs text-text-secondary md:table-cell">{team?.label ?? <MissingValue />}</TableCell>
                  <TableCell className="hidden px-3 py-2 md:table-cell">{reference ? <a className={treasuryLinkClass} href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label} ↗<span className="sr-only"> — {allocation.title}</span></a> : <MissingValue />}</TableCell>
                </TableRow>
                {open ? (
                  <TableRow id={"treasury-allocation-details-" + allocation.id} className="bg-surface-secondary/40">
                    <TableCell colSpan={5} className="px-4 py-3">
                      <dl className="grid gap-x-6 gap-y-3 text-xs leading-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div><dt className="text-text-secondary">{copy.counterparty}</dt><dd>{allocation.counterparty}</dd></div>
                        <div><dt className="text-text-secondary">{copy.team}</dt><dd>{team?.label ?? <MissingValue />}</dd></div>
                        {pending ? <div><dt className="text-text-secondary">{copy.plannedFunding}</dt><dd className="text-left"><Amounts values={allocation.plannedFunding} /><span className="mt-1 block text-text-secondary">{copy.pendingBody}</span></dd></div> : null}
                        {allocation.note ? <div><dt className="text-text-secondary">{copy.note}</dt><dd>{allocation.note}</dd></div> : null}
                        {needsFullAmount(allocation.originalFunding) || allocation.originalFundingNote ? <div><dt className="text-text-secondary">{copy.funded}</dt><dd>{needsFullAmount(allocation.originalFunding) ? <Amounts values={allocation.originalFunding} compact={false} /> : null}{allocation.originalFundingNote}</dd></div> : null}
                        {needsFullAmount(allocation.outstanding.amounts) || allocation.outstanding.note ? <div><dt className="text-text-secondary">{copy.currentAmount}</dt><dd>{needsFullAmount(allocation.outstanding.amounts) ? <Amounts values={allocation.outstanding.amounts} compact={false} /> : null}{allocation.outstanding.note}</dd></div> : null}
                        {allocation.outstanding.asOf !== null ? <div><dt className="text-text-secondary">{copy.lastUpdated}</dt><dd><UtcTime timestamp={allocation.outstanding.asOf} /> · {copy.sourceLabels[allocation.outstanding.sourceKind]}</dd></div> : null}
                        {allocation.evidence.length ? <div><dt className="text-text-secondary">{copy.reference}</dt><dd className="flex flex-wrap gap-x-4">{allocation.evidence.map((evidence) => <a key={evidence.url} href={evidence.url} target="_blank" rel="noopener noreferrer" className={treasuryLinkClass}>{evidence.label} ↗</a>)}</dd></div> : null}
                      </dl>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function TreasuryHistory({ history }: { history: TreasuryFeed["history"] }) {
  if (!history.length) return null;
  return (
    <details className="group border-t border-border pt-2">
      <summary className={treasurySummaryClass}><span aria-hidden="true" className="transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>{copy.history}<span className="font-number tabular-nums">{history.length}</span></summary>
      <ul className="divide-y divide-border">
        {history.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-xs">
            <div className="min-w-0"><span className="font-medium">{item.title}</span><span className="ml-2 text-text-secondary">{copy.historyLabels[item.status]}</span><p className="mt-0.5 text-text-secondary">{item.note}</p></div>
            {item.evidence[0] ? <a className={treasuryLinkClass} href={item.evidence[0].url} target="_blank" rel="noopener noreferrer">{copy.reference} ↗<span className="sr-only"> — {item.title}</span></a> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
