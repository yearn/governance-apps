import { ContractLink } from "@/components/ui/ContractLink";
import { getLlyfiDisplaySymbol } from "@/lib/clients/veyfi/display";
import { type LlyfiTokenState } from "@/lib/clients/veyfi";
import { LIQUID_LOCKER_REDEMPTION_ADDRESS } from "@/lib/constants";

export function LlyfiInfoTab({ token }: { token: LlyfiTokenState }) {
  const displaySymbol = getLlyfiDisplaySymbol(token.symbol);

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-text-secondary">
        {displaySymbol} represents YFI deposited into the {token.name} liquid
        locker.
      </p>

      <ul className="space-y-3 rounded-lg border border-border bg-surface-secondary/30 p-4 text-sm text-text-secondary">
        <li className="flex items-center justify-between gap-4">
          <span>{displaySymbol} Token</span>
          <ContractLink address={token.address} />
        </li>
        <li className="flex items-center justify-between gap-4">
          <span>Depositor Contract</span>
          <ContractLink address={token.depositorAddress} />
        </li>
        <li className="flex items-center justify-between gap-4">
          <span>Global Redemption Facility</span>
          <ContractLink address={LIQUID_LOCKER_REDEMPTION_ADDRESS} />
        </li>
      </ul>
    </div>
  );
}
