import type { ReactNode } from "react";
import { formatAddress, formatTokenAmount } from "@/lib/format";
import { yethCopy as copy } from "../messages";

export function StatsGrid({
  address,
  snapshotValue,
  closesAt,
  claimedAt,
  claimTxHash,
  recoveredValue,
}: {
  address: string | undefined;
  snapshotValue: bigint;
  closesAt: number;
  claimedAt?: number;
  claimTxHash?: string;
  recoveredValue?: bigint;
}) {
  const showRecoveredValue = !!claimedAt && !!recoveredValue && recoveredValue > 0n;
  const valueLabel = showRecoveredValue ? copy.fields.recoveredValue : copy.fields.snapshotValue;
  const valueAmount = showRecoveredValue ? recoveredValue : snapshotValue;
  const claimInfoLabel = claimedAt ? copy.fields.claimedAt : copy.fields.claimWindowEnds;
  const claimInfoValue = formatUtcDateTime(claimedAt ?? closesAt);
  const claimTxUrl = claimTxHash ? `https://etherscan.io/tx/${claimTxHash}` : undefined;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
      <StatItem
        label={copy.fields.wallet}
        value={address ? formatAddress(address) : "--"}
      />
      <StatItem
        label={valueLabel}
        value={`${formatTokenAmount(valueAmount, 18, 4)} ETH`}
      />
      <StatItem
        label={claimInfoLabel}
        value={claimInfoValue}
        href={claimTxUrl}
        hrefLabel={copy.fields.claimTx}
      />
    </section>
  );
}

function StatItem({
  label,
  value,
  href,
  hrefLabel,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <article className="text-center rounded-xl bg-surface-secondary/70 p-4 space-y-2">
      <p className="text-xs text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="font-number font-bold text-neutral-900 break-words">{value}</p>
      {href && hrefLabel ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs font-medium underline underline-offset-4 text-text-secondary hover:text-text-primary"
        >
          {hrefLabel}
        </a>
      ) : null}
    </article>
  );
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
