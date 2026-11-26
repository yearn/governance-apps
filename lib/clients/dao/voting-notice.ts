import { DAO_FEED_MAX_PROPOSALS } from "@/lib/schemas/dao-feed";
import { z } from "@/lib/schemas/zod";
import { DAO_FEED_STALE_SECONDS } from "./feed";
import type { DaoSnapshot } from "./types";

const time = z.number().int().nonnegative();
export const DaoNoticePeriodsSchema = z.object({
  generatedAt: time,
  blockTimestamp: time,
  chainId: z.literal(1),
  periods: z.array(z.object({
    votingAddress: z.string().regex(/^0x[0-9a-f]{40}$/),
    startsAt: time,
    endsAt: time,
    count: z.number().int().positive().max(DAO_FEED_MAX_PROPOSALS),
  })).max(DAO_FEED_MAX_PROPOSALS),
});
export type DaoNoticePeriods = z.infer<typeof DaoNoticePeriodsSchema>;
export type DaoVotingNotice = {
  proposalCount: number;
  endsAt: number;
  multipleDeadlines: boolean;
  periodKeys: string[];
};

export function projectDaoVotingPeriods(snapshot: DaoSnapshot) {
  const periods = new Map<string, DaoNoticePeriods["periods"][number]>();
  const contracts = new Set(snapshot.contracts.map(contract => contract.votingAddress.toLowerCase()));
  for (const proposal of snapshot.proposals) {
    const votingAddress = proposal.ref.votingAddress.toLowerCase();
    if (proposal.ref.chainId !== snapshot.chainId || !contracts.has(votingAddress) ||
        proposal.protocolStatus !== "voting" || proposal.retracted || proposal.flagged ||
        proposal.vetoed || proposal.executed) continue;
    const key = [votingAddress, proposal.voteStartsAt, proposal.voteEndsAt].join(":");
    const period = periods.get(key);
    if (period) period.count++;
    else periods.set(key, { votingAddress, startsAt: proposal.voteStartsAt, endsAt: proposal.voteEndsAt, count: 1 });
  }
  return {
    generatedAt: Date.parse(snapshot.generatedAt) / 1000,
    blockTimestamp: snapshot.canonicalBlock.timestamp,
    chainId: snapshot.chainId,
    periods: [...periods.values()],
  };
}

export function activeDaoVotingNotice(
  projection: ReturnType<typeof projectDaoVotingPeriods> | undefined,
  now: number,
  mode: "mock" | "live",
): DaoVotingNotice | null {
  if (!projection || !Number.isSafeInteger(now)) return null;
  const fresh = (time: number) => time >= now - DAO_FEED_STALE_SECONDS && time <= now + 60;
  if (!fresh(projection.generatedAt) || !fresh(projection.blockTimestamp)) return null;
  const active = projection.periods.filter(period => now >= period.startsAt && now < period.endsAt);
  if (!active.length) return null;
  const endsAt = Math.min(...active.map(period => period.endsAt));
  return {
    proposalCount: active.reduce((count, period) => count + period.count, 0),
    endsAt,
    multipleDeadlines: active.some(period => period.endsAt !== endsAt),
    periodKeys: active.map(period =>
      [mode, projection.chainId, period.votingAddress, period.startsAt, period.endsAt].join(":")
    ).sort(),
  };
}

export function deriveDaoVotingNotice(snapshot: DaoSnapshot | undefined, now: number, mode: "mock" | "live") {
  return activeDaoVotingNotice(snapshot && projectDaoVotingPeriods(snapshot), now, mode);
}
