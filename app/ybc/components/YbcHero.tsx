import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { AddressLink } from "@/components/ui/ExplorerLink";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { UtcTime } from "@/components/ui/UtcTime";
import { formatDecimalAmount, formatPercent } from "@/lib/format";
import type { YbcMockDataV1 } from "@/lib/clients/ybc";
import { ybcCopy as copy } from "../messages";

export function YbcHero({ data }: { data: YbcMockDataV1 }) {
  const isMember = data.me.isMember;
  const weight = data.me.weight;
  return (
    <section id="overview" className="scroll-mt-24 border-b border-border bg-surface">
      <div className="container mx-auto space-y-6 px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-3xl font-bold md:text-4xl">{copy.page.title}</h1>
          <Badge variant={isMember ? "success" : "neutral"}>{isMember ? copy.hero.states.member : copy.hero.states.observer}</Badge>
        </div>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">{copy.page.description}</p>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <div className="space-y-1">
              <p className="text-xs font-bold text-text-secondary">{copy.hero.summary.collectiveLabel}</p>
              <p className="break-words font-number text-3xl font-bold tabular-nums [overflow-wrap:anywhere]">{formatDecimalAmount(data.hero.internalWeight, 2)} <span className="text-sm font-normal text-text-secondary">{copy.hero.weightUnit}</span></p>
              <p className="text-xs leading-5 text-text-secondary">{copy.hero.summary.collectiveBody}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
              {[
                [copy.hero.stats.members, data.hero.memberCount],
                [copy.hero.stats.epoch, data.hero.currentEpoch],
                [copy.hero.stats.activeProposals, data.hero.activeProposalCount],
                [copy.hero.stats.awaitingExecution, data.hero.awaitingExecutionCount],
              ].map(([label, value]) => <div key={label} className="min-w-0">
                <dt className="text-xs leading-5 text-text-secondary">{label}</dt>
                <dd className="font-number text-lg font-bold tabular-nums">{value.toLocaleString("en-US")}</dd>
              </div>)}
            </dl>
          </div>
          <Card className="min-w-0 space-y-4 bg-surface-secondary/40 p-4 shadow-none md:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold">{isMember ? copy.hero.perspective.memberTitle : copy.hero.perspective.observerTitle}</h2>
              <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-text-secondary">{copy.hero.perspective.collectiveAddress}<AddressLink address={data.hero.collectiveAddress} variant="compact" /></span>
            </div>
            {isMember ? <>
              <dl className="grid grid-cols-3 gap-3">
                {[
                  [copy.hero.perspective.rawStaked, `${formatDecimalAmount(weight.rawStaked, 2)} YFI`],
                  [copy.hero.perspective.effectiveWeight, formatDecimalAmount(weight.effectiveWeight, 2)],
                  [copy.hero.perspective.targetWeight, formatDecimalAmount(weight.targetWeight, 2)],
                ].map(([label, value]) => <div key={label} className="min-w-0 space-y-1"><dt className="text-xs text-text-secondary">{label}</dt><dd className="break-words font-number text-sm font-bold [overflow-wrap:anywhere]">{value}</dd></div>)}
              </dl>
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary"><span>{copy.hero.perspective.maturity}</span><span className="font-number">{formatPercent(weight.maturityBps / 10_000, 0)}</span></div>
                <ProgressBar value={weight.maturityBps / 100} className="h-1.5 bg-surface-secondary" />
                <p className="break-words text-xs leading-5 text-text-secondary [overflow-wrap:anywhere]">{weight.maturesAt ? <>{copy.members.states.maturesOn} <UtcTime timestamp={weight.maturesAt} format="date" /> UTC</> : weight.maturityBps >= 10_000 ? copy.members.states.fullyMatured : copy.members.states.ramping}</p>
              </div>
            </> : <p className="text-sm leading-6 text-text-secondary">{copy.hero.perspective.observerBody}</p>}
          </Card>
        </div>
        <nav aria-label={copy.hero.navigation} className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-2">
          {(["proposals", "members", "rewards", ...(data.admin && data.me.isOperator ? ["admin" as const] : [])] as const).map((section) => <a key={section} href={`#${section}`} className="inline-flex min-h-10 items-center rounded text-sm font-bold text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">{copy.sections[section]}</a>)}
        </nav>
      </div>
    </section>
  );
}

export function YbcHeroSkeleton() {
  return <section className="border-b border-border bg-surface"><div className="container mx-auto space-y-6 px-4 py-8 md:px-6 md:py-10"><Skeleton className="h-10 w-full max-w-2xl" /><Skeleton className="h-5 w-full max-w-xl" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div></div></section>;
}
