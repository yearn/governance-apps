"use client";

import { Fragment, useState } from "react";
import { treasuryLookalike } from "@/lib/clients/treasury/asset-identity";
import { UtcTime } from "@/components/ui/UtcTime";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTreasuryAmount, treasuryAddressHref, type TreasuryAccountGroup } from "@/lib/clients/treasury/display";
import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";
import type { TreasuryHolding } from "@/lib/clients/treasury/types";
import { treasuryCopy as copy } from "../messages";
import { Chevron, MissingValue, TreasuryAssetIcon, UsdValue, treasuryLinkClass, treasurySummaryClass } from "./TreasuryPrimitives";

export function TreasuryAccountHoldings({ feed, group, excludeYfi }: {
  feed: TreasuryFeed; group: TreasuryAccountGroup; excludeYfi: boolean;
}) {
  const label = group.kind === "robo" ? copy.robo : group.accounts[0].label;
  return (
    <section aria-labelledby={"treasury-account-" + group.id} className="min-w-0 space-y-2" data-testid={"treasury-account-group-" + group.id}>
      <div className="flex min-w-0 items-baseline justify-between gap-4 py-1">
        <h2 id={"treasury-account-" + group.id} className="min-w-0 text-base font-bold">{label}</h2>
        <span className="shrink-0 text-right font-number text-sm tabular-nums">
          <span className="sr-only">{copy.pricedSubtotal}: </span><UsdValue value={group.pricedUsdValue} />
          {group.unpricedCount ? <span className="mt-0.5 block font-sans text-[10px] text-text-secondary">{copy.partialValuation}<span className="sr-only"> · {group.unpricedCount} {copy.unpriced}</span></span> : null}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {group.primary.length ? <TreasuryHoldings feed={feed} holdings={group.primary} excludeYfi={excludeYfi} label={label} /> : null}
        {group.small.length ? <HoldingDisclosure feed={feed} holdings={group.small} excludeYfi={excludeYfi} label={copy.smallHoldings} id={group.id + "-small"} /> : null}
        {group.other.length ? <HoldingDisclosure feed={feed} holdings={group.other} excludeYfi={excludeYfi} label={copy.otherHoldings} id={group.id + "-other"} /> : null}
        {group.lookalikes.length ? <HoldingDisclosure feed={feed} holdings={group.lookalikes} excludeYfi={excludeYfi} label={copy.lookalikeHoldings} id={group.id + "-lookalikes"} /> : null}
      </div>
    </section>
  );
}

function HoldingDisclosure({ feed, holdings, excludeYfi, label, id }: {
  feed: TreasuryFeed; holdings: TreasuryHolding[]; excludeYfi: boolean; label: string; id: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border first:border-t-0" data-testid={"treasury-collapsed-" + id}>
      <button type="button" className={treasurySummaryClass + " w-full px-4 text-left"} aria-expanded={open} aria-controls={"treasury-rows-" + id} onClick={() => setOpen(!open)}>
        <Chevron open={open} /><span>{label}</span><span className="ml-1 font-number tabular-nums">{holdings.length}</span>
      </button>
      <div id={"treasury-rows-" + id} hidden={!open}>
        {open ? <TreasuryHoldings feed={feed} holdings={holdings} excludeYfi={excludeYfi} label={label} /> : null}
      </div>
    </div>
  );
}

