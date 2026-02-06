"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { TxStatus } from "@/lib/tx/types";
import type { YethAccountState, YethGlobalState } from "@/lib/clients/yeth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatAddress, formatTokenAmount } from "@/lib/format";
import { useProtocol } from "@/state/protocol";
import {
  useYethAccountState,
  useYethClaimAndExit,
  useYethClaimAndStay,
  useYethGlobalState,
  useYethRedeemToEth,
} from "@/lib/hooks/useYeth";
import { yethCopy as copy } from "./messages";
import { MockControls } from "./components/MockControls";

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
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(id);
  }, []);

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
            <PreClaimCard
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

          {global && <TrustVerifyDrawer global={global} />}
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
    <section className="border-b border-border bg-surface-secondary">
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
        <DataRow label={copy.fields.eligibility} value="Not eligible" />
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
        the Trust & verify section below.
      </p>
    </Card>
  );
}

function PreClaimCard({
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
    <Card className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">{copy.page.sections.recovery}</h2>
        <p className="text-sm text-text-secondary">
          {copy.fields.claimStatus}: Eligible and unclaimed
        </p>
      </header>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <DataRow
          label={copy.fields.wallet}
          value={address ? formatAddress(address) : "--"}
        />
        <DataRow label={copy.fields.eligibility} value="Eligible" />
        <DataRow
          label={copy.fields.snapshotLoss}
          value={formatEth(account.snapshotLossEth)}
        />
        <DataRow
          label={copy.fields.claimableNow}
          value={formatEth(account.claimableNowEth)}
        />
        <DataRow
          label={copy.fields.recoveredSoFar}
          value={`${recoveredPct} of original loss`}
        />
        <DataRow
          label={copy.fields.claimWindowEnds}
          value={formatUtcDateTime(global.claimWindow.closesAt)}
        />
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-text-tertiary">
          {copy.page.sections.actions}
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <ActionPathCard
            title={copy.actions.exit.title}
            subtitle={copy.actions.exit.subtitle}
            bullets={copy.actions.exit.body}
            cta={copy.actions.exit.cta}
            disabled={claimWindowClosed || claimExitPending || claimStayPending}
            loading={claimExitPending}
            onClick={onClaimExit}
            emphasize
          />
          <ActionPathCard
            title={copy.actions.stay.title}
            bullets={copy.actions.stay.body}
            cta={copy.actions.stay.cta}
            disabled={claimWindowClosed || claimExitPending || claimStayPending}
            loading={claimStayPending}
            onClick={onOpenRiskModal}
          />
        </div>
      </section>

      {claimWindowClosed && (
        <Card className="p-5 border-amber-300 bg-amber-50">
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
              {copy.claimEnded.title}
            </h3>
            <p className="text-sm text-amber-900/90">{copy.claimEnded.body}</p>
            <a
              href={global.manualLateClaimUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium underline underline-offset-4"
            >
              {copy.claimEnded.cta}
            </a>
          </div>
        </Card>
      )}
    </Card>
  );
}

function PostClaimExitedCard({ account }: { account: YethAccountState }) {
  const recoveredPct = formatRecoveryPercent(
    account.exitedEthReceived,
    account.snapshotLossEth
  );

  return (
    <Card className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">{copy.page.sections.recovery}</h2>
        <p className="text-sm text-text-secondary">{copy.postClaim.exitedTitle}</p>
      </header>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <DataRow
          label={copy.postClaim.received}
          value={formatEth(account.exitedEthReceived)}
        />
        <DataRow
          label={copy.postClaim.recoveredTotal}
          value={`${recoveredPct} of original loss`}
        />
        {account.lastTxHash && (
          <DataRow
            label={copy.postClaim.transaction}
            value={
              <a
                href={txExplorerLink(account.lastTxHash)}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Explorer
              </a>
            }
          />
        )}
      </div>

      <p className="text-sm text-text-secondary">{copy.postClaim.exitedNote}</p>
    </Card>
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
  const pps = global.recoveryVault.pps;
  const currentValueEth = (account.recoveryVaultShares * pps) / ONE;
  const recoveredPct = formatRecoveryPercent(currentValueEth, account.snapshotLossEth);

  return (
    <Card className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">{copy.page.sections.recovery}</h2>
        <p className="text-sm text-text-secondary">{copy.postClaim.stayingTitle}</p>
      </header>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <DataRow
          label={copy.postClaim.shares}
          value={formatTokenAmount(account.recoveryVaultShares, 18, 4)}
        />
        <DataRow label={copy.postClaim.pps} value={formatPps(pps)} />
        <DataRow label={copy.postClaim.value} value={formatEth(currentValueEth)} />
        <DataRow
          label={copy.fields.recoveredSoFar}
          value={`${recoveredPct} of original loss`}
        />
      </div>

      <Button className="w-fit" onClick={onRedeem} isLoading={redeemPending}>
        {copy.actions.redeem}
      </Button>
    </Card>
  );
}

function ActionPathCard({
  title,
  subtitle,
  bullets,
  cta,
  disabled,
  loading,
  onClick,
  emphasize = false,
}: {
  title: string;
  subtitle?: string;
  bullets: readonly string[];
  cta: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-box border p-5 space-y-4 ${
        emphasize
          ? "border-text-primary bg-surface-secondary"
          : "border-border bg-surface"
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-bold text-text-primary">{title}</h4>
          {subtitle ? (
            <span className="rounded-md bg-text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-surface">
              {subtitle}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="space-y-1 text-sm text-text-secondary list-disc pl-4">
        {bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <Button
        variant={emphasize ? "primary" : "secondary"}
        className="w-full"
        onClick={onClick}
        disabled={disabled}
        isLoading={loading}
      >
        {cta}
      </Button>
    </div>
  );
}

function TrustVerifyDrawer({ global }: { global: YethGlobalState }) {
  return (
    <details className="rounded-box border border-border bg-surface p-5 group">
      <summary className="cursor-pointer list-none text-sm font-bold uppercase tracking-wide text-text-tertiary flex items-center justify-between">
        <span>{copy.page.sections.trust}</span>
        <span className="text-xs text-text-secondary transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-5 space-y-6 text-sm">
        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Contracts</h3>
          <FlatList
            items={[
              <>
                Claim Contract: {formatAddress(global.contracts.claimContract)}{" "}
                <a
                  href={addressExplorerLink(global.contracts.claimContract)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  Explorer
                </a>
              </>,
              <>
                Recovery Vault (A): {formatAddress(global.contracts.recoveryVault)}{" "}
                <a
                  href={addressExplorerLink(global.contracts.recoveryVault)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  Explorer
                </a>
              </>,
              <>
                Yield Vault (B): {formatAddress(global.contracts.yieldVault)}{" "}
                <a
                  href={addressExplorerLink(global.contracts.yieldVault)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  Explorer
                </a>
              </>,
            ]}
          />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Recovery Vault (A)</h3>
          <FlatList
            items={[
              "Holds no strategies",
              "Receives yield through fees and donations",
              `PPS: ${formatPps(global.recoveryVault.pps)}`,
              `Total assets: ${formatEth(global.recoveryVault.totalAssetsEth)}`,
            ]}
          />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Yield Vault (B)</h3>
          <FlatList
            items={[
              `TVL: ${formatEth(global.yieldVault.tvlEth)}`,
              `Performance fee: ${Math.floor(global.yieldVault.performanceFeeBps / 100)}%`,
              `Fee recipient: ${formatAddress(global.yieldVault.feeRecipient)}`,
            ]}
          />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Yield sources</h3>
          <FlatList items={global.yieldSources} />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Mechanism checks</h3>
          <FlatList
            items={[
              `Treasury holds ${formatTokenAmount(global.treasuryRecoveryVaultShares, 18, 4)} Recovery Vault shares`,
              `Treasury receives ${(global.treasuryYieldShareBps / 100).toFixed(2)}% of yield`,
            ]}
          />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Risks</h3>
          <FlatList items={global.risks} />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Late claim process</h3>
          <p className="text-text-secondary">
            Late claims settle manually and do not dilute Recovery Vault share holders.
          </p>
          <Link
            href={global.manualLateClaimUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex underline underline-offset-4"
          >
            Open manual settlement instructions
          </Link>
        </section>
      </div>
    </details>
  );
}

function FlatList({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="space-y-1 text-text-secondary list-disc pl-4">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <div className="mt-1 text-sm font-number font-bold text-text-primary">
        {value}
      </div>
    </div>
  );
}

function isTxPending(status: TxStatus) {
  return status === "signing" || status === "submitted" || status === "mining";
}

function formatEth(amount: bigint) {
  return `${formatTokenAmount(amount, 18, 4)} ETH`;
}

function formatPps(pps: bigint) {
  return `${formatTokenAmount(pps, 18, 4)} ETH/share`;
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
  const hours = Math.floor((remaining % 86_400) / 3_600);
  return `Ends in ${days}d ${hours}h`;
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

function addressExplorerLink(address: string) {
  return `https://etherscan.io/address/${address}`;
}

function txExplorerLink(hash: string) {
  return `https://etherscan.io/tx/${hash}`;
}
