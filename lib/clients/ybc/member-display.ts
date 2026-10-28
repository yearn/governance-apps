import { formatUnits, parseUnits } from "viem";
import type { YbcRosterRecord, YbcMockDataV1, YbcGovernancePower, YbcSystemVotingPower } from "./types";

export function getYbcMemberShares(roster: YbcRosterRecord) {
  const active = roster.members.filter(member => member.status !== "removed");
  const total = active.reduce((sum, member) => sum + parseUnits(member.weight.effectiveWeight, 18), 0n);
  return { total, members: roster.members.map(member => {
    const weight = member.status === "removed" ? 0n : parseUnits(member.weight.effectiveWeight, 18);
    return { member, weight, percent: total > 0n ? Number(weight) / Number(total) * 100 : 0 };
  }) };
}
export function formatYbcShare(percent: number) {
  return percent > 0 && percent < 0.01 ? "<0.01%" : `${percent.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}
export function createMockYbcGovernancePower(data: YbcMockDataV1): YbcGovernancePower {
  const own = data.roster.members.filter(member => member.status !== "removed").reduce((sum, member) => sum + parseUnits(member.weight.rawStaked, 18), 0n);
  const previous = data.governancePower;
  const delegatedPower = previous?.delegatedPower ?? "8000";
  const collectivePower = previous?.collectivePower ?? "2000";
  return {
    ownPower: toAmount(own), delegatedPower, collectivePower,
    totalPower: toAmount(own + parseUnits(delegatedPower, 18) + parseUnits(collectivePower, 18)),
    timestamp: data.asOf,
    members: Object.fromEntries(data.roster.members.filter(member => member.status !== "removed").map(member => [member.address.toLowerCase(), {
      directPower: member.weight.rawStaked,
      exiting: previous?.members[member.address.toLowerCase()]?.exiting ?? "0",
      maturesAt: parseUnits(member.weight.rawStaked,18) > 0n && parseUnits(member.weight.effectiveWeight,18) < parseUnits(member.weight.targetWeight,18) ? member.weight.maturesAt : null,
    }])),
  };
}
const toAmount = (value: bigint) => formatUnits(value, 18);

export function createMockYbcSystemVotingPower(data: YbcMockDataV1): YbcSystemVotingPower {
  const power = createMockYbcGovernancePower(data);
  return { ownPower: power.ownPower, delegatedPower: power.delegatedPower, collectivePower: power.collectivePower, totalPower: power.totalPower, timestamp: power.timestamp, daoTotalPower: toAmount(parseUnits(power.totalPower, 18) + parseUnits("23820", 18)) };
}
