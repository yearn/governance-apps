"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { LogoStyfi } from "@/components/icons/LogoStyfi";
import { LogoStyfix } from "@/components/icons/LogoStyfix";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { IconPlaceholderToken } from "@/components/icons/IconPlaceholderToken";
import { cn } from "@/lib/cn";
import { formatTokenAmount } from "@/lib/format";
import { resolveGovernanceAppHref } from "@/lib/governance-links";
import { ModeComparison } from "./ModeComparison";
import type { StyfiAsset } from "./types";
import type { ExternalPosition } from "../external-positions";

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
  selectedAsset?: StyfiAsset;
  onSelectAsset: (asset: StyfiAsset) => void;
  balances?: AccountBalances | null;
  externalPositions: ExternalPosition[];
  hostname?: string | null;
  isLoading: boolean;
  isConnected: boolean;
  isWrongNetwork: boolean;
  onConnect?: () => void;
  connectLabel?: string;
  connectBody?: string;
  wrongNetworkBody?: string;
};

export function AccountSummary({
  selectedAsset,
  onSelectAsset,
  balances,
  externalPositions,
  hostname,
  isLoading,
  isConnected,
  isWrongNetwork,
  onConnect,
  connectLabel,
  connectBody,
  wrongNetworkBody,
}: AccountSummaryProps) {
  if (isLoading && isConnected && !isWrongNetwork) {
    return (
      <Card>
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Account Summary
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface/50 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const rows = [
    balances?.styfi &&
    (balances.styfi.total > 0n || balances.styfi.withdrawable > 0n)
      ? {
          asset: "stYFI" as const,
          ...balances.styfi,
        }
      : null,
    balances?.styfix &&
    (balances.styfix.total > 0n || balances.styfix.withdrawable > 0n)
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
  const hasInternalPositions = rows.length > 0;
  const hasExternalPositions = externalPositions.length > 0;
  const veyfiBaseHref = resolveGovernanceAppHref("veyfi", hostname);

  return (
    <Card>
      <div className="space-y-4">
        <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          Account Summary
        </p>

        <div className="space-y-3">
          {!isConnected ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/50 p-4">
              <p className="text-sm text-neutral-600">
                {connectBody ?? "Connect your wallet to view positions."}
              </p>
              {onConnect && (
                <Button size="sm" variant="primary" onClick={onConnect}>
                  {connectLabel ?? "Connect wallet"}
                </Button>
              )}
            </div>
          ) : isWrongNetwork ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                {wrongNetworkBody ??
                  "Wrong network. Switch your wallet to Ethereum Mainnet to manage positions."}
              </p>
            </div>
          ) : hasInternalPositions ? (
            <>
              <SummarySectionTitle title="Staked YFI" />
              {rows.map((row) => (
                <PositionRow
                  key={row.asset}
                  asset={row.asset}
                  active={row.active}
                  unstaking={row.unstaking}
                  withdrawable={row.withdrawable}
                  onClick={() => onSelectAsset(row.asset)}
                />
              ))}
              {hasExternalPositions ? (
                <>
                  <SummarySectionTitle title="Other Governance Positions" />
                  {externalPositions.map((position) => (
                    <ExternalPositionRow
                      key={position.id}
                      position={position}
                      href={resolveVeyfiHref(position.href, veyfiBaseHref)}
                    />
                  ))}
                </>
              ) : null}
            </>
          ) : hasExternalPositions ? (
            <>
              <SummarySectionTitle title="Your Governance Positions" />
              {externalPositions.map((position) => (
                <ExternalPositionRow
                  key={position.id}
                  position={position}
                  href={resolveVeyfiHref(position.href, veyfiBaseHref)}
                />
              ))}
              <SummarySectionTitle title="Choose How to Stake" />
              <ModeComparison
                selectedAsset={selectedAsset}
                onSelectAsset={onSelectAsset}
              />
            </>
          ) : (
            <>
              <SummarySectionTitle title="Compare stYFI and stYFIx" />
              <ModeComparison
                selectedAsset={selectedAsset}
                onSelectAsset={onSelectAsset}
              />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function SummarySectionTitle({ title }: { title: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
      {title}
    </p>
  );
}

function resolveVeyfiHref(href: string, veyfiBaseHref: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (!veyfiBaseHref.startsWith("http")) return href;
  return new URL(href, veyfiBaseHref).toString();
}

function PositionRow({
  asset,
  active,
  unstaking,
  withdrawable,
  onClick,
}: {
  asset: StyfiAsset;
  active: bigint;
  unstaking: bigint;
  withdrawable: bigint;
  onClick: () => void;
}) {
  const Logo = asset === "stYFI" ? LogoStyfi : LogoStyfix;
  const activeClass = active > 0n ? "text-neutral-900" : "text-neutral-300";
  const unstakingClass =
    unstaking > 0n ? "text-neutral-900" : "text-neutral-300";
  const withdrawableClass =
    withdrawable > 0n
      ? "text-sunset-600 bg-sunset-50/50 -mx-2 px-2 py-1 rounded-md"
      : "text-neutral-300";

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="styfi-position-row"
      className="grid w-full grid-cols-2 gap-x-4 gap-y-6 items-center rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 md:grid-cols-[1.5fr_1fr_1fr_1fr]"
    >
      <div className="col-span-2 md:col-span-1 flex items-center gap-3">
        <Logo className="h-8 w-8 shrink-0" aria-hidden />
        <p className="text-base font-bold text-neutral-900">{asset}</p>
      </div>

      <div className="flex flex-col items-end">
        <span className={cn("font-number font-bold text-lg", activeClass)}>
          {formatTokenAmount(active)}
        </span>
        <span className="mt-0.5 text-[10px] font-sans font-bold uppercase tracking-wide text-neutral-500">
          Active
        </span>
      </div>

      <div className="flex flex-col items-end">
        <span className={cn("font-number font-bold text-lg", unstakingClass)}>
          {formatTokenAmount(unstaking)}
        </span>
        <span className="mt-0.5 text-[10px] font-sans font-bold uppercase tracking-wide text-neutral-500">
          Unstaking
        </span>
      </div>

      <div className="flex flex-col items-end">
        <span
          className={cn("font-number font-bold text-lg transition-colors", withdrawableClass)}
        >
          {formatTokenAmount(withdrawable)}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-sans font-bold uppercase tracking-wide",
            withdrawable > 0n ? "text-sunset-600" : "text-neutral-500"
          )}
        >
          Withdrawable
        </span>
      </div>
    </button>
  );
}

function ExternalPositionRow({
  position,
  href,
}: {
  position: ExternalPosition;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="external-position-row"
      className="grid w-full grid-cols-2 gap-x-4 gap-y-5 items-center rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-secondary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 md:grid-cols-[1.5fr_1fr_auto]"
    >
      <div className="col-span-2 md:col-span-1 flex items-center gap-3">
        <IconPlaceholderToken
          letters={position.symbol.slice(0, 2)}
          className="size-8"
        />
        <div>
          <p className="text-base font-bold text-neutral-900">{position.name}</p>
          <p className="text-xs font-medium text-neutral-500">{position.symbol}</p>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span className="font-number font-bold text-lg text-neutral-900">
          {formatTokenAmount(position.balanceYfi)} YFI
        </span>
        <span className="mt-0.5 text-[10px] font-sans font-bold uppercase tracking-wide text-neutral-500">
          {position.statusLabel}
        </span>
      </div>

      <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-2 text-neutral-500">
        <span className="font-number text-sm font-bold text-neutral-700">
          {position.boostMultiplier.toFixed(2)}x Boost
        </span>
        <IconLinkOut className="size-4 text-neutral-400" />
      </div>
    </a>
  );
}
