"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useMemo, useState } from "react";
import type { TxStatus } from "@/lib/tx/types";
import type { YethAccountState, YethGlobalState } from "@/lib/clients/yeth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatAddress, formatTokenAmount } from "@/lib/format";
import { useProtocol } from "@/state/protocol";
import { nowSeconds } from "@/lib/mocks/time";
import {
  useYethAccountState,
  useYethClaimAndExit,
  useYethClaimAndStay,
  useYethGlobalState,
  useYethRedeemToEth,
} from "@/lib/hooks/useYeth";
import { yethCopy as copy } from "./messages";
import { MockControls } from "./components/MockControls";
import { RecoveryHero } from "./components/RecoveryHero";
import { ActionDeck } from "./components/ActionDeck";
import { StatsGrid } from "./components/StatsGrid";
import { TrustFooter } from "./components/TrustFooter";

const ONE = 10n ** 18n;

export function YethPageClient() {
  const { isConnected, address } = useAccount();
  const { yethUsesMockBackend } = useProtocol();
  const { openConnectModal } = useConnectModal();
  const { data: global } = useYethGlobalState();
  const { data: account, isLoading: isAccountLoading } = useYethAccountState();
  const claimExit = useYethClaimAndExit();
  const claimStay = useYethClaimAndStay();
  const redeem = useYethRedeemToEth();
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const now = global?.asOf ?? nowSeconds();

  const claimExitPending = isTxPending(claimExit.state.status);
  const claimStayPending = isTxPending(claimStay.state.status);
  const redeemPending = isTxPending(redeem.state.status);

  const handleClaimStay = () => {
    setIsRiskModalOpen(false);
    setRiskAccepted(false);
    void claimStay.write();
  };

  const claimWindowClosed = useMemo(() => {
    if (!global) return false;
    return now >= global.claimWindow.closesAt;
  }, [global, now]);

  const claimWindowCountdown = useMemo(() => {
    if (!global) return "--";
    return formatCountdown(global.claimWindow.closesAt, now);
  }, [global, now]);

  return (
    <>
      <div className="space-y-0">
        <RecoveryBanner
          global={global}
          claimWindowClosed={claimWindowClosed}
          claimWindowCountdown={claimWindowCountdown}
        />

        <main className="container mx-auto px-4 md:px-6 pt-8 pb-24 space-y-6">
          {!isConnected ? (
            <ConnectCard onConnect={() => openConnectModal?.()} />
          ) : isAccountLoading || !account || !global ? (
            <LoadingCard />
          ) : !account.eligible ? (
            <IneligibleCard
              address={address}
              global={global}
              claimWindowClosed={claimWindowClosed}
            />
          ) : account.claimStatus === "unclaimed" ? (
            <UnclaimedRecoveryState
              address={address}
              account={account}
              global={global}
              claimWindowClosed={claimWindowClosed}
              claimExitPending={claimExitPending}
              claimStayPending={claimStayPending}
              onClaimExit={() => claimExit.write()}
              onOpenRiskModal={() => setIsRiskModalOpen(true)}
            />
          ) : account.claimStatus === "staying" ? (
            <PostClaimStayingCard
              account={account}
              global={global}
              onRedeem={() => redeem.write()}
              redeemPending={redeemPending}
            />
          ) : (
            <PostClaimExitedCard account={account} />
          )}

          {global && <TrustFooter global={global} />}
        </main>

        <Modal
          isOpen={isRiskModalOpen}
          onClose={() => setIsRiskModalOpen(false)}
          title={copy.riskModal.title}
        >
          <div className="space-y-5">
            <p className="text-sm text-text-secondary leading-relaxed">
              {copy.riskModal.body}
            </p>
            <label className="flex items-start gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border"
                checked={riskAccepted}
                onChange={(event) => setRiskAccepted(event.target.checked)}
              />
              <span>{copy.riskModal.checkbox}</span>
            </label>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsRiskModalOpen(false)}
                disabled={claimStayPending}
              >
                {copy.riskModal.cancel}
              </Button>
              <Button
                variant="yeth"
                size="sm"
                onClick={handleClaimStay}
                isLoading={claimStayPending}
                disabled={!riskAccepted || claimStayPending}
              >
                {copy.riskModal.continue}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
      {yethUsesMockBackend && <MockControls />}
    </>
  );
}

