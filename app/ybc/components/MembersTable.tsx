"use client";

import { useState } from "react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { usePersistentViewToggle } from "@/components/ui/usePersistentViewToggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import type { YbcMemberRecord, YbcRosterRecord } from "@/lib/clients/ybc";
import { getYbcMemberDisplayState, getYbcWeightSummary } from "@/lib/clients/ybc/weight-display";
import { formatDecimalAmount } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getYbcIdentity, type YbcIdentityMap } from "../identity";
import type { YbcMemberAliases } from "../memberAliases";
import type { YbcMemberAliasMutationResult } from "../useYbcMemberAliases";
import { MemberIdentity } from "./MemberIdentity";
import { MemberWeightProgress } from "./MemberWeightProgress";
import { ybcCopy as copy } from "../messages";

type AliasActions = {
  onResetAlias: (address: string) => YbcMemberAliasMutationResult;
  onSetAlias: (address: string, alias: string) => YbcMemberAliasMutationResult;
};
type MembersTableProps = AliasActions & {
  aliases: YbcMemberAliases;
  identities: YbcIdentityMap;
  roster: YbcRosterRecord;
  currentAddress?: string | null;
  onClearAliases: () => YbcMemberAliasMutationResult;
};
type MemberProps = AliasActions & {
  alias?: string;
  identity: ReturnType<typeof getYbcIdentity>;
  member: YbcMemberRecord;
  isCurrentMember: boolean;
};

const MEMBERS_VIEW_STORAGE_KEY = "yearn.ybc.members.view";

export function MembersTable({ aliases, identities, roster, currentAddress, onClearAliases, onResetAlias, onSetAlias }: MembersTableProps) {
  const [viewMode, setViewMode] = usePersistentViewToggle(MEMBERS_VIEW_STORAGE_KEY, "audit");
  const [aliasControlError, setAliasControlError] = useState<string | null>(null);
  const hasAliases = Object.keys(aliases).length > 0;
  const activeMembers = roster.members.filter((member) => member.status !== "removed");
  const noStakes = activeMembers.length > 0 && activeMembers.every((member) => getYbcWeightSummary(member.weight).state === "empty");
  const memberProps = (member: YbcMemberRecord): MemberProps => ({
    member,
    alias: aliases[member.address.toLowerCase()],
    identity: getYbcIdentity(identities, member.address),
    isCurrentMember: !!currentAddress && currentAddress.toLowerCase() === member.address.toLowerCase(),
    onResetAlias,
    onSetAlias,
  });

  return (
    <section id="members" className="scroll-mt-24 space-y-5">
      <div className="space-y-2">
        <h2 className="text-balance text-2xl font-bold">{copy.members.title}</h2>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">{copy.members.description}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 lg:grid-cols-4">
        {[
          [copy.members.totals.rawStaked, `${formatDecimalAmount(roster.totals.rawStaked, 2)} YFI`],
          [copy.members.totals.effectiveWeight, `${formatDecimalAmount(roster.totals.effectiveWeight, 2)} weight`],
          [copy.members.totals.targetWeight, `${formatDecimalAmount(roster.totals.targetWeight, 2)} weight`],
          [copy.members.totals.rampingMembers, roster.totals.rampingMemberCount.toLocaleString("en-US")],
        ].map(([label, value]) => <div key={label} className="min-w-0 space-y-1">
          <dt className="text-xs text-text-secondary">{label}</dt>
          <dd className="break-words font-number text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{value}</dd>
        </div>)}
      </dl>
      {roster.members.length === 0 ? (
        <Card className="space-y-2 shadow-none">
          <h3 className="text-lg font-bold">{copy.members.states.emptyTitle}</h3>
          <p className="text-sm leading-6 text-text-secondary">{copy.members.states.emptyBody}</p>
        </Card>
      ) : <>
        {noStakes ? <div className="rounded-box border border-border bg-surface-secondary p-4">
          <h3 className="text-sm font-bold">{copy.members.states.noStakesTitle}</h3>
          <p className="mt-1 text-sm text-text-secondary">{copy.members.states.noStakesBody}</p>
        </div> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs leading-5 text-text-secondary">{copy.members.states.activationHelp}</p>
          <div className="flex flex-wrap items-center gap-2">
            {hasAliases ? <Button type="button" size="sm" variant="ghost" onClick={async () => {
              const result = await onClearAliases();
              setAliasControlError(result === "saved" ? null : copy.members.alias.storageError);
            }}>{copy.members.alias.clearAll}</Button> : null}
            <ViewToggle aria-label="YBC roster view" value={viewMode} onChange={setViewMode} />
          </div>
        </div>
        {aliasControlError ? <p className="text-sm text-error-700" role="alert">{aliasControlError}</p> : null}
        {viewMode === "visual" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roster.members.map((member) => <MemberCard key={member.address} {...memberProps(member)} />)}
        </div> : <Card className="overflow-hidden p-0 shadow-none">
          <Table aria-label={copy.members.title} className="block lg:table">
            <TableHeader className="hidden lg:table-header-group">
              <TableRow>
                <TableHead>{copy.members.columns.member}</TableHead>
                <TableHead>{copy.members.columns.status}</TableHead>
                <TableHead className="text-right">{copy.members.columns.rawStaked}</TableHead>
                <TableHead className="text-right">{copy.members.columns.effectiveWeight}</TableHead>
                <TableHead className="text-right">{copy.members.columns.targetWeight}</TableHead>
                <TableHead>{copy.members.columns.maturity}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="block lg:table-row-group">
              {roster.members.map((member) => <MemberRow key={member.address} {...memberProps(member)} />)}
            </TableBody>
          </Table>
        </Card>}
      </>}
    </section>
  );
}

