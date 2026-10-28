"use client";
import { Badge } from "@/components/ui/Badge";
import { VoteResultsBar, voteSegmentClassName } from "@/components/ui/VoteResultsBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatDecimalAmount } from "@/lib/format";
import type { YbcMockDataV1, YbcGovernancePower, YbcSystemVotingPower } from "@/lib/clients/ybc";
import { getYbcSystemShares } from "@/lib/clients/ybc/system-power";
import { YbcHelp } from "./YbcHelp";
import { ybcCopy as copy } from "../messages";

type Props = {
  data: YbcMockDataV1; power?: YbcGovernancePower | null; powerLoading?: boolean;
  systemPower?: YbcSystemVotingPower | null; systemLoading?: boolean;
};
export function YbcHero({ data, power = data.governancePower, powerLoading = false, systemPower = data.systemPower, systemLoading = false }: Props) {
  const role = data.me.isOperator ? "operator" : data.me.isMember ? "member" : "observer";
  const shares = systemPower ? getYbcSystemShares(systemPower) : null;
  const available = shares ? systemPower : power;
  const amount = (value: string | undefined) => value === undefined ? "—" : formatDecimalAmount(value, 2);
  const breakdown = shares && systemPower ? [
    { kind: "yea" as const, label: copy.overview.own, value: systemPower.ownPower, share: shares.own },
    { kind: "ybc-yea" as const, label: copy.overview.pools, value: shares.steeredPower, share: shares.steered },
    { kind: "nay" as const, label: copy.overview.other, value: shares.otherPower, share: shares.other },
  ] : [];
  return <section id="overview" className="border-b border-border bg-surface">
    <div className="container mx-auto space-y-6 px-4 py-7 md:px-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-balance text-2xl font-bold md:text-3xl">{copy.page.title}</h1>
        <Tooltip side="bottom" align="start" className="md:[&>[role=tooltip]]:left-auto md:[&>[role=tooltip]]:right-0" content={copy.overview.roles[role].help}>
          <button type="button" onClick={event => event.currentTarget.focus()} onKeyDown={event => { if (event.key === "Escape") event.currentTarget.blur(); }} aria-label={`About ${copy.overview.roles[role].label.toLowerCase()} access`} className="inline-flex min-h-10 items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
            <Badge variant="neutral"><span className="cursor-help underline decoration-dotted underline-offset-4">{copy.overview.roles[role].label}</span></Badge>
          </button>
        </Tooltip>
      </div>
      <div>
        <YbcHelp label={copy.overview.total}>{copy.overview.totalHelp}</YbcHelp>
        <p className="break-words font-number text-4xl font-bold tabular-nums [overflow-wrap:anywhere]">{amount(available?.totalPower)}</p>
        {!available ? <p className="mt-2 text-xs text-text-secondary">{powerLoading || systemLoading ? copy.overview.loading : copy.overview.unavailable}</p> : null}
      </div>
      <div>
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 text-sm text-text-secondary">
          <span>{shares ? <><span className="font-number font-bold text-yearn-blue dark:text-blue-400">{shares.ybc}</span> {copy.overview.ofDao}</> : systemLoading ? copy.overview.loading : copy.overview.shareUnavailable}</span>
          {shares && systemPower ? <span>{copy.overview.daoTotal} <span className="font-number">{amount(systemPower.daoTotalPower)}</span></span> : null}
        </div>
        {shares && systemPower ? <Tooltip side="bottom" align="start" className="flex w-full" content={<>
          <span className="mb-3 block font-bold text-text-primary">{copy.overview.breakdown}</span>
          <span className="space-y-3 block">{breakdown.map(item => <span key={item.kind} className="block">
            <span className="flex items-center gap-2"><span className={`h-2.5 w-4 shrink-0 rounded-sm ${voteSegmentClassName(item.kind)}`} />{item.label}</span>
            <span className="ml-6 block font-number text-text-primary">{amount(item.value)} · {item.share}</span>
          </span>)}</span>
          <span className="mt-3 block border-t border-border pt-3">{copy.overview.barHelp}</span>
        </>}>
          <button type="button" aria-label={copy.overview.barLabel} onClick={event => event.currentTarget.focus()} onKeyDown={event => { if (event.key === "Escape") event.currentTarget.blur(); }} className="flex min-h-10 w-full items-center rounded cursor-help focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
            <VoteResultsBar segments={shares.segments} />
          </button>
        </Tooltip> : <div className="flex min-h-10 items-center"><VoteResultsBar segments={[]} /></div>}
      </div>
    </div>
  </section>;
}
export function YbcHeroSkeleton() {
  return <section className="border-b border-border bg-surface"><div className="container mx-auto space-y-6 px-4 py-8 md:px-6"><Skeleton className="h-8 w-full max-w-xl" /><Skeleton className="h-28 w-full" /></div></section>;
}
