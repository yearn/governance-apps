"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import type { DaoProposal } from "@/lib/clients/dao";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getButtonClassName } from "@/components/ui/Button";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { useDaoProposal } from "@/lib/hooks/useDao";
import {
  DaoErrorPanel,
  DaoLoadingPanel,
  DaoRouteFrame,
  DaoWalletNotice,
  daoRouteControlClassName,
} from "../../components/DaoRouteFrame";
import { daoCopy } from "../../messages";

export type DaoProposalRouteState =
  | "loading"
  | "ready"
  | "not_found"
  | "error";

export function DaoProposalPageClient({ proposalId }: { proposalId: string }) {
  const { isConnected } = useAccount();
  const proposalQuery = useDaoProposal(proposalId);
  const proposal =
    proposalQuery.data?.state === "found"
      ? proposalQuery.data.proposal
      : null;
  const state: DaoProposalRouteState = proposalQuery.isPending
    ? "loading"
    : proposalQuery.isError
      ? "error"
      : proposal
        ? "ready"
        : "not_found";

  return (
    <DaoProposalView
      isConnected={isConnected}
      onRetry={() => {
        void proposalQuery.refetch();
      }}
      proposal={proposal}
      proposalId={proposalId}
      state={state}
    />
  );
}

export function DaoProposalView({
  isConnected,
  onRetry,
  proposal,
  proposalId,
  state,
}: {
  isConnected: boolean;
  onRetry: () => void;
  proposal: DaoProposal | null;
  proposalId: string;
  state: DaoProposalRouteState;
}) {
  return (
    <DaoRouteFrame current="proposals">
      {!isConnected ? <DaoWalletNotice /> : null}

      {state === "loading" ? (
        <DaoLoadingPanel message={daoCopy.detail.loading} />
      ) : null}

      {state === "error" ? (
        <DaoErrorPanel
          title={daoCopy.detail.errorTitle}
          body={daoCopy.detail.errorBody}
          retryLabel={daoCopy.detail.retry}
          onRetry={onRetry}
        />
      ) : null}

      {state === "not_found" ? (
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="font-number text-xs font-bold tabular-nums text-text-tertiary">
              {daoCopy.detail.eyebrow(proposalId)}
            </p>
            <h2 className="text-balance text-xl font-bold">
              {daoCopy.detail.notFoundTitle}
            </h2>
            <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">
              {daoCopy.detail.notFoundBody}
            </p>
          </div>
          <Link
            href="/dao"
            className={getButtonClassName({
              variant: "secondary",
              size: "sm",
              className: daoRouteControlClassName,
            })}
          >
            {daoCopy.detail.returnToBoard}
          </Link>
        </Card>
      ) : null}

      {state === "ready" && proposal ? (
        <ProposalSummary proposal={proposal} />
      ) : null}
    </DaoRouteFrame>
  );
}

function ProposalSummary({ proposal }: { proposal: DaoProposal }) {
  const title =
    proposal.content.value?.title ??
    daoCopy.detail.eyebrow(proposal.ref.proposalId.toString());
  const summary =
    proposal.content.value?.summary ?? daoCopy.detail.contentUnavailable;

  return (
    <Card className="min-w-0 space-y-5 overflow-hidden">
      <div className="min-w-0 space-y-3">
        <p className="font-number text-xs font-bold tabular-nums text-text-tertiary">
          {daoCopy.detail.eyebrow(proposal.ref.proposalId.toString())}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="brand">
            {daoCopy.status[proposal.displayStatus]}
          </Badge>
          <Badge>{daoCopy.proposalType[proposal.type]}</Badge>
        </div>
        <h2 className="text-balance text-2xl font-bold md:text-3xl">
          {title}
        </h2>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">
          {summary}
        </p>
      </div>

      <dl className="grid min-w-0 gap-4 border-t border-border pt-5 sm:grid-cols-3">
        <ProposalFact
          label={daoCopy.labels.proposalId}
          value={proposal.ref.proposalId.toString()}
        />
        <ProposalFact
          label={daoCopy.labels.status}
          value={daoCopy.status[proposal.displayStatus]}
        />
        <ProposalFact
          label={daoCopy.labels.type}
          value={daoCopy.proposalType[proposal.type]}
        />
      </dl>

      {proposal.discussion.state === "verified" &&
      proposal.discussion.url ? (
        <a
          href={proposal.discussion.url}
          target="_blank"
          rel="noopener noreferrer"
          className={getButtonClassName({
            variant: "secondary",
            size: "sm",
            className: `${daoRouteControlClassName} gap-1.5`,
          })}
        >
          <span>{daoCopy.navigation.forum}</span>
          <IconLinkOut className="size-3.5" aria-hidden />
        </a>
      ) : (
        <p className="text-pretty text-sm text-text-secondary">
          {daoCopy.detail.forumUnavailable}
        </p>
      )}
    </Card>
  );
}

function ProposalFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-bold text-text-tertiary">{label}</dt>
      <dd className="break-words font-number text-sm tabular-nums [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