function RecoveryBanner({
  global,
  claimWindowClosed,
  claimWindowCountdown,
}: {
  global: YethGlobalState | undefined;
  claimWindowClosed: boolean;
  claimWindowCountdown: string;
}) {
  return (
    <section className="sticky top-16 z-30 border-b border-border bg-surface-secondary">
      <div className="container mx-auto px-4 md:px-6 py-4 space-y-2">
        <p className="text-sm font-medium text-text-primary">
          {copy.page.retiredBanner}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          <a
            href={global?.approvedYipUrl ?? "https://gov.yearn.fi"}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Read the approved YIP
          </a>
          <span className="text-text-tertiary">&#183;</span>
          <span className="font-medium text-text-primary">
            {claimWindowClosed ? copy.page.closedStatus : copy.page.openStatus}
          </span>
          <span>{claimWindowCountdown}</span>
        </div>
      </div>
    </section>
  );
}

function ConnectCard({ onConnect }: { onConnect: () => void }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-bold">{copy.page.title}</h2>
      <p className="text-sm text-text-secondary">{copy.page.connectPrompt}</p>
      <Button size="sm" onClick={onConnect} className="w-fit">
        {copy.page.connectCta}
      </Button>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card className="space-y-3">
      <div className="h-6 w-44 animate-pulse rounded-md bg-surface-tertiary" />
      <div className="h-4 w-64 animate-pulse rounded-md bg-surface-tertiary" />
      <div className="h-4 w-56 animate-pulse rounded-md bg-surface-tertiary" />
    </Card>
  );
}

function IneligibleCard({
  address,
  global,
  claimWindowClosed,
}: {
  address: string | undefined;
  global: YethGlobalState;
  claimWindowClosed: boolean;
}) {
  return (
    <Card className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">{copy.page.sections.recovery}</h2>
        <p className="text-sm text-text-secondary">
          This wallet has no active yETH recovery entitlement.
        </p>
      </header>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <DataRow
          label={copy.fields.wallet}
          value={address ? formatAddress(address) : "--"}
        />
        <DataRow label={copy.fields.eligibility} value="Ineligible" />
        <DataRow
          label={copy.fields.claimStatus}
          value={claimWindowClosed ? copy.page.closedStatus : copy.page.openStatus}
        />
        <DataRow
          label={copy.fields.claimWindowEnds}
          value={formatUtcDateTime(global.claimWindow.closesAt)}
        />
      </div>

      <p className="text-sm text-text-secondary">
        If you expected an allocation, review the approved YIP and manual process in
        the Trust &amp; verify section below.
      </p>
    </Card>
  );
}

