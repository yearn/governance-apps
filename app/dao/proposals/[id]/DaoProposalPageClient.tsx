"use client";

import { useAccount } from "wagmi";
import type { DaoFeedV1, DaoProposal } from "@/lib/clients/dao";
import { Card } from "@/components/ui/Card";
import { getButtonClassName } from "@/components/ui/Button";
import Link from "next/link";
import { useDaoFeed, useDaoProposal } from "@/lib/hooks/useDao";
import {
  DaoErrorPanel,
  DaoLoadingPanel,
  DaoRouteFrame,
  DaoWalletNotice,
  daoRouteControlClassName,
} from "../../components/DaoRouteFrame";
import { daoCopy } from "../../messages";
import { MockControls } from "../../components/MockControls";
import { ProposalDetail } from "./ProposalDetail";

export type DaoProposalRouteState =
  | "loading"
  | "ready"
  | "not_found"
  | "error";

const PROPOSAL_EYEBROW_CLASS_NAME =
  "min-w-0 max-w-full break-words font-number text-xs font-bold tabular-nums text-text-secondary [overflow-wrap:anywhere]";

export function DaoProposalPageClient({ proposalId }: { proposalId: string }) {
  const { isConnected } = useAccount();
  const feedQuery = useDaoFeed();
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
    <>
      <DaoProposalView
        feed={feedQuery.data ?? null}
        isConnected={isConnected}
        now={feedQuery.data?.canonicalBlock.timestamp ?? 0}
        onRetry={() => {
          void proposalQuery.refetch();
        }}
        proposal={proposal}
        proposalId={proposalId}
        state={state}
      />
      <MockControls />
    </>
  );
}

export function DaoProposalView({
  feed,
  isConnected,
  now,
  onRetry,
  proposal,
  proposalId,
  state,
}: {
  feed: DaoFeedV1 | null;
  isConnected: boolean;
  now: number;
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
        <Card className="min-w-0 space-y-5 overflow-hidden">
          <div className="min-w-0 space-y-2">
            <p className={PROPOSAL_EYEBROW_CLASS_NAME}>
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
        <ProposalDetail feed={feed} now={now} proposal={proposal} />
      ) : null}
    </DaoRouteFrame>
  );
}
