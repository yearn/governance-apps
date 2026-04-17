import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  formatTeamsDate,
  formatTeamsUsd,
  type BucketRecord,
  type TeamRecord,
  type TeamsAdminRecord,
  type TeamsViewerContext,
} from "@/lib/clients/teams";
import { formatAddress, formatPercent } from "@/lib/format";
import { teamsCopy } from "../messages";

type AdminConsoleProps = {
  admin: TeamsAdminRecord | null;
  teams: TeamRecord[];
  viewer: TeamsViewerContext | null;
  currentPeriod: number | null;
  state: "ready" | "loading" | "empty";
};

export function AdminConsole({
  admin,
  teams,
  viewer,
  currentPeriod,
  state,
}: AdminConsoleProps) {
  if (state === "loading") {
    return (
      <Card className="space-y-6" aria-busy="true">
        <AdminConsoleHeader />
        <div className="rounded-box border border-border bg-app px-5 py-6">
          <h3 className="text-lg font-bold text-text-primary">
            {teamsCopy.admin.loadingTitle}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {teamsCopy.admin.loadingBody}
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full" />
            ))}
          </div>
          <Skeleton className="h-56 w-full" />
        </div>
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="space-y-6">
        <AdminConsoleHeader />
        <div className="rounded-box border border-dashed border-border bg-app px-5 py-6">
          <h3 className="text-lg font-bold text-text-primary">
            {teamsCopy.admin.emptyTitle}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {teamsCopy.admin.emptyBody}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <AdminConsoleHeader />

      {admin && viewer?.canUseAdmin ? (
        <UnlockedAdminConsole
          admin={admin}
          teams={teams}
          viewer={viewer}
          currentPeriod={currentPeriod}
        />
      ) : (
        <LockedAdminConsole viewer={viewer} />
      )}
    </Card>
  );
}

function AdminConsoleHeader() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">{teamsCopy.admin.eyebrow}</Badge>
        <Badge variant="warning">{teamsCopy.admin.mockBadge}</Badge>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-text-primary">{teamsCopy.admin.title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-text-secondary">
          {teamsCopy.admin.description}
        </p>
      </div>
    </div>
  );
}