function UnclaimedRecoveryState({
  address,
  account,
  global,
  claimWindowClosed,
  claimExitPending,
  claimStayPending,
  onClaimExit,
  onOpenRiskModal,
}: {
  address: string | undefined;
  account: YethAccountState;
  global: YethGlobalState;
  claimWindowClosed: boolean;
  claimExitPending: boolean;
  claimStayPending: boolean;
  onClaimExit: () => void;
  onOpenRiskModal: () => void;
}) {
  const recoveredPct = formatRecoveryPercent(
    account.claimableNowEth,
    account.snapshotLossEth
  );

  return (
    <section className="space-y-6">
      {claimWindowClosed ? (
        <div className="flex flex-col items-center py-12 text-center space-y-3">
          <h2 className="text-3xl md:text-5xl font-bold text-text-primary">
            {copy.claimEnded.title}
          </h2>
          <p className="max-w-2xl text-sm text-text-secondary">{copy.claimEnded.body}</p>
          <a
            href={global.manualLateClaimUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm font-medium underline underline-offset-4"
          >
            {copy.claimEnded.cta}
          </a>
        </div>
      ) : (
        <RecoveryHero claimableEth={account.claimableNowEth} recoveredPct={recoveredPct} />
      )}

      {!claimWindowClosed ? (
        <ActionDeck
          onExit={onClaimExit}
          onStay={onOpenRiskModal}
          claimableEth={formatTokenAmount(account.claimableNowEth, 18, 4)}
          exitPending={claimExitPending}
          stayPending={claimStayPending}
          disabled={claimWindowClosed}
        />
      ) : null}

      <StatsGrid
        address={address}
        snapshotValue={account.snapshotLossEth}
        closesAt={global.claimWindow.closesAt}
        eligible={account.eligible}
      />
    </section>
  );
}

function PostClaimExitedCard({ account }: { account: YethAccountState }) {
  return (
    <section className="flex flex-col items-center py-12 text-center space-y-4">
      <h2 className="text-3xl md:text-5xl font-bold text-tokyo-600">
        {copy.postClaim.exitedTitle}
      </h2>
      <p className="font-number text-2xl md:text-3xl font-bold text-text-primary">
        {copy.postClaim.received} {formatEth(account.exitedEthReceived)}
      </p>
      <p className="text-sm text-text-secondary">{copy.postClaim.exitedNote}</p>
      {account.lastTxHash ? (
        <a
          href={txExplorerLink(account.lastTxHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm font-medium underline underline-offset-4"
        >
          View on block explorer
        </a>
      ) : null}
    </section>
  );
}

function PostClaimStayingCard({
  account,
  global,
  onRedeem,
  redeemPending,
}: {
  account: YethAccountState;
  global: YethGlobalState;
  onRedeem: () => void;
  redeemPending: boolean;
}) {
  const currentValueEth = (account.recoveryVaultShares * global.recoveryVault.pps) / ONE;
  const recoveredPct = formatRecoveryPercent(currentValueEth, account.snapshotLossEth);
  const cashOutAmount = formatTokenAmount(currentValueEth, 18, 4);

  return (
    <section className="max-w-xl mx-auto space-y-6 pt-8">
      <header className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-neutral-900">
          {copy.postClaim.stayingTitle}
        </h2>
        <p className="text-sm text-neutral-500">
          You are currently exposed to Vault A smart contract risk.
        </p>
      </header>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col items-center border-b border-neutral-100">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
            {copy.postClaim.valueLabel}
          </span>
          <span className="text-5xl font-number font-bold text-neutral-900 tracking-tight">
            {cashOutAmount} <span className="text-2xl text-neutral-400">ETH</span>
          </span>
        </div>

        <div className="bg-neutral-50/50 p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Original Snapshot</span>
            <span className="font-number text-neutral-700">
              {formatEth(account.snapshotLossEth)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Recovered vs. Original</span>
            <span className="font-number text-neutral-700">{recoveredPct}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Vault Shares</span>
            <span className="font-number text-neutral-700">
              {formatTokenAmount(account.recoveryVaultShares, 18, 2)}
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="yeth"
        size="lg"
        className="w-full h-16 text-lg shadow-md"
        onClick={onRedeem}
        isLoading={redeemPending}
      >
        {copy.actions.redeem(cashOutAmount)}
      </Button>
    </section>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <div className="mt-1 text-sm font-number font-bold text-text-primary">{value}</div>
    </div>
  );
}

function isTxPending(status: TxStatus) {
  return status === "signing" || status === "submitted" || status === "mining";
}

function formatEth(amount: bigint) {
  return `${formatTokenAmount(amount, 18, 4)} ETH`;
}

function formatRecoveryPercent(recovered: bigint, original: bigint) {
  if (original <= 0n) return "0.0%";
  const scaled = Number((recovered * 1000n) / original) / 10;
  return `${scaled.toFixed(1)}%`;
}

function formatCountdown(closesAt: number, now: number) {
  const remaining = Math.max(0, closesAt - now);
  if (remaining === 0) return "Closed";
  const days = Math.floor(remaining / 86_400);
  if (days > 0) {
    return `Ends in ${days} days`;
  }
  const hours = Math.max(1, Math.floor(remaining / 3_600));
  return `Ends in ${hours}h`;
}

function formatUtcDateTime(timestampSeconds: number) {
  const date = new Date(timestampSeconds * 1000);
  const formatted = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(date);
  return `${formatted} UTC`;
}

function txExplorerLink(hash: string) {
  return `https://etherscan.io/tx/${hash}`;
}
