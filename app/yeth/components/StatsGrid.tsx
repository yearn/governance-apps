import { formatAddress, formatTokenAmount } from "@/lib/format";
import { yethCopy as copy } from "../messages";

export function StatsGrid({
  address,
  snapshotValue,
  closesAt,
  eligible,
}: {
  address: string | undefined;
  snapshotValue: bigint;
  closesAt: number;
  eligible: boolean;
}) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
      <StatItem
        label={copy.fields.wallet}
        value={address ? formatAddress(address) : "--"}
      />
      <StatItem
        label={copy.fields.snapshotValue}
        value={`${formatTokenAmount(snapshotValue, 18, 4)} ETH`}
      />
      <StatItem
        label={copy.fields.claimWindowEnds}
        value={formatUtcDateTime(closesAt)}
      />
      <StatItem label={copy.fields.eligibility} value={eligible ? "Eligible" : "Ineligible"} />
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="text-center rounded-xl bg-surface-secondary/70 p-4 space-y-2">
      <p className="text-xs text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="font-number font-bold text-neutral-900 break-words">{value}</p>
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