export function TreasuryHoldings({ feed, holdings, excludeYfi, label }: {
  feed: TreasuryFeed; holdings: TreasuryHolding[]; excludeYfi: boolean; label: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Table className="table-fixed" aria-label={label}>
      <TableHeader>
        <TableRow className="bg-surface-secondary/30">
          <TableHead scope="col" className="h-9 w-[40%] px-3 text-xs sm:w-[44%] sm:px-4">{copy.holding}</TableHead>
          <TableHead scope="col" className="h-9 w-[27%] px-1.5 text-right text-xs sm:w-[29%] sm:px-2">{copy.quantity}</TableHead>
          <TableHead scope="col" className="h-9 w-[33%] px-2 text-right text-xs sm:w-[27%] sm:px-4">{copy.value}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => {
          const open = expanded === holding.id;
          const account = feed.accounts.find((entry) => entry.id === holding.accountId);
          const value = excludeYfi ? holding.valuation.usdValueExcludingYfi : holding.valuation.usdValue;
          const fullBalance = formatTreasuryAmount(holding.balanceRaw, holding.asset.decimals);
          const compactBalance = formatTreasuryAmount(holding.balanceRaw, holding.asset.decimals, BigInt(holding.balanceRaw) >= 10n ** BigInt(holding.asset.decimals) ? 2 : 4);
          const purpose = holding.purpose === "strategic" ? copy.strategic : holding.purpose === "product-seed" ? copy.seed : null;
          return (
            <Fragment key={holding.id}>
              <TableRow>
                <TableCell className="px-3 py-1.5 sm:px-4">
                  <button type="button" onClick={() => setExpanded(open ? null : holding.id)} aria-expanded={open} aria-controls={"treasury-holding-" + holding.id} aria-label={copy.details + " — " + holding.asset.symbol + " at " + account?.label} className="flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary">
                    <TreasuryAssetIcon asset={holding.underlying?.asset ?? holding.asset} />
                    <span className="min-w-0">
                      <span className="block break-words text-xs font-bold sm:text-sm">{holding.asset.symbol}</span>
                      {purpose ? <span className="mt-0.5 inline-block whitespace-nowrap rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] text-text-secondary">{purpose}</span> : null}
                    </span>
                    <span className={"ml-auto text-text-secondary" + (purpose ? " self-start mt-0.5" : "")}><Chevron open={open} /></span>
                  </button>
                </TableCell>
                <TableCell className="whitespace-nowrap px-1.5 py-2 text-right font-sans text-xs tabular-nums sm:px-2 sm:font-number sm:text-sm" title={fullBalance}>
                  <span className="block truncate sm:hidden">{compactBalance}</span><span className="hidden truncate sm:block">{fullBalance}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-2 text-right font-sans text-xs tabular-nums sm:px-4 sm:font-number sm:text-sm">
                  <UsdValue value={value} />
                  {holding.valuation.redemption && !excludeYfi ? <span className="mt-0.5 block whitespace-normal font-sans text-[10px] leading-tight text-text-secondary">{copy.redemptionReference}</span> : null}
                  {holding.valuation.redemption?.fundingStatus === "awaiting-yfi" ? <span className="mt-0.5 block whitespace-normal font-sans text-[10px] leading-tight text-text-secondary">{copy.awaitingYfiFunding}</span> : null}
                  {holding.valuation.status === "stale" ? <span className="mt-0.5 block font-sans text-[10px] text-text-secondary">{copy.priceStale}</span> : null}
                </TableCell>
              </TableRow>
              {open ? (
                <TableRow id={"treasury-holding-" + holding.id} className="bg-surface-secondary/40">
                  <TableCell colSpan={3} className="px-4 py-3">
                    <HoldingDetails feed={feed} holding={holding} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function HoldingDetails({ feed, holding }: { feed: TreasuryFeed; holding: TreasuryHolding }) {
  const account = feed.accounts.find((entry) => entry.id === holding.accountId);
  const team = feed.teams.find((entry) => entry.id === holding.accountableTeamId);
  const lookalike = treasuryLookalike(holding.asset);
  return (
    <dl className="grid min-w-0 gap-x-6 gap-y-3 text-xs leading-5 [overflow-wrap:anywhere] sm:grid-cols-2 lg:grid-cols-3">
      <div><dt className="text-text-secondary">{copy.assetName}</dt><dd>{holding.asset.name}</dd></div>
      {lookalike ? <div><dt className="text-text-secondary">{copy.identity}</dt><dd>{copy.lookalikeNote} <a className={treasuryLinkClass} href={lookalike.source} target="_blank" rel="noopener noreferrer">{lookalike.symbol} {copy.issuerReference} ↗</a><span className="block">{lookalike.address}</span></dd></div> : null}
      <div><dt className="text-text-secondary">{copy.quantity}</dt><dd className="font-number tabular-nums">{formatTreasuryAmount(holding.balanceRaw, holding.asset.decimals)} {holding.asset.symbol}</dd></div>
      {holding.valuation.redemption ? (
        <>
          <div><dt className="text-text-secondary">{copy.redemptionFunding}</dt><dd>{holding.valuation.redemption.fundingStatus === "funded" ? copy.redemptionFunded : copy.awaitingYfiFunding}</dd></div>
          <div><dt className="text-text-secondary">{copy.redemptionEthRequired}</dt><dd className="font-number tabular-nums">{formatTreasuryAmount(holding.valuation.redemption.ethRequiredRaw, 18, 18)} ETH</dd></div>
          <div><dt className="text-text-secondary">{copy.redemptionYfiAvailable}</dt><dd className="font-number tabular-nums">{formatTreasuryAmount(holding.valuation.redemption.yfiAvailableRaw, 18, 18)} YFI</dd></div>
          <div><dt className="text-text-secondary">{copy.redemptionContract}</dt><dd><a className={treasuryLinkClass} href={treasuryAddressHref(holding.valuation.redemption.contract)} target="_blank" rel="noopener noreferrer" title={holding.valuation.redemption.contract} aria-label={copy.redemptionContract + ": " + holding.valuation.redemption.contract}>{holding.valuation.redemption.contract.slice(0, 6)}…{holding.valuation.redemption.contract.slice(-4)} ↗</a></dd></div>
        </>
      ) : null}
      {holding.purposeNote ? <div><dt className="text-text-secondary">{copy.purpose}</dt><dd>{holding.purposeNote}</dd></div> : null}
      <div><dt className="text-text-secondary">{copy.withdrawal}</dt><dd>{copy.withdrawalLabels[holding.withdrawal.status]}{holding.withdrawal.note ? " · " + holding.withdrawal.note : ""}</dd></div>
      {team ? <div><dt className="text-text-secondary">{copy.team}</dt><dd>{team.label}</dd></div> : null}
      {holding.underlying ? <div><dt className="text-text-secondary">{copy.underlying}</dt><dd className="font-number tabular-nums">{formatTreasuryAmount(holding.underlying.raw, holding.underlying.asset.decimals)} {holding.underlying.asset.symbol}</dd></div> : null}
      {account ? <div><dt className="text-text-secondary">{copy.account}</dt><dd><a className={treasuryLinkClass} href={treasuryAddressHref(account.address)} target="_blank" rel="noopener noreferrer" title={account.address}>{account.label} ↗</a></dd></div> : null}
      <div>
        <dt className="text-text-secondary">{copy.tokenContract}</dt>
        <dd>{holding.asset.address ? <a className={treasuryLinkClass} href={treasuryAddressHref(holding.asset.address)} target="_blank" rel="noopener noreferrer" title={holding.asset.address} aria-label={copy.tokenContract + ": " + holding.asset.address}>{holding.asset.address.slice(0, 6)}…{holding.asset.address.slice(-4)} ↗</a> : copy.nativeAsset}</dd>
      </div>
      <div><dt className="text-text-secondary">{copy.valuationSource}</dt><dd>{holding.valuation.source ?? <MissingValue />}{holding.valuation.asOf !== null ? <span className="block text-text-secondary"><UtcTime timestamp={holding.valuation.asOf} /></span> : null}</dd></div>
    </dl>
  );
}