function LockedAdminConsole({ viewer }: { viewer: TeamsViewerContext | null }) {
  return (
    <div className="rounded-box border border-dashed border-border bg-app px-5 py-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-text-primary">
            {teamsCopy.admin.accessCard.title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {teamsCopy.admin.accessCard.body}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InlineMetric
            label={teamsCopy.admin.accessCard.viewerLabel}
            value={viewer ? teamsCopy.viewerRoles[viewer.role] : teamsCopy.viewerRoles.observer}
          />
          <InlineMetric
            label={teamsCopy.admin.accessCard.accessLabel}
            value={teamsCopy.admin.accessCard.lockedValue}
          />
        </div>

        <p className="text-sm font-medium text-text-primary">
          {teamsCopy.admin.accessCard.hint}
        </p>
      </div>
    </div>
  );
}

function UnlockedAdminConsole({
  admin,
  teams,
  viewer,
  currentPeriod,
}: {
  admin: TeamsAdminRecord;
  teams: TeamRecord[];
  viewer: TeamsViewerContext;
  currentPeriod: number | null;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <div className="space-y-4">
        <RegistryCard teams={teams} />
        <RevenueOpsCard admin={admin} />
        <FundingOpsCard admin={admin} />
        <BonusOpsCard admin={admin} />
      </div>

      <div className="space-y-4">
        <Card className="bg-app/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
            {teamsCopy.admin.summary.title}
          </p>
          <div className="mt-4 space-y-3 text-sm text-text-secondary">
            <KeyValueRow
              label={teamsCopy.admin.summary.viewer}
              value={teamsCopy.viewerRoles[viewer.role]}
            />
            <KeyValueRow
              label={teamsCopy.admin.summary.currentPeriod}
              value={currentPeriod === null ? "--" : `#${currentPeriod}`}
            />
            <KeyValueRow
              label={teamsCopy.admin.summary.registryStatus}
              value={teamsCopy.admin.registryStatuses[admin.registryStatus].label}
            />
            <KeyValueRow
              label={teamsCopy.admin.summary.finalizationStatus}
              value={
                teamsCopy.admin.finalizationStatuses[admin.periodFinalizationStatus].label
              }
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function RegistryCard({ teams }: { teams: TeamRecord[] }) {
  const activeCount = teams.filter((team) => team.status === "active").length;
  const retiringCount = teams.filter((team) => team.status === "retiring").length;
  const retiredCount = teams.filter((team) => team.status === "retired").length;

  return (
    <Card className="space-y-5 bg-app/40">
      <SectionHeader
        title={teamsCopy.admin.registry.title}
        description={teamsCopy.admin.registry.description}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <InlineMetric
          label={teamsCopy.admin.registry.metrics.active}
          value={String(activeCount)}
        />
        <InlineMetric
          label={teamsCopy.admin.registry.metrics.retiring}
          value={String(retiringCount)}
        />
        <InlineMetric
          label={teamsCopy.admin.registry.metrics.retired}
          value={String(retiredCount)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{teamsCopy.admin.registry.headers.team}</TableHead>
            <TableHead>{teamsCopy.admin.registry.headers.owner}</TableHead>
            <TableHead>{teamsCopy.admin.registry.headers.status}</TableHead>
            <TableHead>{teamsCopy.admin.registry.headers.retirement}</TableHead>
            <TableHead>{teamsCopy.admin.registry.headers.migration}</TableHead>
            <TableHead>{teamsCopy.admin.registry.headers.workspace}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const lifecycleStatus = teamsCopy.statuses[team.status];
            const migrationStatus =
              teamsCopy.lifecycle.migrationReadiness[team.lifecycle.migrationReadiness];
            const retirementDate = formatTeamsDate(team.lifecycle.retirementAnnouncedAt);

            return (
              <TableRow key={team.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-bold text-text-primary">{team.name}</p>
                    <p className="text-xs text-text-secondary">{team.id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-text-primary">{formatAddress(team.owner)}</p>
                  <p className="font-number break-all text-xs text-text-secondary">
                    {team.owner}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={lifecycleStatus.variant}>{lifecycleStatus.label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-text-primary">
                      {getRetirementLabel(team)}
                    </p>
                    {retirementDate ? (
                      <p className="text-xs text-text-secondary">{retirementDate}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Badge variant={migrationStatus.variant}>{migrationStatus.label}</Badge>
                    <p className="text-xs text-text-secondary">
                      {team.lifecycle.successorTeamId
                        ? teamsCopy.admin.registry.workspace.successor(
                            team.lifecycle.successorTeamId
                          )
                        : teamsCopy.admin.registry.workspace.noSuccessor}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-text-primary">
                      {team.readOnlyReason
                        ? `${teamsCopy.admin.registry.workspace.readOnlyPrefix} • ${teamsCopy.readOnlyReasons[team.readOnlyReason]}`
                        : teamsCopy.admin.registry.workspace.full}
                    </p>
                    {team.pendingOwner ? (
                      <p className="text-xs text-text-secondary">
                        Pending owner: {formatAddress(team.pendingOwner)}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function RevenueOpsCard({ admin }: { admin: TeamsAdminRecord }) {
  const buckets: Array<{
    key: "rewards" | "treasury" | "recovery";
    label: string;
    bucket: BucketRecord;
  }> = [
    {
      key: "rewards",
      label: teamsCopy.admin.revenue.bucketLabels.rewards,
      bucket: admin.rewardsBucket,
    },
    {
      key: "treasury",
      label: teamsCopy.admin.revenue.bucketLabels.treasury,
      bucket: admin.treasuryBucket,
    },
    {
      key: "recovery",
      label: teamsCopy.admin.revenue.bucketLabels.recovery,
      bucket: admin.recoveryBucket,
    },
  ];

  return (
    <Card className="space-y-5 bg-app/40">
      <SectionHeader
        title={teamsCopy.admin.revenue.title}
        description={teamsCopy.admin.revenue.description}
      />

      <div className="grid gap-3 xl:grid-cols-3">
        {buckets.map(({ key, label, bucket }) => (
          <BucketUsageCard key={key} label={label} bucket={bucket} />
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {teamsCopy.admin.revenue.tokenTitle}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{teamsCopy.admin.revenue.tokenHeaders.token}</TableHead>
              <TableHead>{teamsCopy.admin.revenue.tokenHeaders.status}</TableHead>
              <TableHead>{teamsCopy.admin.revenue.tokenHeaders.oracle}</TableHead>
              <TableHead>{teamsCopy.admin.revenue.tokenHeaders.converter}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admin.whitelistedRevenueTokens.map((token) => {
              const status = teamsCopy.admin.tokenStatuses[token.status];

              return (
                <TableRow key={token.tokenAddress}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-text-primary">{token.symbol}</p>
                      <p className="font-number text-xs text-text-secondary">
                        {token.tokenAddress}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <AddressCell address={token.oracle} />
                  </TableCell>
                  <TableCell>
                    {token.converter ? (
                      <AddressCell address={token.converter} />
                    ) : (
                      <span className="text-sm text-text-secondary">
                        {teamsCopy.admin.revenue.directCredit}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function FundingOpsCard({ admin }: { admin: TeamsAdminRecord }) {
  const attentionCount = admin.fundingQueue.filter(
    (entry) => entry.requiresOperatorAttention
  ).length;
  const lateLiquidCount = admin.fundingQueue.filter(
    (entry) => entry.status === "late-liquid"
  ).length;

  return (
    <Card className="space-y-5 bg-app/40">
      <SectionHeader
        title={teamsCopy.admin.fundingOps.title}
        description={teamsCopy.admin.fundingOps.description}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <InlineMetric
          label={teamsCopy.admin.fundingOps.metrics.approvals}
          value={String(admin.fundingQueue.length)}
        />
        <InlineMetric
          label={teamsCopy.admin.fundingOps.metrics.attention}
          value={String(attentionCount)}
        />
        <InlineMetric
          label={teamsCopy.admin.fundingOps.metrics.lateLiquid}
          value={String(lateLiquidCount)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{teamsCopy.admin.fundingOps.headers.approval}</TableHead>
            <TableHead>{teamsCopy.admin.fundingOps.headers.team}</TableHead>
            <TableHead>{teamsCopy.admin.fundingOps.headers.status}</TableHead>
            <TableHead>{teamsCopy.admin.fundingOps.headers.attention}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admin.fundingQueue.map((entry) => {
            const status = teamsCopy.funding.statuses[entry.status];
            const attention = entry.requiresOperatorAttention
              ? teamsCopy.admin.operatorAttention.required
              : teamsCopy.admin.operatorAttention.clear;

            return (
              <TableRow key={`${entry.teamId}:${entry.approvalId}`}>
                <TableCell>
                  <span className="font-number text-sm font-medium text-text-primary">
                    {entry.approvalId}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-text-primary">{entry.teamId}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={attention.variant}>{attention.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function BonusOpsCard({ admin }: { admin: TeamsAdminRecord }) {
  const finalizationCount = admin.bonusQueue.filter(
    (entry) => entry.requiresFinalization
  ).length;
  const claimedCount = admin.bonusQueue.filter((entry) => entry.status === "claimed").length;

  return (
    <Card className="space-y-5 bg-app/40">
      <SectionHeader
        title={teamsCopy.admin.bonusOps.title}
        description={teamsCopy.admin.bonusOps.description}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <InlineMetric
          label={teamsCopy.admin.bonusOps.metrics.periods}
          value={String(admin.bonusQueue.length)}
        />
        <InlineMetric
          label={teamsCopy.admin.bonusOps.metrics.finalization}
          value={String(finalizationCount)}
        />
        <InlineMetric
          label={teamsCopy.admin.bonusOps.metrics.history}
          value={String(claimedCount)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{teamsCopy.admin.bonusOps.headers.team}</TableHead>
            <TableHead>{teamsCopy.admin.bonusOps.headers.period}</TableHead>
            <TableHead>{teamsCopy.admin.bonusOps.headers.status}</TableHead>
            <TableHead>{teamsCopy.admin.bonusOps.headers.finalization}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admin.bonusQueue.map((entry) => {
            const status = teamsCopy.bonus.periodStatuses[entry.status];
            const finalization = entry.requiresFinalization
              ? teamsCopy.admin.finalizationState.required
              : teamsCopy.admin.finalizationState.complete;

            return (
              <TableRow key={`${entry.teamId}:${entry.period}`}>
                <TableCell>
                  <span className="font-medium text-text-primary">{entry.teamId}</span>
                </TableCell>
                <TableCell>
                  <span className="font-number text-sm text-text-primary">
                    {teamsCopy.admin.bonusOps.currentPeriod(entry.period)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={finalization.variant}>{finalization.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function BucketUsageCard({
  label,
  bucket,
}: {
  label: string;
  bucket: BucketRecord;
}) {
  const status = teamsCopy.admin.bucketStatuses[bucket.status];
  const usagePercent = getBucketUsagePercent(bucket);

  return (
    <div className="rounded-box border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-text-primary">{label}</p>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
              {teamsCopy.admin.revenue.bucketUsage}
            </span>
            <span className="font-number text-sm font-bold text-text-primary">
              {formatPercent(usagePercent / 100, 0)}
            </span>
          </div>
          <ProgressBar
            value={usagePercent}
            variant={bucket.status === "healthy" ? "success" : "warning"}
            className="h-2.5 bg-surface-secondary"
          />
          <p className="text-xs text-text-secondary">
            {formatPercent(usagePercent / 100, 0)} {teamsCopy.admin.revenue.ofBudget}
          </p>
        </div>

        <div className="grid gap-2">
          <MetricRow
            label={teamsCopy.admin.revenue.bucketMetrics.budget}
            value={formatTeamsUsd(bucket.budget)}
          />
          <MetricRow
            label={teamsCopy.admin.revenue.bucketMetrics.used}
            value={formatTeamsUsd(bucket.used)}
          />
          <MetricRow
            label={teamsCopy.admin.revenue.bucketMetrics.remaining}
            value={formatTeamsUsd(bucket.remaining)}
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      <p className="max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}

function InlineMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-box border border-border bg-surface px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 font-number text-base font-bold text-text-primary">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-medium text-text-primary">{value}</span>
    </div>
  );
}

function AddressCell({ address }: { address: string }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-text-primary">{formatAddress(address)}</p>
      <p className="font-number break-all text-xs text-text-secondary">{address}</p>
    </div>
  );
}

function getRetirementLabel(team: TeamRecord) {
  const effectivePeriod = team.lifecycle.retirementEffectivePeriod;

  if (team.status === "retired") {
    return effectivePeriod === null
      ? teamsCopy.admin.registry.retirement.retired
      : teamsCopy.admin.registry.retirement.period(effectivePeriod);
  }

  if (effectivePeriod === null) {
    return teamsCopy.admin.registry.retirement.active;
  }

  return teamsCopy.admin.registry.retirement.period(effectivePeriod);
}

function getBucketUsagePercent(bucket: BucketRecord) {
  const budget = Number(bucket.budget);
  const used = Number(bucket.used);

  if (!Number.isFinite(budget) || budget <= 0 || !Number.isFinite(used)) {
    return 0;
  }

  return Math.min(100, Math.max(0, (used / budget) * 100));
}
