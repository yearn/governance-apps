"use client";
import { useState, type KeyboardEvent } from "react";
import type { YbcGovernancePower, YbcRosterRecord } from "@/lib/clients/ybc";
import { formatYbcShare, getYbcMemberShares } from "@/lib/clients/ybc/member-display";
import { formatDecimalAmount } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getYbcIdentity, type YbcIdentityMap } from "../identity";
import { MemberPosition } from "./MemberPosition";
import { MemberIdentity } from "./MemberIdentity";
import { YbcHelp } from "./YbcHelp";
import { ybcCopy as copy } from "../messages";

const COLORS = ["var(--color-yearn-blue)", "var(--color-blue-300)", "var(--color-neutral-500)", "var(--color-blue-800)", "var(--color-neutral-700)", "var(--color-blue-500)", "var(--color-neutral-300)"];
function sector(start: number, end: number, selected: boolean) {
  const outer = selected ? 116 : 110;
  const inner = 79;
  const point = (angle: number, radius: number) => [140 + radius * Math.cos(angle), 140 + radius * Math.sin(angle)];
  const [x1, y1] = point(start, outer); const [x2, y2] = point(end, outer);
  const [x3, y3] = point(end, inner); const [x4, y4] = point(start, inner);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
}
export function MemberDistribution({ roster, identities, power }: { roster: YbcRosterRecord; identities: YbcIdentityMap; power?: YbcGovernancePower | null }) {
  const { total, members } = getYbcMemberShares(roster);
  const [selection, setSelection] = useState<string | null>(null);
  const selected = members.find(entry => entry.member.address === selection);
  const weighted = members.filter(entry => entry.weight > 0n).sort((a, b) => a.weight === b.weight ? 0 : a.weight > b.weight ? -1 : 1);
  const arcs = weighted.map((entry, index) => {
    const precedingShare = weighted.slice(0, index).reduce((sum, member) => sum + member.percent, 0);
    const start = -Math.PI / 2 + precedingShare / 100 * Math.PI * 2;
    const end = start + entry.percent / 100 * Math.PI * 2;
    return { ...entry, start, end, color: COLORS[index % COLORS.length] };
  });
  if (total === 0n) return <div className="rounded-box border border-dashed border-border px-6 py-14 text-center">
    <h3 className="font-bold">{copy.memberOverview.emptyChart}</h3><p className="mt-2 text-sm text-text-secondary">{copy.memberOverview.emptyChartBody}</p>
  </div>;
  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <div className="min-w-0">
      <YbcHelp label={copy.memberOverview.distributionTitle}>{copy.memberOverview.distributionHelp}</YbcHelp>
      <svg viewBox="0 0 280 280" role="group" aria-label={copy.memberOverview.distributionTitle} className="mx-auto w-full max-w-[320px] overflow-visible">
        {arcs.map(arc => {
          const name = getYbcIdentity(identities, arc.member.address).label;
          const active = selection === arc.member.address;
          const props = { fill: arc.color, role: "button", tabIndex: 0, "aria-label": `${name}: ${formatYbcShare(arc.percent)} of YBC weight`, "aria-pressed": active,
            onMouseEnter: () => setSelection(arc.member.address), onFocus: () => setSelection(arc.member.address), onClick: () => setSelection(arc.member.address),
            onKeyDown: (event: KeyboardEvent<SVGElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelection(arc.member.address); } },
            className: "cursor-pointer stroke-surface stroke-2 outline-none focus-visible:stroke-text-primary",
          } as const;
          return arcs.length === 1 ? <circle key={arc.member.address} {...props} cx="140" cy="140" r="95" fill="none" stroke={arc.color} strokeWidth="31" className="cursor-pointer outline-none focus-visible:opacity-70" />
            : <path key={arc.member.address} {...props} d={sector(arc.start, arc.end, active)} />;
        })}
        <text x="140" y="137" textAnchor="middle" className="fill-text-primary font-number text-3xl font-bold">{selected ? formatYbcShare(selected.percent) : "100%"}</text>
        <text x="140" y="160" textAnchor="middle" className="fill-text-secondary text-[11px]">{copy.memberOverview.shareOfYbc}</text>
      </svg>
      <div className="space-y-1">
        {members.filter(entry => entry.member.status !== "removed").map(entry => {
          const identity = getYbcIdentity(identities, entry.member.address);
          const arc = arcs.find(arc => arc.member.address === entry.member.address);
          return <button type="button" key={entry.member.address} aria-label={`${identity.label}, ${formatYbcShare(entry.percent)}`} aria-pressed={selection === entry.member.address}
            onMouseEnter={() => setSelection(entry.member.address)} onFocus={() => setSelection(entry.member.address)} onClick={() => setSelection(entry.member.address)}
            className={cn("flex min-h-10 w-full items-center gap-3 rounded-box px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-text-primary", selection === entry.member.address ? "bg-surface-secondary" : "hover:bg-surface-secondary/60")}>
            <span className="size-2.5 shrink-0 rounded-full bg-neutral-200" style={arc ? { background: arc.color } : undefined} />
            <span className="min-w-0 flex-1 break-words font-bold">{identity.label}</span><span className="font-number tabular-nums">{formatYbcShare(entry.percent)}</span>
          </button>;
        })}
      </div>
    </div>
    <div className="min-w-0 rounded-box border border-border bg-surface p-5 lg:mt-10" aria-live="polite" aria-atomic="true">
      {selected ? <>
        <p className="mb-4 text-xs text-text-secondary">{copy.memberOverview.selection}</p>
        <MemberIdentity identity={getYbcIdentity(identities, selected.member.address)} />
        <dl className="my-5 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-border py-4">
          {[
            [copy.memberOverview.share, formatYbcShare(selected.percent)],
            [copy.memberOverview.stake, formatDecimalAmount(selected.member.weight.rawStaked, 2)],
            [copy.memberOverview.weight, formatDecimalAmount(selected.member.weight.effectiveWeight, 2)],
            [copy.memberOverview.full, formatDecimalAmount(selected.member.weight.targetWeight, 2)],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 break-words font-number text-lg font-bold">{value}</dd></div>)}
        </dl>
        <MemberPosition member={selected.member} facts={power?.members[selected.member.address.toLowerCase()]} />
      </> : <div className="py-12 text-center"><p className="font-bold">{copy.memberOverview.allMembers}</p><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-secondary">{copy.memberOverview.selectMember}</p></div>}
    </div>
  </div>;
}
