"use client";

import { Card } from "@/components/ui/Card";
import { LogoStyfi } from "@/components/icons/LogoStyfi";
import { LogoStyfix } from "@/components/icons/LogoStyfix";
import { cn } from "@/lib/cn";
import { formatTokenAmount } from "@/lib/format";
import { ModeComparison } from "./ModeComparison";
import type { StyfiAsset } from "./types";

type AccountBalances = {
  styfi: {
    active: bigint;
    unstaking: bigint;
    withdrawable: bigint;
    total: bigint;
  };
  styfix: {
    active: bigint;
    unstaking: bigint;
    withdrawable: bigint;
    total: bigint;
  };
};

type AccountSummaryProps = {
  isNewUser: boolean;
  selectedAsset?: StyfiAsset;
  onSelectAsset: (asset: StyfiAsset) => void;
  balances?: AccountBalances | null;
};

export function AccountSummary({
  isNewUser,
  selectedAsset,
  onSelectAsset,
  balances,
}: AccountSummaryProps) {
  if (isNewUser) {
    return (
      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              Choose your mode
            </p>
            <h2 className="text-xl font-bold text-neutral-900">
              Compare stYFI and stYFIx
            </h2>
          </div>
          <ModeComparison
            selectedAsset={selectedAsset}
            onSelectAsset={onSelectAsset}
          />
        </div>
      </Card>
    );
  }

  const rows = [
    balances?.styfi && balances.styfi.total > 0n
      ? {
          asset: "stYFI" as const,
          ...balances.styfi,
        }
      : null,
    balances?.styfix && balances.styfix.total > 0n
      ? {
          asset: "stYFIx" as const,
          ...balances.styfix,
        }
      : null,
  ].filter(
    (row): row is {
      asset: StyfiAsset;
      active: bigint;
      unstaking: bigint;
      withdrawable: bigint;
      total: bigint;
    } => Boolean(row)
  );

  return (
    <Card>
      <div className="space-y-4">
        <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          Account Summary
        </p>

        <div className="space-y-3">
          {rows.length > 0 ? (
            rows.map((row) => (
              <PositionRow
                key={row.asset}
                asset={row.asset}
                active={row.active}
                unstaking={row.unstaking}
                withdrawable={row.withdrawable}
              />
            ))
          ) : (
            <p className="text-sm text-neutral-600">
              Connect your wallet to view positions.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function PositionRow({
  asset,
  active,
  unstaking,
  withdrawable,
}: {
  asset: StyfiAsset;
  active: bigint;
  unstaking: bigint;
  withdrawable: bigint;
}) {
  const Logo = asset === "stYFI" ? LogoStyfi : LogoStyfix;
  const accentClass =
    asset === "stYFI" ? "text-sunset-600" : "text-yearn-blue";

  return (
    <div className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white/50 p-4">
      <Logo className="h-10 w-10 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-bold text-neutral-900">{asset}</p>
        <p className="text-sm font-semibold text-neutral-900">
          {formatTokenAmount(active)} Active
        </p>
        <p className="text-sm text-neutral-500">
          {formatTokenAmount(unstaking)} Unstaking
        </p>
        <p
          className={cn(
            "text-sm font-semibold",
            withdrawable > 0n ? accentClass : "text-neutral-400"
          )}
        >
          {formatTokenAmount(withdrawable)} Withdrawable
        </p>
      </div>
    </div>
  );
}
