import { formatTokenAmount } from "@/lib/format";
import { yethCopy as copy } from "../messages";

export function RecoveryHero({
  claimableEth,
  recoveredPct,
}: {
  claimableEth: bigint;
  recoveredPct: string;
}) {
  return (
    <section className="flex flex-col items-center py-12 text-center space-y-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-tertiary">
        {copy.fields.claimableNow}
      </p>
      <p className="font-number text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-tokyo-600">
        {formatTokenAmount(claimableEth, 18, 4)} ETH
      </p>
      <span className="inline-flex items-center gap-2 rounded-full bg-tokyo-100/50 px-4 py-1 text-sm font-bold text-tokyo-900">
        {copy.fields.recoveredSoFar}: {recoveredPct}
      </span>
    </section>
  );
}
