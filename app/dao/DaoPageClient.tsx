"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { getButtonClassName } from "@/components/ui/Button";
import { useDaoFeed } from "@/lib/hooks/useDao";
import {
  DaoErrorPanel,
  DaoLoadingPanel,
  DaoRouteFrame,
  DaoWalletNotice,
  daoRouteControlClassName,
} from "./components/DaoRouteFrame";
import { daoCopy } from "./messages";
import { MockControls } from "./components/MockControls";
import { ProposalBoard } from "./components/ProposalBoard";
import type { DaoProposal } from "@/lib/clients/dao";

export type DaoBoardState = "loading" | "ready" | "empty" | "error";

export function DaoPageClient() {
  const { isConnected } = useAccount();
  const feedQuery = useDaoFeed();
  const proposalCount = feedQuery.data?.proposals.length ?? 0;
  const state: DaoBoardState = feedQuery.isPending
    ? "loading"
    : feedQuery.isError
      ? "error"
      : proposalCount === 0
        ? "empty"
        : "ready";

  return (
    <>
      <DaoBoardView
        isConnected={isConnected}
        onRetry={() => {
          void feedQuery.refetch();
        }}
        now={feedQuery.data?.canonicalBlock.timestamp ?? 0}
        proposals={feedQuery.data?.proposals ?? []}
        state={state}
      />
      <MockControls />
    </>
  );
}

export function DaoBoardView({
  isConnected,
  now,
  onRetry,
  proposals,
  state,
}: {
  isConnected: boolean;
  now: number;
  onRetry: () => void;
  proposals: DaoProposal[];
  state: DaoBoardState;
}) {
  return (
    <DaoRouteFrame current="proposals">
      {!isConnected ? <DaoWalletNotice /> : null}

      {state === "loading" ? (
        <DaoLoadingPanel message={daoCopy.board.loading} />
      ) : null}

      {state === "error" ? (
        <DaoErrorPanel
          title={daoCopy.board.errorTitle}
          body={daoCopy.board.errorBody}
          retryLabel={daoCopy.board.retry}
          onRetry={onRetry}
        />
      ) : null}

      {state === "empty" ? (
        <Card className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-balance text-xl font-bold">
              {daoCopy.board.emptyTitle}
            </h2>
            <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">
              {daoCopy.board.emptyBody}
            </p>
          </div>
          <Link
            href="/dao/propose"
            className={getButtonClassName({
              size: "sm",
              className: daoRouteControlClassName,
            })}
          >
            {daoCopy.navigation.createProposal}
          </Link>
        </Card>
      ) : null}

      {state === "ready" ? (
        <ProposalBoard now={now} proposals={proposals} />
      ) : null}
    </DaoRouteFrame>
  );
}
