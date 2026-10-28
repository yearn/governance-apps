import { parseUnits } from "viem";
import { Badge } from "@/components/ui/Badge";
import { UtcTime } from "@/components/ui/UtcTime";
import { getYbcWeightSummary } from "@/lib/clients/ybc/weight-display";
import type { YbcGovernancePower, YbcMemberRecord } from "@/lib/clients/ybc";
import { formatDecimalAmount } from "@/lib/format";
import { Tooltip } from "@/components/ui/Tooltip";
import { ybcCopy as copy } from "../messages";

export function MemberPosition({ member, facts }: { member: YbcMemberRecord; facts?: YbcGovernancePower["members"][string] }) {
  const summary = getYbcWeightSummary(member.weight);
  const leaving = facts?.exiting !== null && facts?.exiting !== undefined && parseUnits(facts.exiting, 18) > 0n;
  const date = facts ? facts.maturesAt : summary.maturesAt;
  if (member.status === "removed") return <span className="text-xs text-text-secondary">{copy.members.states.removed}</span>;
  const label = summary.state === "empty" ? copy.members.states.noStake
    : summary.state === "below-precision" ? copy.position.belowPrecision
    : summary.state === "ramping" ? copy.position.activating
    : summary.state === "active" ? copy.position.active : copy.members.states.unavailable;
  return <div className="relative space-y-1 text-xs" data-weight-state={summary.state}>
    <div className="flex min-h-10 flex-wrap items-center gap-1.5">
      <Badge className="h-6 shrink-0 whitespace-nowrap py-0" variant={summary.state === "ramping" ? "brand" : "neutral"}>{summary.state === "ramping" ? "↑ " : ""}{label}</Badge>
      {leaving ? <Tooltip content={copy.position.leavingHelp} align="start" className="static lg:relative lg:[&>[role=tooltip]]:left-auto lg:[&>[role=tooltip]]:right-0"><button type="button" onClick={event => event.currentTarget.focus()} onKeyDown={event => { if (event.key === "Escape") event.currentTarget.blur(); }} className="inline-flex min-h-10 items-center rounded focus-visible:outline-2 focus-visible:outline-text-primary" aria-label={copy.position.leavingHelp}><Badge className="h-6 shrink-0 whitespace-nowrap py-0" variant="neutral">↓ {copy.position.leaving}</Badge></button></Tooltip> : null}
      {member.status === "pending-removal" ? <Badge className="h-6 shrink-0 whitespace-nowrap py-0" variant="warning">{copy.members.states.pendingRemoval}</Badge> : null}
    </div>
    <div className="min-h-8 space-y-0.5">
    {summary.state === "ramping" ? <p className="text-text-secondary">{date ? <>{facts ? copy.position.fullOn : copy.position.estimatedFullOn} <UtcTime timestamp={date} format="date" /></> : copy.position.dateUnavailable}</p> : null}
    {leaving ? <p className="font-number text-text-secondary">{formatDecimalAmount(facts!.exiting!, 2)} {copy.position.leavingAmount}</p> : null}
    {facts?.exiting == null ? <p className="text-text-secondary">{copy.memberOverview.unknownQueue}</p> : null}
    {summary.state === "empty" && !leaving ? <p className="text-text-secondary">{copy.position.empty}</p> : null}
    </div>
  </div>;
}
