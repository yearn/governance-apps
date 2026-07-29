import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getButtonClassName } from "@/components/ui/Button";
import { UtcTime } from "@/components/ui/UtcTime";
import type { YbcMockDataV1, YbcRewardPeriod } from "@/lib/clients/ybc";
import { formatDecimalAmount } from "@/lib/format";
import { resolveGovernanceHref } from "@/lib/governance-links";
import { ybcCopy as copy } from "../messages";

type RewardsCardProps = {
  data: YbcMockDataV1;
  id?: string;
  hostname?: string | null;
};

export function RewardsCard({ data, id, hostname }: RewardsCardProps) {
  const claimHref = resolveGovernanceHref(data.rewards.claim.href, hostname);
  const ctaClassName = getButtonClassName({
    variant: "secondary",
    className: "w-full",
  });
  const viewerLabel = getViewerLabel(data);
  const emptyState = getEmptyState(data);

  return (
    <Card id={id} className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{copy.rewards.handoffBadge}</Badge>
        </div>
        <h2 className="text-balance text-2xl font-bold">{copy.rewards.title}</h2>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label={copy.rewards.summary.pending}
              value={`${formatDecimalAmount(data.me.pendingRewards, 2)} ${data.rewards.token.symbol}`}
            />
            <SummaryStat
              label={copy.rewards.summary.claimable}
              value={`${formatDecimalAmount(data.rewards.claimable, 2)} ${data.rewards.token.symbol}`}
            />
            <SummaryStat
              label={copy.rewards.summary.accruing}
              value={`${formatDecimalAmount(data.rewards.accruing, 2)} ${data.rewards.token.symbol}`}
            />
          </div>

          <div className="rounded-box border border-border bg-app/50 p-4">
            <h3 className="text-lg font-bold">{copy.rewards.periodsTitle}</h3>
            {data.rewards.periods.length > 0 ? (
              <div className="mt-4 space-y-3">
                {data.rewards.periods.map((period) => (
                  <RewardPeriodCard key={`${period.epoch}-${period.source}`} period={period} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-box border border-dashed border-border bg-app/40 p-4">
                <div className="space-y-3">
                  <h4 className="text-base font-bold">{emptyState.title}</h4>
                  <p className="text-sm leading-6 text-text-secondary">
                    {emptyState.body}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-box border border-border bg-app/50 p-4">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              {copy.rewards.viewerTitle}
            </p>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <DetailRow label={copy.rewards.rows.role} value={viewerLabel} />
              <DetailRow
                label={copy.rewards.rows.claimMode}
                value={copy.rewards.states.sharedClaimMode}
              />
            </div>
          </div>

          <div className="rounded-box border border-border bg-app/50 p-4">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              {copy.rewards.handoffTitle}
            </p>
            <div className="mt-3 space-y-4">
              <p className="text-sm leading-6 text-text-secondary">
                {copy.rewards.handoffBody}
              </p>
              <DetailRow
                label={copy.rewards.rows.lastUpdated}
                stacked
                value={
                  <UtcTime timestamp={data.rewards.lastUpdatedAt} />
                }
              />
              {data.rewards.claim.disabledReason ? (
                <p className="rounded-box border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {data.rewards.claim.disabledReason}
                </p>
              ) : null}
              {data.rewards.claim.disabledReason ? (
                <button type="button" disabled className={ctaClassName}>
                  {copy.rewards.disabledClaimCta}
                </button>
              ) : (
                <Link href={claimHref} className={ctaClassName}>
                  {data.rewards.claim.ctaLabel}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RewardPeriodCard({ period }: { period: YbcRewardPeriod }) {
  return (
    <div className="rounded-box border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={sourceVariantMap[period.source]}>
              {sourceLabelMap[period.source]}
            </Badge>
            <Badge variant={period.finalized ? "success" : "warning"}>
              {period.finalized
                ? copy.rewards.states.finalized
                : copy.rewards.states.pending}
            </Badge>
          </div>
          <p className="font-number text-lg font-bold text-text-primary">
            {`Epoch ${period.epoch.toLocaleString("en-US")}`}
          </p>
        </div>

        <div className="grid gap-3 text-right text-sm text-text-secondary">
          <DetailRow
            label={copy.rewards.rows.earned}
            value={`${formatDecimalAmount(period.earned, 2)} YFI`}
            align="right"
          />
          <DetailRow
            label={copy.rewards.rows.claimable}
            value={`${formatDecimalAmount(period.claimable, 2)} YFI`}
            align="right"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box border border-border bg-surface p-4">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-text-tertiary">{label}</p>
        <p className="min-w-0 break-words font-number text-xl font-bold text-text-primary [overflow-wrap:anywhere] sm:text-2xl">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  align = "left",
  stacked = false,
}: {
  label: string;
  value: ReactNode;
  align?: "left" | "right";
  stacked?: boolean;
}) {
  return (
    <div
      className={
        align === "right"
          ? "grid min-w-0 gap-1 text-right"
          : stacked
            ? "grid min-w-0 gap-1"
            : "grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3"
      }
    >
      <span className="text-xs font-bold uppercase text-text-tertiary">{label}</span>
      <div className="min-w-0 break-words font-number font-bold text-text-primary [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}

function getViewerLabel(data: YbcMockDataV1) {
  if (data.me.isOperator) {
    return copy.rewards.states.operator;
  }

  if (data.me.isMember) {
    return copy.rewards.states.member;
  }

  return copy.rewards.states.observer;
}

function getEmptyState(data: YbcMockDataV1) {
  if (data.roster.members.length === 0) {
    return {
      title: copy.rewards.states.emptyUnseededTitle,
      body: copy.rewards.states.emptyUnseededBody,
    };
  }

  if (!data.me.isMember) {
    return {
      title: copy.rewards.states.emptyObserverTitle,
      body: copy.rewards.states.emptyObserverBody,
    };
  }

  return {
    title: copy.rewards.states.emptyMemberTitle,
    body: copy.rewards.states.emptyMemberBody,
  };
}

const sourceLabelMap = {
  "member-weight": copy.rewards.states.memberWeight,
  "operator-bonus": copy.rewards.states.operatorBonus,
} as const;

const sourceVariantMap = {
  "member-weight": "neutral",
  "operator-bonus": "brand",
} as const;
