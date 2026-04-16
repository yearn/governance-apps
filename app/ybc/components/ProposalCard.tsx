"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatPercent } from "@/lib/format";
import type { YbcProposalRecord } from "@/lib/clients/ybc";
import {
  getYbcProposalThresholdState,
  type YbcVoteChoice,
} from "@/lib/clients/ybc/mock";

type ProposalCardProps = {
  proposal: YbcProposalRecord;
  proposerLabel: string;
  targetLabel: string;
  onRetract: () => void;
  onVote: (choice: YbcVoteChoice) => void;
  onExecute: () => void;
};

type TimelineStatus = "complete" | "current" | "upcoming" | "closed";

const proposalTypeLabel = {
  addition: "Add member",
  expulsion: "Remove member",
} as const;

const phaseLabel = {
  discussion: "Discussion",
  voting: "Voting",
  "awaiting-execution": "Awaiting Execution",
  executed: "Executed",
  expired: "Expired",
  failed: "Failed",
  retracted: "Retracted",
} as const;

const badgeVariantByPhase = {
  discussion: "brand",
  voting: "warning",
  "awaiting-execution": "success",
  executed: "success",
  expired: "error",
  failed: "error",
  retracted: "neutral",
} as const;

const badgeVariantByStatus = {
  complete: "success",
  current: "brand",
  upcoming: "neutral",
  closed: "warning",
} as const;

export function ProposalCard({
  proposal,
  proposerLabel,
  targetLabel,
  onRetract,
  onVote,
  onExecute,
}: ProposalCardProps) {
  const threshold = getYbcProposalThresholdState(proposal);
  const headingId = `${proposal.id}-heading`;
  const timelineRows = getTimelineRows(proposal);

  return (
    <Card className="border-border bg-app/70 p-0">
      <div role="article" aria-labelledby={headingId} className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{proposal.id}</Badge>
              <Badge variant="brand">{proposalTypeLabel[proposal.type]}</Badge>
              <Badge variant={badgeVariantByPhase[proposal.phase]}>
                {phaseLabel[proposal.phase]}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 id={headingId} className="text-xl font-bold text-text-primary">
                {proposal.id} · {proposalTypeLabel[proposal.type]} proposal for{" "}
                {targetLabel}
              </h3>
              <p className="text-sm text-text-secondary">
                Proposed by {proposerLabel} in epoch {proposal.epoch}
              </p>
            </div>
          </div>
          <div className="min-w-[200px] rounded-box border border-border bg-surface p-3">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              Next action
            </p>
            <p className="mt-1 text-sm font-bold text-text-primary">
              {getNextActionLabel(proposal)}
            </p>
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              {getDisabledReason(proposal)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)]">
          <div className="space-y-4">
            <div className="rounded-box border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-text-tertiary">
                    Threshold target
                  </p>
                  <p className="mt-1 text-lg font-bold text-text-primary">
                    {formatPercent(threshold.thresholdRatio, 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-text-tertiary">
                    Current support
                  </p>
                  <p className="mt-1 text-lg font-bold text-text-primary">
                    {formatPercent(threshold.currentRatio, 1)}
                  </p>
                </div>
              </div>
              <ProgressBar
                value={threshold.currentBps}
                max={10_000}
                variant={threshold.thresholdMet ? "success" : "warning"}
                className="mt-4 h-3"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
                <span>{formatAmount(proposal.votes.yea)} yea weight</span>
                <span>{formatAmount(proposal.votes.total)} total weight</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-text-tertiary">
                <span>{formatAmount(proposal.votes.nay)} nay weight</span>
                <span>
                  {threshold.thresholdMet ? "Threshold met" : "Below threshold"}
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {proposal.actions.canRetract ? (
                <Button size="sm" variant="secondary" onClick={onRetract}>
                  Retract proposal
                </Button>
              ) : null}
              {proposal.actions.canVote ? (
                <>
                  <Button size="sm" onClick={() => onVote("yea")}>
                    Vote yea
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onVote("nay")}>
                    Vote nay
                  </Button>
                </>
              ) : null}
              {proposal.actions.canExecute ? (
                <Button size="sm" onClick={onExecute}>
                  Execute proposal
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-box border border-border bg-surface p-4">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              Proposal timeline (UTC)
            </p>
            <div className="mt-4 space-y-3">
              {timelineRows.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-2 rounded-box border border-border px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-text-primary">{row.label}</p>
                    <Badge variant={badgeVariantByStatus[row.status]}>
                      {row.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function getDisabledReason(proposal: YbcProposalRecord): string {
  if (proposal.phase === "expired") {
    return "Expired proposals are terminal. Start a new proposal instead.";
  }

  return proposal.actions.disabledReason ?? "No further mock actions are available.";
}

function getNextActionLabel(proposal: YbcProposalRecord): string {
  if (proposal.actions.canRetract) return "Retract while discussion is open";
  if (proposal.actions.canVote) return "Vote during the active window";
  if (proposal.actions.canExecute) return "Execute before the proposal expires";

  if (proposal.phase === "expired") return "Expired and closed";
  if (proposal.phase === "executed") return "Executed and complete";
  if (proposal.phase === "failed") return "Failed and closed";
  if (proposal.phase === "retracted") return "Retracted and closed";

  return "Waiting for the next phase";
}

function getTimelineRows(
  proposal: YbcProposalRecord
): Array<{ label: string; value: string; status: TimelineStatus }> {
  return [
    {
      label: "Discussion opens",
      value: formatTimestamp(proposal.timing.discussionStartsAt),
      status: proposal.phase === "discussion" ? "current" : "complete",
    },
    {
      label: "Voting opens",
      value: formatTimestamp(proposal.timing.votingStartsAt),
      status: getVotingOpenStatus(proposal),
    },
    {
      label: "Voting closes",
      value: formatTimestamp(proposal.timing.votingEndsAt),
      status: getVotingCloseStatus(proposal),
    },
    {
      label: "Execution opens",
      value: formatTimestamp(proposal.timing.executionOpensAt),
      status: getExecutionStatus(proposal),
    },
    {
      label: proposal.phase === "expired" ? "Expired at" : "Execution expires",
      value: formatTimestamp(proposal.timing.expiresAt),
      status: getExpiryStatus(proposal),
    },
    ...(proposal.timing.executedAt
      ? [
          {
            label: "Executed at",
            value: formatTimestamp(proposal.timing.executedAt),
            status: "complete" as const,
          },
        ]
      : []),
  ];
}

function getVotingOpenStatus(proposal: YbcProposalRecord): TimelineStatus {
  if (proposal.phase === "discussion") return "upcoming";
  if (proposal.phase === "voting") return "current";
  return "complete";
}

function getVotingCloseStatus(proposal: YbcProposalRecord): TimelineStatus {
  if (proposal.phase === "discussion") return "upcoming";
  if (proposal.phase === "voting") return "current";
  return "complete";
}

function getExecutionStatus(proposal: YbcProposalRecord): TimelineStatus {
  if (proposal.phase === "discussion" || proposal.phase === "voting") {
    return "upcoming";
  }
  if (proposal.phase === "awaiting-execution") {
    return "current";
  }
  if (proposal.phase === "failed" || proposal.phase === "retracted") {
    return "closed";
  }
  return "complete";
}

function getExpiryStatus(proposal: YbcProposalRecord): TimelineStatus {
  if (proposal.phase === "expired") return "closed";
  if (proposal.phase === "executed" || proposal.phase === "failed" || proposal.phase === "retracted") {
    return "closed";
  }
  return "upcoming";
}

function formatAmount(value: string): string {
  return Number.parseFloat(value).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}
