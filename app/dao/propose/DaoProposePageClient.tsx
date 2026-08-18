"use client";

import { useAccount } from "wagmi";
import type { DaoProposerState } from "@/lib/clients/dao";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getButtonClassName } from "@/components/ui/Button";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { useDaoProposerState } from "@/lib/hooks/useDao";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import {
  DaoErrorPanel,
  DaoLoadingPanel,
  DaoRouteFrame,
  DaoWalletNotice,
  daoRouteControlClassName,
} from "../components/DaoRouteFrame";
import { daoCopy } from "../messages";

export type DaoProposeRouteState =
  | "disconnected"
  | "loading"
  | "ready"
  | "error";

export function DaoProposePageClient() {
  const { address, isConnected } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const effectiveAddress = address ?? (isE2E ? E2E_MOCK_ADDRESS : null);
  const hasConnectedAccount = (isConnected || isE2E) && effectiveAddress !== null;
  const proposerQuery = useDaoProposerState(effectiveAddress);
  const state: DaoProposeRouteState = !hasConnectedAccount
    ? "disconnected"
    : proposerQuery.isPending
      ? "loading"
      : proposerQuery.isError
        ? "error"
        : "ready";

  return (
    <DaoProposeView
      onRetry={() => {
        void proposerQuery.refetch();
      }}
      proposer={proposerQuery.data ?? null}
      state={state}
    />
  );
}

export function DaoProposeView({
  onRetry,
  proposer,
  state,
}: {
  onRetry: () => void;
  proposer: DaoProposerState | null;
  state: DaoProposeRouteState;
}) {
  return (
    <DaoRouteFrame current="propose">
      {state === "disconnected" ? (
        <DaoWalletNotice context="propose" />
      ) : null}

      {state === "loading" ? (
        <DaoLoadingPanel message={daoCopy.propose.loading} />
      ) : null}

      {state === "error" ? (
        <DaoErrorPanel
          title={daoCopy.propose.errorTitle}
          body={daoCopy.propose.errorBody}
          retryLabel={daoCopy.propose.retry}
          onRetry={onRetry}
        />
      ) : null}

      {state === "ready" && proposer ? (
        <ProposerSummary proposer={proposer} />
      ) : null}
    </DaoRouteFrame>
  );
}

function ProposerSummary({ proposer }: { proposer: DaoProposerState }) {
  const title = proposer.canPropose
    ? daoCopy.propose.eligibleTitle
    : daoCopy.propose.blockedTitle;
  const body = proposer.canPropose
    ? daoCopy.propose.eligibleBody
    : proposer.proposeBlockedReason ?? daoCopy.propose.blockedFallback;

  return (
    <Card className="space-y-5">
      <div className="space-y-3">
        <Badge variant={proposer.canPropose ? "success" : "warning"}>
          {proposer.canPropose
            ? daoCopy.propose.eligibleLabel
            : daoCopy.propose.unavailableLabel}
        </Badge>
        <h2 className="text-balance text-2xl font-bold">
          {daoCopy.propose.title}
        </h2>
        <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">
          {daoCopy.propose.description}
        </p>
      </div>

      <div className="space-y-2 border-t border-border pt-5">
        <h3 className="text-balance text-lg font-bold">{title}</h3>
        <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">
          {body}
        </p>
      </div>

      <a
        href={daoCopy.navigation.forumHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={daoCopy.navigation.forumAccessibleLabel}
        className={getButtonClassName({
          variant: "secondary",
          size: "sm",
          className: `${daoRouteControlClassName} gap-1.5`,
        })}
      >
        <span>{daoCopy.navigation.forum}</span>
        <IconLinkOut className="size-3.5" aria-hidden />
      </a>
    </Card>
  );
}
