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
import { formatAddress, formatPercent } from "@/lib/format";
import type { YbcMemberRecord, YbcRosterRecord } from "@/lib/clients/ybc";
import { ybcCopy as copy } from "../messages";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type MembersTableProps = {
  roster: YbcRosterRecord;
  currentAddress?: string | null;
};

export function MembersTable({ roster, currentAddress }: MembersTableProps) {
  return (
    <section id="members" className="container mx-auto space-y-6 px-4 py-10 md:px-6 md:py-14">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-bold uppercase text-text-tertiary">
            {copy.sections[1].label}
          </p>
          <h2 className="text-3xl font-bold">{copy.members.title}</h2>
          <p className="max-w-3xl text-sm leading-6 text-text-secondary md:text-base">
            {copy.members.description}
          </p>
        </div>
        <Badge variant={roster.totals.rampingMemberCount > 0 ? "warning" : "success"}>
          {`${roster.totals.rampingMemberCount.toLocaleString("en-US")} ${copy.members.totals.rampingMembers.toLowerCase()}`}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TotalCard
          label={copy.members.totals.rawStaked}
          value={`${formatAmount(roster.totals.rawStaked)} YFI`}
        />
        <TotalCard
          label={copy.members.totals.effectiveWeight}
          value={`${formatAmount(roster.totals.effectiveWeight)} weight`}
        />
        <TotalCard
          label={copy.members.totals.targetWeight}
          value={`${formatAmount(roster.totals.targetWeight)} weight`}
        />
        <TotalCard
          label={copy.members.totals.rampingMembers}
          value={roster.totals.rampingMemberCount.toLocaleString("en-US")}
        />
      </div>

      {roster.members.length === 0 ? (
        <Card className="space-y-3">
          <h3 className="text-xl font-bold">{copy.members.states.emptyTitle}</h3>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {copy.members.states.emptyBody}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{copy.members.columns.member}</TableHead>
                <TableHead>{copy.members.columns.status}</TableHead>
                <TableHead className="text-right">{copy.members.columns.rawStaked}</TableHead>
                <TableHead className="text-right">
                  {copy.members.columns.effectiveWeight}
                </TableHead>
                <TableHead className="text-right">{copy.members.columns.targetWeight}</TableHead>
                <TableHead>{copy.members.columns.maturity}</TableHead>
                <TableHead>{copy.members.columns.sourceMix}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.members.map((member) => (
                <MemberRow
                  key={member.address}
                  member={member}
                  isCurrentMember={
                    !!currentAddress &&
                    currentAddress.toLowerCase() === member.address.toLowerCase()
                  }
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  );
}

export function MembersTableSkeleton() {
  return (
    <section id="members" className="container mx-auto space-y-6 px-4 py-10 md:px-6 md:py-14">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-16 w-full max-w-3xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Card className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </Card>
    </section>
  );
}

function MemberRow({
  member,
  isCurrentMember,
}: {
  member: YbcMemberRecord;
  isCurrentMember: boolean;
}) {
  const maturityPercent = member.weight.maturityBps / 100;

  return (
    <TableRow className={isCurrentMember ? "bg-yearn-blue/[0.04]" : undefined}>
      <TableCell>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-text-primary">
              {member.ens ?? formatAddress(member.address)}
            </span>
            {isCurrentMember ? (
              <Badge variant="brand">{copy.members.states.you}</Badge>
            ) : null}
          </div>
          <p className="font-number text-xs text-text-secondary">
            {formatAddress(member.address)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariantMap[member.status]}>
          {statusLabelMap[member.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-number font-bold">
        {formatAmount(member.weight.rawStaked)}
      </TableCell>
      <TableCell className="text-right font-number font-bold">
        {formatAmount(member.weight.effectiveWeight)}
      </TableCell>
      <TableCell className="text-right font-number font-bold">
        {formatAmount(member.weight.targetWeight)}
      </TableCell>
      <TableCell>
        <div className="min-w-40 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase text-text-tertiary">
              {formatPercent(member.weight.maturityBps / 10_000, 0)}
            </span>
            <span className="text-xs text-text-secondary">
              {member.weight.maturesAt
                ? `${copy.members.states.maturesOn} ${DATE_FORMATTER.format(
                    member.weight.maturesAt * 1000
                  )}`
                : copy.members.states.fullyMatured}
            </span>
          </div>
          <ProgressBar value={maturityPercent} className="h-2.5 bg-surface-secondary" />
        </div>
      </TableCell>
      <TableCell>
        <ul className="space-y-1 text-xs text-text-secondary">
          {getSourceMix(member).map((source) => (
            <li key={source.label}>
              <span className="font-bold text-text-primary">{source.value}</span>{" "}
              {source.label}
            </li>
          ))}
        </ul>
      </TableCell>
    </TableRow>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-surface">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-text-tertiary">{label}</p>
        <p className="font-number text-2xl font-bold text-text-primary">{value}</p>
      </div>
    </Card>
  );
}

function getSourceMix(member: YbcMemberRecord) {
  return [
    { label: "stYFI", value: member.sources.stYFI },
    { label: "stYFIx", value: member.sources.stYFIx },
    { label: "migrated veYFI", value: member.sources.migratedVeYfi },
  ]
    .filter((source) => Number(source.value) > 0)
    .map((source) => ({
      ...source,
      value: formatAmount(source.value),
    }));
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

const statusVariantMap = {
  active: "success",
  ramping: "warning",
  "pending-removal": "error",
  removed: "neutral",
} as const;

const statusLabelMap = {
  active: copy.members.states.active,
  ramping: copy.members.states.ramping,
  "pending-removal": copy.members.states.pendingRemoval,
  removed: copy.members.states.removed,
} as const;
