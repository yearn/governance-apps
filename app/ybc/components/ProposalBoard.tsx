"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import type {
  YbcMockDataV1,
  YbcProposalType,
  YbcVoteChoice,
} from "@/lib/clients/ybc";
import { formatAddress, formatPercent } from "@/lib/format";
import type { TxState } from "@/lib/tx/types";
import { ProposalCard } from "./ProposalCard";
import { ybcCopy as copy } from "../messages";

type ProposalBoardProps = {
  data: YbcMockDataV1;
  id?: string;
  createProposal?: (
    type: YbcProposalType,
    targetAddress?: string
  ) => void | Promise<void>;
  executeProposal?: (proposalId: string) => void | Promise<void>;
  proposalTargetRequired?: boolean;
  proposalTxState?: TxState;
  resetProposalTx?: () => void;
  retractProposal?: (proposalId: string) => void | Promise<void>;
  voteOnProposal?: (
    proposalId: string,
    choice: YbcVoteChoice
  ) => void | Promise<void>;
};

export function ProposalBoard({
  data,
  id,
  createProposal,
  executeProposal,
  proposalTargetRequired = false,
  proposalTxState,
  resetProposalTx,
  retractProposal,
  voteOnProposal,
}: ProposalBoardProps) {
  const [proposalType, setProposalType] = useState<YbcProposalType>("addition");
  const [targetAddress, setTargetAddress] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const additionThresholdBps = getThresholdBps(data, "addition");
  const expulsionThresholdBps = getThresholdBps(data, "expulsion");
  const accountLabels = getAccountLabels(data);
  const canCreateProposal = data.me.canPropose && Boolean(createProposal);
  const transactionPending = isYbcProposalTxPending(proposalTxState);
  const transactionError =
    proposalTxState?.status === "error" ? proposalTxState.errorMessage : null;
  const canSubmitProposal = canCreateProposal && !transactionPending;

  const switchProposalType = (nextType: string) => {
    if (nextType !== "addition" && nextType !== "expulsion") return;
    setProposalType(nextType);
    setTargetAddress("");
    setTargetError(null);
    resetProposalTx?.();
  };

  const submitProposal = () => {
    if (!createProposal) return;

    if (!proposalTargetRequired) {
      void createProposal(proposalType);
      return;
    }

    const trimmedTarget = targetAddress.trim();
    if (!isAddress(trimmedTarget)) {
      setTargetError(copy.proposalBoard.targetInvalid);
      return;
    }

    setTargetError(null);
    void createProposal(proposalType, trimmedTarget);
  };

  return (
    <section id={id} className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{copy.proposalBoard.eyebrow}</Badge>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{copy.proposalBoard.title}</h2>
          <p className="max-w-3xl text-sm leading-6 text-text-secondary">
            {copy.proposalBoard.description}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-end gap-2">
            <div className="w-full max-w-xl space-y-3 rounded-box border border-border bg-app/60 p-4 sm:w-auto sm:min-w-[360px]">
              <Tabs
                activeTab={proposalType}
                onChange={switchProposalType}
                aria-label="YBC proposal type"
                tabs={[
                  { id: "addition", label: "Add member" },
                  { id: "expulsion", label: "Remove member" },
                ]}
              />
              {proposalTargetRequired ? (
                <div>
                  <label
                    className="mb-1 block text-xs font-bold uppercase text-text-tertiary"
                    htmlFor="ybc-proposal-target"
                  >
                    {copy.proposalBoard.targetLabel}
                  </label>
                  <input
                    id="ybc-proposal-target"
                    className="h-11 w-full rounded-box border border-border bg-surface px-3 font-number text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-text-primary focus:ring-2 focus:ring-text-primary/10"
                    value={targetAddress}
                    onChange={(event) => {
                      setTargetAddress(event.target.value);
                      if (targetError) {
                        setTargetError(null);
                      }
                    }}
                    placeholder="0x..."
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              ) : null}
              <Button
                className="w-full"
                size="sm"
                onClick={submitProposal}
                disabled={!canSubmitProposal}
                isLoading={transactionPending}
              >
                {getProposalSubmitLabel(proposalType, canCreateProposal)}
              </Button>
              {!canCreateProposal ? (
                <p className="rounded-box border border-border bg-app px-3 py-2 text-sm leading-6 text-text-secondary">
                  {copy.proposalBoard.proposeDisabledBody}
                </p>
              ) : null}
              {targetError || transactionError ? (
                <p
                  className="rounded-box border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900"
                  role="alert"
                >
                  {targetError ?? transactionError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label={copy.proposalBoard.summary.active}
              value={String(data.proposals.summary.activeCount)}
            />
            <SummaryStat
              label={copy.proposalBoard.summary.awaitingExecution}
              value={String(data.proposals.summary.awaitingExecutionCount)}
            />
            <SummaryStat
              label={copy.proposalBoard.summary.terminal}
              value={String(data.proposals.summary.terminalCount)}
            />
          </div>

          {data.proposals.items.length > 0 ? (
            <div className="space-y-4">
              {data.proposals.items.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  proposerLabel={
                    accountLabels[proposal.proposer.toLowerCase()] ??
                    formatAddress(proposal.proposer)
                  }
                  targetLabel={
                    accountLabels[proposal.targetAccount.toLowerCase()] ??
                    formatAddress(proposal.targetAccount)
                  }
                  onRetract={
                    retractProposal
                      ? () => {
                          void retractProposal(proposal.id);
                        }
                      : undefined
                  }
                  onVote={
                    voteOnProposal
                      ? (choice) => {
                          void voteOnProposal(proposal.id, choice);
                        }
                      : undefined
                  }
                  onExecute={
                    executeProposal
                      ? () => {
                          void executeProposal(proposal.id);
                        }
                      : undefined
                  }
                  transactionPending={transactionPending}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed bg-app/40">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-text-primary">
                  {copy.proposalBoard.emptyTitle}
                </h3>
                <p className="text-sm leading-6 text-text-secondary">
                  {copy.proposalBoard.emptyBody}
                </p>
                <p className="text-sm font-medium text-text-primary">
                  {copy.proposalBoard.emptyHint}
                </p>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="bg-app/50 p-4">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              {copy.proposalBoard.thresholdTitle}
            </p>
            <div className="mt-4 space-y-4">
              <ThresholdRow
                label="Add member"
                value={formatPercent(additionThresholdBps / 10_000, 0)}
              />
              <ThresholdRow
                label="Remove member"
                value={formatPercent(expulsionThresholdBps / 10_000, 0)}
              />
            </div>
          </Card>

          <Card className="bg-app/50 p-4">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              {copy.proposalBoard.viewerTitle}
            </p>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <ViewerRow
                label="Wallet"
                value={
                  data.me.address
                    ? accountLabels[data.me.address.toLowerCase()] ??
                      formatAddress(data.me.address)
                    : "Observer"
                }
              />
              <ViewerRow
                label="Effective weight"
                value={`${data.me.weight.effectiveWeight} voting weight`}
              />
              <ViewerRow
                label="Can propose"
                value={data.me.canPropose ? "Yes" : "No"}
              />
              <ViewerRow
                label="Can vote"
                value={data.me.canVote ? "Yes" : "No"}
              />
            </div>
          </Card>

          <Card className="bg-app/50 p-4">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              {copy.proposalBoard.terminalTitle}
            </p>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {copy.proposalBoard.terminalBody}
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function getThresholdBps(data: YbcMockDataV1, type: YbcProposalType): number {
  if (type === "addition") {
    return (
      data.admin?.thresholds.additionBps ??
      data.proposals.items.find((proposal) => proposal.type === "addition")
        ?.thresholdBps ??
      5000
    );
  }

  return (
    data.admin?.thresholds.expulsionBps ??
    data.proposals.items.find((proposal) => proposal.type === "expulsion")
      ?.thresholdBps ??
    6000
  );
}

function getProposalSubmitLabel(
  type: YbcProposalType,
  canCreateProposal: boolean
) {
  if (type === "addition") {
    return canCreateProposal
      ? copy.proposalBoard.proposeAdditionCta
      : copy.proposalBoard.proposeAdditionDisabledCta;
  }

  return canCreateProposal
    ? copy.proposalBoard.proposeExpulsionCta
    : copy.proposalBoard.proposeExpulsionDisabledCta;
}

function getAccountLabels(data: YbcMockDataV1): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const member of data.roster.members) {
    labels[member.address.toLowerCase()] = member.ens ?? formatAddress(member.address);
  }

  if (data.me.address) {
    labels[data.me.address.toLowerCase()] =
      labels[data.me.address.toLowerCase()] ?? "You";
  }

  return labels;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box border border-border bg-app/60 p-4">
      <p className="text-xs font-bold uppercase text-text-tertiary">{label}</p>
      <p className="mt-2 font-number text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

function ThresholdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="font-number text-sm font-bold text-text-primary">{value}</span>
    </div>
  );
}

function ViewerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <span className="text-text-tertiary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

function isYbcProposalTxPending(state?: TxState) {
  return (
    state?.status === "signing" ||
    state?.status === "submitted" ||
    state?.status === "mining"
  );
}