export function MembersTableSkeleton() {
  return <section id="members" className="space-y-5">
    <Skeleton className="h-8 w-72" /><Skeleton className="h-5 w-full max-w-xl" />
    <Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" />
  </section>;
}

function MemberStatus({ member }: { member: YbcMemberRecord }) {
  const state = getYbcMemberDisplayState(member);
  const states = copy.members.states;
  const label = { empty: states.noStake, unavailable: states.unavailable, active: states.active, ramping: states.ramping, "pending-removal": states.pendingRemoval, removed: states.removed }[state];
  const variant: BadgeProps["variant"] = state === "ramping" ? "brand" : state === "pending-removal" ? "warning" : "neutral";
  return <Badge variant={variant} className={cn("max-w-full text-center", state === "ramping" ? "dark:bg-blue-950 dark:text-blue-200" : state !== "pending-removal" && "bg-surface-secondary text-text-secondary")}>{label}</Badge>;
}

function MemberRow({ member, ...props }: MemberProps) {
  const muted = getYbcWeightSummary(member.weight).state === "empty" || member.status === "removed";
  return (
    <TableRow data-member-address={member.address} className={cn("grid grid-cols-3 lg:table-row", muted ? "bg-surface-secondary/50" : props.isCurrentMember && "bg-yearn-blue/[0.04]")}>
      <TableCell className="col-span-2 min-w-0 p-3 lg:p-4"><MemberIdentity {...props} /></TableCell>
      <TableCell className="min-w-0 p-3 text-right lg:p-4 lg:text-left"><MemberStatus member={member} /></TableCell>
      {(["rawStaked", "effectiveWeight", "targetWeight"] as const).map((key) => <TableCell key={key} className={cn("min-w-0 px-3 py-2 font-number tabular-nums lg:p-4 lg:text-right", muted && "text-text-secondary")}>
        <span className="mb-1 block font-sans text-[11px] text-text-secondary lg:hidden">{copy.members.columns[key]}</span>
        <span className="break-words font-bold [overflow-wrap:anywhere]">{formatDecimalAmount(member.weight[key], 2)}</span>
      </TableCell>)}
      <TableCell className="col-span-3 min-w-0 p-3 lg:w-72 lg:min-w-56 lg:p-4"><MemberWeightProgress weight={member.weight} removed={member.status === "removed"} /></TableCell>
    </TableRow>
  );
}

function MemberCard({ member, ...props }: MemberProps) {
  const muted = getYbcWeightSummary(member.weight).state === "empty" || member.status === "removed";
  return (
    <Card data-member-address={member.address} data-state={props.isCurrentMember ? "current" : undefined} className={cn("flex min-w-0 flex-col gap-4 p-4 shadow-none", muted && "bg-surface-secondary/50")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1"><MemberIdentity {...props} /></div>
        <MemberStatus member={member} />
      </div>
      <dl className={cn("grid grid-cols-3 gap-3 border-t border-border pt-4", muted && "text-text-secondary")}>
        {(["rawStaked", "effectiveWeight", "targetWeight"] as const).map((key) => <div key={key} className="min-w-0 space-y-1">
          <dt className="text-xs text-text-secondary">{copy.members.columns[key]}</dt>
          <dd className="break-words font-number text-sm font-bold tabular-nums [overflow-wrap:anywhere]">{formatDecimalAmount(member.weight[key], 2)}</dd>
        </div>)}
      </dl>
      <div className="mt-auto border-t border-border pt-4"><MemberWeightProgress weight={member.weight} removed={member.status === "removed"} /></div>
    </Card>
  );
}
