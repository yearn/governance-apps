"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TransactionLink } from "@/components/ui/ExplorerLink";
import { UtcTime } from "@/components/ui/UtcTime";
import { formatDecimalAmount } from "@/lib/format";
import type { YbcProposalRecord } from "@/lib/clients/ybc";
import { getYbcIdentity, type YbcIdentityMap } from "../identity";
import { MemberIdentity } from "./MemberIdentity";
import { ybcCopy } from "../messages";

const PAGE_SIZE = 10;
export function ProposalVoters({ proposal, identities }: { proposal: YbcProposalRecord; identities: YbcIdentityMap }) {
  const copy = ybcCopy.voters;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const records = proposal.voteRecords;
  const query = search.trim().toLowerCase();
  const filtered = (records ?? []).filter((row) => !query || row.voter.toLowerCase().includes(query) || getYbcIdentity(identities, row.voter).label.toLowerCase().includes(query));
  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const rows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  return (
    <section className="min-w-0 space-y-4 border-t border-border pt-5" aria-label={copy.title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-base font-bold">{copy.title}{records ? <span className="ml-2 text-sm font-normal text-text-secondary">{records.length}</span> : null}</h4>
        {(records?.length ?? 0) > 0 ? <input type="search" aria-label={copy.search} placeholder={copy.search} value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); }}
          className="min-h-10 w-full rounded-box border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary sm:w-64" /> : null}
      </div>
      <p className="text-xs leading-5 text-text-secondary">{copy.caption}</p>
      {rows.length ? <div role="table" aria-label={copy.title} className="min-w-0">
        <div role="row" className="hidden grid-cols-[minmax(0,1.4fr)_0.6fr_1fr_1.4fr] gap-4 border-b border-border pb-3 text-xs font-bold text-text-secondary md:grid">
          {[copy.member, copy.choice, copy.weight, copy.date].map((label) => <span role="columnheader" key={label}>{label}</span>)}
        </div>
        <div role="rowgroup" className="divide-y divide-border">{rows.map((row) => <div role="row" key={row.id} className="grid min-w-0 grid-cols-2 gap-3 py-3 md:grid-cols-[minmax(0,1.4fr)_0.6fr_1fr_1.4fr]">
          <div role="cell" className="col-span-2 min-w-0 md:col-span-1"><MemberIdentity identity={getYbcIdentity(identities, row.voter)} layout="stacked" /></div>
          <div role="cell" className="text-sm"><span className="mb-1 block text-xs text-text-secondary md:hidden">{copy.choice}</span><span className={row.choice === "yea" ? "font-bold text-green-800 dark:text-green-300" : "font-bold text-red-700 dark:text-red-300"}>{row.choice === "yea" ? copy.yea : copy.nay}</span></div>
          <div role="cell" className="min-w-0 break-words font-number text-sm tabular-nums [overflow-wrap:anywhere]"><span className="mb-1 block font-sans text-xs text-text-secondary md:hidden">{copy.weight}</span>{formatDecimalAmount(row.weight, 4)}</div>
          <div role="cell" className="col-span-2 min-w-0 text-xs text-text-secondary md:col-span-1"><UtcTime timestamp={row.timestamp} fallback={copy.unknownDate} className="block" />{row.transactionHash ? <TransactionLink hash={row.transactionHash} label={copy.transaction} /> : null}</div>
        </div>)}</div>
      </div> : <p className="py-2 text-sm text-text-secondary" role="status">{!records ? copy.unavailable : records.length ? copy.noMatches : copy.empty}</p>}
      {lastPage > 0 ? <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-text-secondary">{copy.page(currentPage + 1, lastPage + 1)}</p>
        <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{copy.previous}</Button><Button size="sm" variant="secondary" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>{copy.next}</Button></div>
      </div> : null}
    </section>
  );
}
