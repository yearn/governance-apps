"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { UtcTime } from "@/components/ui/UtcTime";
import { useDaoFeed, useDaoMockRuntime } from "@/lib/hooks/useDao";
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
  const runtime = useDaoMockRuntime();
  const hasConnectedAccount =
    process.env.NEXT_PUBLIC_E2E === "true" && runtime
      ? runtime.account.connected
      : isConnected;
  const feedQuery = useDaoFeed();
  const proposalCount = feedQuery.data?.proposals.length ?? 0;
  const isStale = feedQuery.isError && feedQuery.data !== undefined;
  const state: DaoBoardState =
    feedQuery.isPending && feedQuery.data === undefined
    ? "loading"
    : feedQuery.isError && feedQuery.data === undefined
      ? "error"
      : proposalCount === 0
        ? "empty"
        : "ready";

  return (
    <>
      <DaoBoardView
        isConnected={hasConnectedAccount}
        isStale={isStale}
        lastGoodSnapshotTimestamp={
          isStale ? (feedQuery.data?.canonicalBlock.timestamp ?? null) : null
        }
        onRetry={() => {
          void feedQuery.refetch();
        }}
        now={runtime?.now ?? feedQuery.data?.canonicalBlock.timestamp ?? 0}
        proposals={feedQuery.data?.proposals ?? []}
        state={state}
      />
      <MockControls />
    </>
  );
}

export function DaoBoardView({
  isConnected,
  isStale = false,
  lastGoodSnapshotTimestamp = null,
  now,
  onRetry,
  proposals,
  state,
}: {
  isConnected: boolean;
  isStale?: boolean;
  lastGoodSnapshotTimestamp?: number | null;
  now: number;
  onRetry: () => void;
  proposals: DaoProposal[];
  state: DaoBoardState;
}) {
  return (
    <DaoRouteFrame current="proposals">
      {!isConnected ? <DaoWalletNotice /> : null}

      {isStale && lastGoodSnapshotTimestamp !== null ? (
        <StaleFeedNotice
          onRetry={onRetry}
          snapshotTimestamp={lastGoodSnapshotTimestamp}
        />
      ) : null}

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

function StaleFeedNotice({
  onRetry,
  snapshotTimestamp,
}: {
  onRetry: () => void;
  snapshotTimestamp: number;
}) {
  return (
    <Card role="alert" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-balance text-xl font-bold">
          {daoCopy.board.staleTitle}
        </h2>
        <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">
          {daoCopy.board.staleBody}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="font-bold">{daoCopy.board.lastGoodSnapshot}</span>
          <UtcTime
            timestamp={snapshotTimestamp}
            className="font-number tabular-nums text-text-secondary"
          />
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={daoRouteControlClassName}
        onClick={onRetry}
      >
        {daoCopy.board.retry}
      </Button>
    </Card>
  );
}
