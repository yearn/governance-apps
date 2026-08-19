"use client";

import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import {
  serializeDaoProposalRef,
  type DaoProposalReadEnvelope,
} from "@/lib/clients/dao";
import { Card } from "@/components/ui/Card";
import { getButtonClassName } from "@/components/ui/Button";
import Link from "next/link";
import { useDaoProposal } from "@/lib/hooks/useDao";
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
import { DaoProposalActionPanel } from "./DaoProposalActionPanel";

export type DaoProposalRouteState =
  | "loading"
  | "ready"
  | "not_found"
  | "error";

const PROPOSAL_EYEBROW_CLASS_NAME =
  "min-w-0 max-w-full break-words font-number text-xs font-bold tabular-nums text-text-secondary [overflow-wrap:anywhere]";

export function DaoProposalPageClient({ proposalId }: { proposalId: string }) {
  const { isConnected } = useAccount();
  const proposalQuery = useDaoProposal(proposalId);
  const envelope = proposalQuery.envelope;
  const state: DaoProposalRouteState = proposalQuery.isPending
    ? "loading"
    : proposalQuery.isError
      ? "error"
      : envelope
        ? "ready"
        : "not_found";

  return (
    <>
      <DaoProposalView
        actionPanel={
          envelope ? (
            <DaoProposalActionPanel
              key={serializeDaoProposalRef(envelope.proposal.ref)}
              proposal={envelope.proposal}
            />
          ) : null
        }
        envelope={envelope}
        isConnected={isConnected}
        onRetry={() => {
          void proposalQuery.refetch();
        }}
        proposalId={proposalId}
        state={state}
      />
      <MockControls />
    </>
  );
}

export function DaoProposalView({
  actionPanel = null,
  envelope,
  isConnected,
  onRetry,
  proposalId,
  state,
}: {
  actionPanel?: ReactNode;
  envelope: DaoProposalReadEnvelope | null;
  isConnected: boolean;
  onRetry: () => void;
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

      {state === "ready" && envelope ? (
        <ProposalDetail
          actionPanel={actionPanel}
          envelope={envelope}
        />
      ) : null}
    </DaoRouteFrame>
  );
}
