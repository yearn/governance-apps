import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { UtcTime } from "@/components/ui/UtcTime";
import {
  deriveDaoProposalTimingDisplay,
  deriveDaoVoteDisplay,
  type DaoDisplayStatus,
  type DaoProposal,
  type DaoProposalTimingDisplay,
} from "@/lib/clients/dao";
import { cn } from "@/lib/cn";
import { daoCopy } from "../messages";

const STATUS_VARIANTS: Record<
  DaoDisplayStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  discussion: "neutral",
  voting: "brand",
  approved: "success",
  rejected: "error",
  executed: "success",
  expired: "warning",
  retracted: "neutral",
  flagged: "error",
  vetoed: "error",
  not_found: "neutral",
};

const STATUS_DARK_CLASS_NAMES: Partial<Record<DaoDisplayStatus, string>> = {
  voting:
    "bg-yearn-blue text-white dark:bg-blue-950 dark:text-blue-200",
  approved: "dark:bg-green-950 dark:text-green-200",
  executed: "dark:bg-green-950 dark:text-green-200",
};

export function ProposalStatusBadge({
  status,
}: {
  status: DaoDisplayStatus;
}) {
  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className={cn("font-sans", STATUS_DARK_CLASS_NAMES[status])}
      data-testid="dao-proposal-status"
    >
      {daoCopy.status[status]}
    </Badge>
  );
}

export function ProposalTypeBadge({ proposal }: { proposal: DaoProposal }) {
  return (
    <Badge className="font-sans">
      {daoCopy.proposalType[proposal.type]}
    </Badge>
  );
}

export function ProposalTiming({
  className,
  now,
  proposal,
  showExact = false,
}: {
  className?: string;
  now: number;
  proposal: DaoProposal;
  showExact?: boolean;
}) {
  const timing = deriveDaoProposalTimingDisplay(proposal, now);
  const timestamp = timing.timestamp;

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="text-pretty font-number text-sm font-bold tabular-nums text-text-primary">
        <ProposalTimingText timing={timing} />
      </p>
      {showExact && timestamp !== null ? (
        <UtcTime
          timestamp={timestamp}
          className="font-number text-xs tabular-nums text-text-secondary"
        />
      ) : null}
    </div>
  );
}

export function ProposalVoteSummary({
  compact = false,
  proposal,
}: {
  compact?: boolean;
  proposal: DaoProposal;
}) {
  const vote = deriveDaoVoteDisplay(proposal);

  return (
    <div className="min-w-0 space-y-2">
      <div
        aria-hidden="true"
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200"
      >
        <span
          aria-hidden="true"
          className="h-full bg-yearn-blue motion-reduce:transition-none"
          style={{ width: `${vote.yeaPercentTenths / 10}%` }}
        />
        <span
          aria-hidden="true"
          className="h-full bg-neutral-500 motion-reduce:transition-none"
          style={{ width: `${vote.nayPercentTenths / 10}%` }}
        />
      </div>
      <p className="font-number text-sm font-bold tabular-nums">
        {daoCopy.detail.voteBreakdown(vote.yeaPercent, vote.nayPercent)}
      </p>
      <p className="text-pretty font-number text-xs tabular-nums text-text-secondary">
        {daoCopy.detail.voteCaption(vote.thresholdPercent)}
      </p>
      {!compact ? (
        <dl className="grid grid-cols-3 gap-2 pt-2">
          <VoteFact label={daoCopy.detail.yeaWeight} value={vote.yeaWeight} />
          <VoteFact label={daoCopy.detail.nayWeight} value={vote.nayWeight} />
          <VoteFact label={daoCopy.detail.totalWeight} value={vote.totalWeight} />
        </dl>
      ) : null}
    </div>
  );
}

function ProposalTimingText({
  timing,
}: {
  timing: DaoProposalTimingDisplay;
}) {
  if (timing.kind === "voting_opens") {
    return daoCopy.timing.votingOpens(
      formatRelativeDuration(timing.remainingSeconds)
    );
  }
  if (timing.kind === "voting_ends") {
    return daoCopy.timing.votingEnds(
      formatRelativeDuration(timing.remainingSeconds)
    );
  }
  if (timing.kind === "execution_opens") {
    return daoCopy.timing.executionOpens(
      formatRelativeDuration(timing.remainingSeconds)
    );
  }
  if (timing.kind === "execution_expires") {
    return daoCopy.timing.executionExpires(
      formatRelativeDuration(timing.remainingSeconds)
    );
  }
  if (timing.kind === "approved_on") {
    return (
      <>
        {daoCopy.timing.approvedOn} <UtcTime timestamp={timing.timestamp} format="date" />
      </>
    );
  }
  if (timing.kind === "rejected_on") {
    return (
      <>
        {daoCopy.timing.rejectedOn} <UtcTime timestamp={timing.timestamp} format="date" />
      </>
    );
  }
  if (timing.kind === "execution_expired_on") {
    return (
      <>
        {daoCopy.timing.executionExpiredOn}{" "}
        <UtcTime timestamp={timing.timestamp} format="date" />
      </>
    );
  }

  const eventLabel =
    timing.kind === "executed_recorded"
      ? daoCopy.timing.executedRecorded
      : timing.kind === "retracted_recorded"
        ? daoCopy.timing.retractedRecorded
        : timing.kind === "flagged_recorded"
          ? daoCopy.timing.flaggedRecorded
          : daoCopy.timing.vetoedRecorded;
  return (
    <>
      {eventLabel}
      {timing.event
        ? ` ${daoCopy.timing.atBlock(timing.event.log.blockNumber.toString())}`
        : null}
    </>
  );
}

function VoteFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-pretty text-[11px] font-bold text-text-secondary">
        {label}
      </dt>
      <dd className="break-words font-number text-xs tabular-nums [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function formatRelativeDuration(seconds: number): string {
  if (seconds >= 86_400) {
    return daoCopy.timing.duration.day(Math.ceil(seconds / 86_400));
  }
  if (seconds >= 3_600) {
    return daoCopy.timing.duration.hour(Math.ceil(seconds / 3_600));
  }
  return daoCopy.timing.duration.minute(Math.max(1, Math.ceil(seconds / 60)));
}
