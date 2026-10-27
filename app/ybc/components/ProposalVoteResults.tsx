import { VoteResultsBar } from "@/components/ui/VoteResultsBar";
import { formatDecimalAmount } from "@/lib/format";
import { getYbcVoteSummary } from "@/lib/clients/ybc/read-display";
import type { YbcProposalRecord } from "@/lib/clients/ybc";
import { ybcCopy } from "../messages";

export function ProposalVoteResults({ proposal, compact = false }: { proposal: YbcProposalRecord; compact?: boolean }) {
  const copy = ybcCopy.proposal;
  const vote = getYbcVoteSummary(proposal);
  const threshold = proposal.thresholdBps / 100;
  return (
    <div className="min-w-0 space-y-2" aria-label={copy.results}>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs font-bold tabular-nums">
        {vote.hasVotes ? <>
          <span className="text-text-primary">{copy.percentYea(vote.yeaPercent)}</span>
          <span className="text-text-secondary">{copy.percentNay(vote.nayPercent)}</span>
        </> : <span className="text-text-secondary">{copy.noVotes}</span>}
      </div>
      <VoteResultsBar className={compact ? "h-2.5" : undefined} thresholdPercent={threshold} segments={[
        { kind: "yea", widthPercent: vote.yeaPercent },
        { kind: "nay", widthPercent: vote.nayPercent },
      ]} />
      <p className="text-xs tabular-nums text-text-secondary">
        {copy.threshold(threshold)}{vote.hasVotes ? ` · ${vote.thresholdMet ? copy.thresholdMet : copy.belowThreshold}` : ""}
      </p>
      {!compact ? <dl className="grid grid-cols-3 gap-3 pt-3">
        {(["yea", "nay", "total"] as const).map((key) => <div key={key} className="min-w-0 space-y-1">
          <dt className="text-xs text-text-secondary">{copy.weights[key]}</dt>
          <dd className="break-words font-number text-sm font-bold tabular-nums [overflow-wrap:anywhere]">{formatDecimalAmount(proposal.votes[key], 4)}</dd>
        </div>)}
      </dl> : null}
    </div>
  );
}
