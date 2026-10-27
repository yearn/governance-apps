"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import type { YbcMockDataV1, YbcProposalType, YbcVoteChoice } from "@/lib/clients/ybc";
import { getYbcProposalGroup } from "@/lib/clients/ybc/read-display";
import type { TxState } from "@/lib/tx/types";
import { getYbcIdentity, type YbcIdentityMap } from "../identity";
import { ProposalCard } from "./ProposalCard";
import { ybcCopy } from "../messages";

type ProposalBoardProps = {
  data: YbcMockDataV1;
  identities: YbcIdentityMap;
  id?: string;
  createProposal?: (type: YbcProposalType, targetAddress?: string) => void | Promise<void>;
  executeProposal?: (proposalId: string) => void | Promise<void>;
  proposalTargetRequired?: boolean;
  proposalTxState?: TxState;
  resetProposalTx?: () => void;
  focusedProposalId?: string | null;
  retractProposal?: (proposalId: string) => void | Promise<void>;
  voteOnProposal?: (proposalId: string, choice: YbcVoteChoice) => void | Promise<void>;
};

type Group = "active" | "history" | "all";
const GROUPS: Group[] = ["active", "history", "all"];

export function ProposalBoard({ data, identities, id, createProposal, executeProposal, proposalTargetRequired = false, proposalTxState, resetProposalTx, focusedProposalId = null, retractProposal, voteOnProposal }: ProposalBoardProps) {
  const copy = ybcCopy.proposalBoard;
  const items = data.proposals.items;
  const counts = {
    active: items.filter((proposal) => getYbcProposalGroup(proposal) === "active").length,
    history: items.filter((proposal) => getYbcProposalGroup(proposal) === "history").length,
    all: items.length,
  };
  const [group, setGroup] = useState<Group>(counts.active ? "active" : "history");
  const [search, setSearch] = useState("");
  const [lastFocusedId, setLastFocusedId] = useState<string | null>(null);
  if (focusedProposalId !== lastFocusedId) {
    setLastFocusedId(focusedProposalId);
    const focused = items.find((proposal) => proposal.id === focusedProposalId);
    if (focused) { setGroup(getYbcProposalGroup(focused)); setSearch(""); }
  }
  const [composerOpen, setComposerOpen] = useState(false);
  const [proposalType, setProposalType] = useState<YbcProposalType>("addition");
  const [targetAddress, setTargetAddress] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const transactionPending = ["signing", "submitted", "mining"].includes(proposalTxState?.status ?? "");
  const transactionError = proposalTxState?.status === "error" ? proposalTxState.errorMessage : null;
  const error = actionError ?? transactionError;
  const canCreateProposal = data.me.canPropose && Boolean(createProposal);
  const query = search.trim().toLowerCase();
  const visible = items.filter((proposal) => (group === "all" || getYbcProposalGroup(proposal) === group) &&
    (!query || [proposal.id, proposal.targetAccount, proposal.proposer, getYbcIdentity(identities, proposal.targetAccount).label, getYbcIdentity(identities, proposal.proposer).label].some((value) => value.toLowerCase().includes(query))))
    .toSorted((a, b) => b.timing.createdAt - a.timing.createdAt || b.id.localeCompare(a.id, undefined, { numeric: true }));

  const runAction = (action: () => void | Promise<void>, proposalId: string | null = null) => {
    setActionError(null);
    setActionId(proposalId);
    resetProposalTx?.();
    try { void Promise.resolve(action()).catch((error: unknown) => setActionError(error instanceof Error && error.message ? error.message : copy.actionFailed)); }
    catch (error) { setActionError(error instanceof Error && error.message ? error.message : copy.actionFailed); }
  };
  const submitProposal = () => {
    if (!createProposal || !canCreateProposal || transactionPending) return;
    const target = targetAddress.trim();
    if (proposalTargetRequired && !isAddress(target)) { setTargetError(copy.targetInvalid); return; }
    setTargetError(null);
    setGroup("active");
    setSearch("");
    runAction(() => createProposal(proposalType, proposalTargetRequired ? target : undefined));
  };

  return (
    <section id={id} className="min-w-0 scroll-mt-24 space-y-5" aria-label={copy.title}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1"><h2 className="text-balance text-2xl font-bold">{copy.title}</h2><p className="text-sm leading-6 text-text-secondary">{copy.description}</p></div>
        <Button size="sm" variant="secondary" disabled={!canCreateProposal || transactionPending} aria-expanded={composerOpen} aria-controls="ybc-new-proposal" onClick={() => setComposerOpen(!composerOpen)}>{composerOpen ? copy.closeComposer : copy.newProposal}</Button>
      </div>
      {!canCreateProposal ? <p className="text-xs text-text-secondary">{copy.proposeDisabledBody}</p> : null}
      {composerOpen ? <Card id="ybc-new-proposal" className="min-w-0 space-y-4 shadow-none">
        <h3 className="text-lg font-bold">{copy.newProposal}</h3>
        <div className="flex min-w-0 flex-wrap items-start gap-5">
          <Tabs activeTab={proposalType} onChange={(type) => {
            if (type !== "addition" && type !== "expulsion") return;
            setProposalType(type); setTargetAddress(""); setTargetError(null); setActionError(null); resetProposalTx?.();
          }} aria-label={copy.typeLabel} tabs={[{ id: "addition", label: ybcCopy.proposal.types.addition }, { id: "expulsion", label: ybcCopy.proposal.types.expulsion }]} />
          <div className="min-w-0 flex-1 space-y-3 sm:min-w-64">
            {proposalTargetRequired ? <div><label htmlFor="ybc-proposal-target" className="mb-1 block text-sm font-bold">{copy.targetLabel}</label>
              <input id="ybc-proposal-target" className="h-11 w-full rounded-box border border-border bg-surface px-3 font-number text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
                value={targetAddress} onChange={(event) => { setTargetAddress(event.target.value); setTargetError(null); }} placeholder="0x..." spellCheck={false} autoComplete="off" aria-invalid={Boolean(targetError)} aria-describedby={targetError ? "ybc-target-error" : undefined} />
            </div> : null}
            <p className="text-xs text-text-secondary">{copy.creationThreshold(getThresholdBps(data, proposalType) / 100)}</p>
            <Button size="sm" disabled={!canCreateProposal || transactionPending} isLoading={transactionPending && actionId === null} onClick={submitProposal}>{proposalType === "addition" ? copy.proposeAdditionCta : copy.proposeExpulsionCta}</Button>
          </div>
        </div>
        {targetError || (actionId === null && error) ? <p id="ybc-target-error" role="alert" className="text-sm text-red-700 dark:text-red-300">{targetError ?? error}</p> : null}
      </Card> : null}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="max-w-full overflow-x-auto">
          <Tabs aria-label={copy.filterLabel} activeTab={group} onChange={(value) => { if (GROUPS.includes(value as Group)) setGroup(value as Group); }}
            getTabId={(value) => `ybc-filter-${value}`} getPanelId={(value) => `ybc-panel-${value}`}
            tabs={GROUPS.map((value) => ({ id: value, label: copy.filters[value], badge: <span className="font-number text-xs tabular-nums">{counts[value]}</span> }))} />
        </div>
        <input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(event) => setSearch(event.target.value)}
          className="min-h-10 w-full min-w-0 rounded-box border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary sm:w-72" />
      </div>
      <div id={`ybc-panel-${group}`} role="tabpanel" aria-labelledby={`ybc-filter-${group}`} tabIndex={0} className="min-w-0 rounded-box focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
        <p className="sr-only" aria-live="polite">{copy.resultCount(visible.length)}</p>
        {visible.length ? <Card className="min-w-0 divide-y divide-border p-0 shadow-none">
          {visible.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} identities={identities} focused={proposal.id === focusedProposalId}
            onRetract={retractProposal ? () => runAction(() => retractProposal(proposal.id), proposal.id) : undefined}
            onVote={voteOnProposal ? (choice) => runAction(() => voteOnProposal(proposal.id, choice), proposal.id) : undefined}
            onExecute={executeProposal ? () => runAction(() => executeProposal(proposal.id), proposal.id) : undefined}
            transactionPending={transactionPending} actionPending={transactionPending && actionId === proposal.id} actionError={actionId === proposal.id ? error : null} />)}
        </Card> : <Card className="space-y-2 shadow-none">
          <h3 className="text-lg font-bold">{!items.length ? copy.emptyTitle : query ? copy.noMatches : copy.emptyGroup[group]}</h3>
          <p className="text-sm text-text-secondary">{!items.length ? copy.emptyBody : copy.filterHint}</p>
          {!items.length ? <p className="text-sm text-text-secondary">{copy.emptyHint}</p> : null}
          {items.length ? <Button size="sm" variant="secondary" onClick={() => { setGroup("all"); setSearch(""); }}>{copy.showAll}</Button> : null}
        </Card>}
      </div>
      <p className="text-xs leading-5 text-text-secondary">{copy.thresholdGuide(getThresholdBps(data, "addition") / 100, getThresholdBps(data, "expulsion") / 100)}</p>
    </section>
  );
}

function getThresholdBps(data: YbcMockDataV1, type: YbcProposalType): number {
  return (type === "addition" ? data.admin?.thresholds.additionBps : data.admin?.thresholds.expulsionBps)
    ?? data.proposals.items.find((proposal) => proposal.type === type)?.thresholdBps
    ?? (type === "addition" ? 5000 : 6000);
}
