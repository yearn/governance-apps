"use client";
import { useState } from "react";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { usePersistentViewToggle } from "@/components/ui/usePersistentViewToggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import type { YbcGovernancePower, YbcRosterRecord } from "@/lib/clients/ybc";
import { formatYbcShare, getYbcMemberShares } from "@/lib/clients/ybc/member-display";
import { formatDecimalAmount } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getYbcIdentity, type YbcIdentityMap } from "../identity";
import type { YbcMemberAliases } from "../memberAliases";
import type { YbcMemberAliasMutationResult } from "../useYbcMemberAliases";
import { MemberIdentity } from "./MemberIdentity";
import { MemberPosition } from "./MemberPosition";
import { MemberDistribution } from "./MemberDistribution";
import { YbcHelp } from "./YbcHelp";
import { ybcCopy as copy } from "../messages";

type MembersTableProps = {
  aliases: YbcMemberAliases; identities: YbcIdentityMap; roster: YbcRosterRecord; currentAddress?: string | null; power?: YbcGovernancePower | null;
  onClearAliases: () => YbcMemberAliasMutationResult;
  onResetAlias: (address: string) => YbcMemberAliasMutationResult;
  onSetAlias: (address: string, alias: string) => YbcMemberAliasMutationResult;
};
export function MembersTable({ aliases, identities, roster, currentAddress, power, onClearAliases, onResetAlias, onSetAlias }: MembersTableProps) {
  const [viewMode, setViewMode] = usePersistentViewToggle("yearn.ybc.members.view", "audit");
  const [aliasError, setAliasError] = useState<string | null>(null);
  const { members } = getYbcMemberShares(roster);
  return <section id="members" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold">{copy.memberOverview.title}</h2><p className="mt-1 text-sm text-text-secondary">{copy.memberOverview.description}</p></div>
      <ViewToggle className="max-w-full flex-wrap" aria-label="YBC roster view" value={viewMode} onChange={setViewMode} options={[{value:"audit",label:copy.memberOverview.table},{value:"visual",label:copy.memberOverview.distribution}]} />
    </div>
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <dl className="flex flex-wrap gap-x-10 gap-y-2">
        <div><dt><YbcHelp label={copy.memberOverview.totalStake}>{copy.memberOverview.stakeHelp}</YbcHelp></dt><dd className="font-number text-lg font-bold">{formatDecimalAmount(roster.totals.rawStaked, 2)} YFI</dd></div>
        <div><dt><YbcHelp label={copy.memberOverview.totalWeight} align="end">{copy.memberOverview.weightHelp}</YbcHelp></dt><dd className="font-number text-lg font-bold">{formatDecimalAmount(roster.totals.effectiveWeight, 2)}</dd></div>
      </dl>
      {Object.keys(aliases).length > 0 ? <Button type="button" size="sm" variant="ghost" onClick={async () => { const result = await onClearAliases(); setAliasError(result === "saved" ? null : copy.members.alias.storageError); }}>{copy.members.alias.clearAll}</Button> : null}
    </div>
    <div className="flex justify-between gap-4 lg:hidden">
      <YbcHelp label={copy.memberOverview.share}>{copy.memberOverview.shareHelp}</YbcHelp>
      <YbcHelp label={copy.memberOverview.position} align="end">{copy.memberOverview.positionHelp}</YbcHelp>
    </div>
    {aliasError ? <p role="alert" className="text-sm text-error-700">{aliasError}</p> : null}
    {roster.members.length === 0 ? <div className="py-12"><h3 className="font-bold">{copy.members.states.emptyTitle}</h3><p className="mt-2 text-sm text-text-secondary">{copy.members.states.emptyBody}</p></div>
      : viewMode === "visual" ? <MemberDistribution roster={roster} identities={identities} power={power} />
      : <Table aria-label={copy.memberOverview.title} className="block lg:table">
        <TableHeader className="hidden lg:table-header-group"><TableRow>
          <TableHead>{copy.members.columns.member}</TableHead>
          <TableHead className="text-right"><YbcHelp label={copy.memberOverview.stake}>{copy.memberOverview.stakeHelp}</YbcHelp></TableHead>
          <TableHead className="text-right"><YbcHelp label={copy.memberOverview.weight}>{copy.memberOverview.weightHelp}</YbcHelp></TableHead>
          <TableHead className="text-right"><YbcHelp label={copy.memberOverview.share} align="end">{copy.memberOverview.shareHelp}</YbcHelp></TableHead>
          <TableHead><YbcHelp label={copy.memberOverview.position} align="end">{copy.memberOverview.positionHelp}</YbcHelp></TableHead>
        </TableRow></TableHeader>
        <TableBody className="block lg:table-row-group">{members.map(({ member, percent }) => {
          const current = !!currentAddress && currentAddress.toLowerCase() === member.address.toLowerCase();
          const empty = parseUnits(member.weight.rawStaked, 18) === 0n || member.status === "removed";
          const activating = parseUnits(member.weight.effectiveWeight, 18) < parseUnits(member.weight.targetWeight, 18);
          return <TableRow key={member.address} data-member-address={member.address} className={cn("grid grid-cols-[repeat(auto-fit,minmax(min(100%,max(6rem,calc(100%/3))),1fr))] lg:table-row lg:h-28", empty ? "bg-surface-secondary/40 text-text-secondary" : current && "bg-yearn-blue/[0.04]")}>
            <TableCell className="col-span-full min-w-0 px-3 py-3 lg:w-[32%]"><MemberIdentity identity={getYbcIdentity(identities, member.address)} alias={aliases[member.address.toLowerCase()]} isCurrentMember={current} onResetAlias={onResetAlias} onSetAlias={onSetAlias} /></TableCell>
            <TableCell className="min-w-0 px-3 py-3 font-number lg:text-right"><span className="mb-1 block font-sans text-[11px] text-text-secondary lg:hidden">{copy.memberOverview.stake}</span><span className="break-words font-bold">{formatDecimalAmount(member.weight.rawStaked, 2)}</span></TableCell>
            <TableCell className="min-w-0 px-3 py-3 font-number lg:text-right"><span className="mb-1 block font-sans text-[11px] text-text-secondary lg:hidden">{copy.memberOverview.weight}</span><span className="break-words font-bold">{formatDecimalAmount(member.weight.effectiveWeight, 2)}</span>{activating && !empty ? <span className="mt-1 block text-[11px] text-text-secondary">→ {formatDecimalAmount(member.weight.targetWeight, 2)}</span> : null}</TableCell>
            <TableCell className="min-w-0 px-3 py-3 font-number lg:text-right"><span className="mb-1 block font-sans text-[11px] text-text-secondary lg:hidden">{copy.memberOverview.share}</span><span className="font-bold">{formatYbcShare(percent)}</span></TableCell>
            <TableCell className="col-span-full min-w-0 px-3 py-3 lg:w-64"><MemberPosition member={member} facts={power?.members[member.address.toLowerCase()]} /></TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>}
  </section>;
}
export function MembersTableSkeleton() {
  return <section id="members" className="space-y-5"><Skeleton className="h-8 w-56 max-w-full" /><Skeleton className="h-64 w-full" /></section>;
}
