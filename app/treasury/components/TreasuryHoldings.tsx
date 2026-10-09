import { UtcTime } from "@/components/ui/UtcTime";
import { Card } from "@/components/ui/Card";
import { formatTreasuryAmount, formatTreasuryUsd, treasuryAddressHref } from "@/lib/clients/treasury/display";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryHolding } from "@/lib/clients/treasury/types";
import { treasuryCopy as copy } from "../messages";

export const treasuryLinkClass = "inline-flex min-h-10 min-w-10 items-center gap-1 rounded-md text-sm text-text-secondary underline decoration-border underline-offset-4 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary";
export const treasurySummaryClass = "flex min-h-11 cursor-pointer items-center gap-2 rounded-md text-sm font-medium text-text-secondary transition-[color] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none";

export function TreasuryHoldings({ feed, holdings, excludeYfi, label = copy.portfolioTitle }: {
  feed: TreasuryFeed; holdings: TreasuryHolding[]; excludeYfi: boolean; label?: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-border bg-surface-secondary/40 px-6 py-3 text-xs font-medium text-text-secondary md:grid" aria-hidden="true">
        <span>{copy.holding}</span><span className="text-right">{copy.quantity}</span><span className="text-right">{copy.value}</span>
      </div>
      <ul className="divide-y divide-border" aria-label={label}>
        {holdings.map((holding) => {
          const account = feed.accounts.find((entry) => entry.id === holding.accountId);
          const team = feed.teams.find((entry) => entry.id === holding.accountableTeamId);
          const valuation = excludeYfi ? holding.valuation.usdValueExcludingYfi : holding.valuation.usdValue;
          return (
            <li key={holding.id} className="min-w-0 px-4 py-4 sm:px-6">
              <div className="grid min-w-0 grid-cols-2 items-start gap-x-4 gap-y-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-x-6">
                <div className="col-span-2 min-w-0 md:col-span-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="min-w-0 max-w-full break-words font-bold">{holding.asset.symbol}</h3>
                    {holding.asset.name !== holding.asset.symbol ? <span className="min-w-0 max-w-full break-words text-sm text-text-secondary">{holding.asset.name}</span> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">{account?.label} · {copy.purposeLabels[holding.purpose]}</p>
                </div>
                <div className="min-w-0 md:text-right">
                  <span className="mb-1 block text-xs text-text-secondary md:sr-only">{copy.quantity}</span>
                  <span className="break-words font-number text-sm tabular-nums">{formatTreasuryAmount(holding.balanceRaw, holding.asset.decimals)}</span>
                </div>
                <div className="min-w-0 text-right">
                  <span className="mb-1 block text-xs text-text-secondary md:sr-only">{copy.value}</span>
                  <span className="break-words font-number text-sm tabular-nums">{formatTreasuryUsd(valuation)}</span>
                  {holding.valuation.status === "stale" ? <span className="mt-1 block text-xs text-text-secondary">{copy.priceStale}</span> : null}
                </div>
              </div>
              <details className="group mt-1">
                <summary className={treasurySummaryClass}>
                  <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>
                  {copy.details}<span className="sr-only"> — {holding.asset.symbol} at {account?.label}</span>
                  {team ? <span className="ml-auto text-xs font-normal">{team.label}</span> : null}
                </summary>
                <dl className="grid gap-x-6 gap-y-4 rounded-lg bg-surface-secondary/50 p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-text-secondary">{copy.purpose}</dt><dd className="mt-1 leading-6">{holding.purposeNote ?? copy.purposeLabels[holding.purpose]}</dd></div>
                  <div><dt className="text-xs text-text-secondary">{copy.withdrawal}</dt><dd className="mt-1 leading-6">{copy.withdrawalLabels[holding.withdrawal.status]}{holding.withdrawal.note ? " · " + holding.withdrawal.note : ""}</dd></div>
                  <div><dt className="text-xs text-text-secondary">{copy.team}</dt><dd className="mt-1">{team?.label ?? copy.noTeam}</dd></div>
                  {holding.underlying ? <div><dt className="text-xs text-text-secondary">{copy.underlying}</dt><dd className="mt-1 font-number tabular-nums">{formatTreasuryAmount(holding.underlying.raw, holding.underlying.asset.decimals)} {holding.underlying.asset.symbol}</dd></div> : null}
                  {account ? <div><dt className="text-xs text-text-secondary">{copy.account}</dt><dd><a className={treasuryLinkClass} href={treasuryAddressHref(account.address)} target="_blank" rel="noopener noreferrer">{account.label} ↗</a></dd></div> : null}
                  <div><dt className="text-xs text-text-secondary">{copy.tokenContract}</dt><dd>{holding.asset.address ? <a className={treasuryLinkClass} href={treasuryAddressHref(holding.asset.address)} target="_blank" rel="noopener noreferrer" title={holding.asset.address} aria-label={copy.tokenContract + ": " + holding.asset.address}>{holding.asset.address.slice(0, 6)}…{holding.asset.address.slice(-4)} ↗</a> : <span className="mt-1 block">{copy.nativeAsset}</span>}</dd></div>
                  <div><dt className="text-xs text-text-secondary">{copy.valuationSource}</dt><dd className="mt-1">{holding.valuation.source ?? copy.unavailable}{holding.valuation.asOf !== null ? <span className="mt-1 block text-xs text-text-secondary"><UtcTime timestamp={holding.valuation.asOf} /></span> : null}</dd></div>
                </dl>
              </details>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
