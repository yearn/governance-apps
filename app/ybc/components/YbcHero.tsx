import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatAddress, formatPercent } from "@/lib/format";
import type { YbcMockDataV1 } from "@/lib/clients/ybc";
import { ybcCopy as copy } from "../messages";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type YbcHeroProps = {
  data: YbcMockDataV1;
};

export function YbcHero({ data }: YbcHeroProps) {
  const isMember = data.me.isMember;
  const maturityPercent = data.me.weight.maturityBps / 100;

  return (
    <section id="overview" className="border-b border-border bg-surface">
      <div className="container mx-auto grid gap-6 px-4 py-10 md:px-6 md:py-14 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{copy.app.routeKey}</Badge>
            <Badge variant="warning">{copy.page.productionGate}</Badge>
            <Badge variant={isMember ? "success" : "neutral"}>
              {isMember ? copy.hero.states.member : copy.hero.states.observer}
            </Badge>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold uppercase text-text-tertiary">
              {copy.page.eyebrow}
            </p>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold md:text-6xl">{copy.page.title}</h1>
              <p className="max-w-3xl text-base leading-7 text-text-secondary md:text-lg">
                {copy.page.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
            <InfluenceCard
              label={copy.hero.summary.internalLabel}
              value={formatWeight(data.hero.internalWeight)}
              body={copy.hero.summary.internalBody}
              className="border-yearn-blue/30 bg-yearn-blue/[0.06]"
            />
            <InfluenceCard
              label={copy.hero.summary.delegatedLabel}
              value={formatWeight(data.hero.delegatedWeight)}
              body={copy.hero.summary.delegatedBody}
              className="bg-surface-secondary/70"
            />
            <InfluenceCard
              label={copy.hero.summary.totalLabel}
              value={formatWeight(data.hero.totalInfluence)}
              body={copy.hero.summary.totalBody}
              className="bg-neutral-950 text-white"
              mutedClassName="text-neutral-300"
              emphasisClassName="text-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label={copy.hero.stats.members}
              value={data.hero.memberCount.toLocaleString("en-US")}
            />
            <MiniStat
              label={copy.hero.stats.epoch}
              value={data.hero.currentEpoch.toLocaleString("en-US")}
            />
            <MiniStat
              label={copy.hero.stats.activeProposals}
              value={data.hero.activeProposalCount.toLocaleString("en-US")}
            />
            <MiniStat
              label={copy.hero.stats.awaitingExecution}
              value={data.hero.awaitingExecutionCount.toLocaleString("en-US")}
            />
          </div>
        </div>

        <Card className="flex h-full flex-col justify-between gap-6">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase text-text-tertiary">
              {isMember
                ? copy.hero.perspective.memberTitle
                : copy.hero.perspective.observerTitle}
            </p>
            <h2 className="text-2xl font-bold">
              {isMember
                ? copy.hero.perspective.memberTitle
                : copy.hero.perspective.observerTitle}
            </h2>
            <p className="text-sm leading-6 text-text-secondary">
              {isMember
                ? copy.hero.perspective.memberBody
                : copy.hero.perspective.observerBody}
            </p>
          </div>

          <div className="grid gap-3 text-sm">
            <PerspectiveRow
              label={copy.hero.perspective.membership}
              value={isMember ? copy.hero.states.member : copy.hero.states.observer}
            />
            <PerspectiveRow
              label={copy.hero.perspective.collectiveAddress}
              value={formatAddress(data.hero.collectiveAddress)}
            />
            <PerspectiveRow
              label={copy.hero.perspective.rawStaked}
              value={formatToken(data.me.weight.rawStaked)}
            />
            <PerspectiveRow
              label={copy.hero.perspective.effectiveWeight}
              value={formatWeight(data.me.weight.effectiveWeight)}
            />
            <PerspectiveRow
              label={copy.hero.perspective.targetWeight}
              value={formatWeight(data.me.weight.targetWeight)}
            />
          </div>

          <div className="space-y-3 rounded-box border border-border bg-app p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold uppercase text-text-tertiary">
                {copy.hero.perspective.maturity}
              </span>
              <span className="font-number font-bold text-text-primary">
                {formatPercent(data.me.weight.maturityBps / 10_000, 0)}
              </span>
            </div>
            <ProgressBar value={maturityPercent} className="h-2.5 bg-surface-secondary" />
            <p className="text-sm text-text-secondary">
              {data.me.weight.maturesAt
                ? `${copy.members.states.maturesOn} ${DATE_FORMATTER.format(
                    data.me.weight.maturesAt * 1000
                  )}`
                : copy.members.states.fullyMatured}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

export function YbcHeroSkeleton() {
  return (
    <section id="overview" className="border-b border-border bg-surface">
      <div className="container mx-auto grid gap-6 px-4 py-10 md:px-6 md:py-14 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full max-w-2xl" />
            <Skeleton className="h-20 w-full max-w-3xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <Skeleton className="h-[420px] w-full" />
      </div>
    </section>
  );
}

function InfluenceCard({
  label,
  value,
  body,
  className,
  emphasisClassName,
  mutedClassName,
}: {
  label: string;
  value: string;
  body: string;
  className?: string;
  emphasisClassName?: string;
  mutedClassName?: string;
}) {
  return (
    <Card className={className}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className={`text-sm font-bold uppercase ${mutedClassName ?? "text-text-tertiary"}`}>
            {label}
          </p>
          <p className={`font-number text-3xl font-bold ${emphasisClassName ?? "text-text-primary"}`}>
            {value}
          </p>
        </div>
        <p className={`text-sm leading-6 ${mutedClassName ?? "text-text-secondary"}`}>
          {body}
        </p>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-app p-4">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-text-tertiary">{label}</p>
        <p className="font-number text-2xl font-bold text-text-primary">{value}</p>
      </div>
    </Card>
  );
}

function PerspectiveRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <span className="text-xs font-bold uppercase text-text-tertiary">{label}</span>
      <span className="font-number text-sm font-bold text-text-primary">{value}</span>
    </div>
  );
}

function formatToken(amount: string) {
  return `${formatAmount(amount)} YFI`;
}

function formatWeight(amount: string) {
  return `${formatAmount(amount)} weight`;
}

function formatAmount(amount: string) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) {
    return amount;
  }

  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: amount.includes(".") ? 2 : 0,
  });
}
