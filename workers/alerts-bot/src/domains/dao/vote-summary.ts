import type { RpcBlock } from "../../rpc";
import type { DaoVoteAction, DaoVoteTally, RawDaoVoteAction } from "./types";

type CollectiveAccounts = { ybc: string; delegated: string };
type Read = (hash: string, names: readonly string[], args: readonly (readonly unknown[])[]) => Promise<unknown[]>;
type Contribution = { votes: bigint; yea: bigint };
const zero = (): Contribution => ({ votes: 0n, yea: 0n });
const serialize = (p: Contribution): DaoVoteTally => ({ votes: String(p.votes), yea: String(p.yea) });
const key = (id: string, account: string) => `${id}:${account}`;

function contribution(votes: unknown, yea: unknown): Contribution {
  const value = { votes: BigInt(String(votes)), yea: BigInt(String(yea)) };
  if (value.yea < 0n || value.votes < value.yea) throw new Error("dao_vote_history_invalid");
  return value;
}
function fromEvent(vote: RawDaoVoteAction): Contribution {
  const votes = BigInt(vote.weight);
  return { votes, yea: votes * BigInt(vote.supportBps) / 10_000n };
}
function combined(left: Contribution, right: Contribution): DaoVoteTally {
  return serialize({ votes: left.votes + right.votes, yea: left.yea + right.yea });
}

/** Group on immutable log identity, independently of optional role/history reads. */
export async function buildDaoVoteActions(params: {
  votes: readonly RawDaoVoteAction[];
  block: RpcBlock;
  collectiveAccounts: CollectiveAccounts | null;
  newProposalIds: ReadonlySet<string>;
  read: Read;
}): Promise<DaoVoteAction[]> {
  const { votes, collectiveAccounts: roles, block, read } = params;
  const groups = new Map<string, RawDaoVoteAction[]>();
  for (const vote of votes) {
    const id = `dao:${vote.txHash}:${vote.proposal.id}:vote-group:v1`;
    const group = groups.get(id) ?? [];
    group.push(vote);
    groups.set(id, group);
  }
  const isCollective = (v: RawDaoVoteAction) => roles !== null && (v.account === roles.ybc || v.account === roles.delegated);
  const actions = [...groups].map(([eventId, group]): DaoVoteAction => {
    const first = group[0]!;
    const ybc = roles && group.findLast(v => v.account === roles.ybc);
    const delegated = roles && group.findLast(v => v.account === roles.delegated);
    return {
      domainId: first.domainId, kind: first.kind, event: "vote", eventId,
      blockNumber: first.blockNumber, blockHash: first.blockHash, logIndex: first.logIndex,
      txHash: first.txHash, source: first.source, timestamp: first.timestamp,
      proposal: first.proposal, configuration: first.configuration,
      votes: group.filter(v => !isCollective(v)).map(({ account, weight, supportBps, eventId }) => ({ account, weight, supportBps, eventId })),
      sourceEventIds: group.map(v => v.eventId), rolesVerified: roles !== null,
      collectiveUpdated: group.some(isCollective), tally: null,
      collective: ybc && delegated ? { before: null, after: combined(fromEvent(ybc), fromEvent(delegated)) } : null,
    };
  });
  if (!actions.length) return actions;

  // Optional history cannot prevent delivery of confirmed log facts and final block totals.
  try {
    const proposals = new Map(votes.map(v => [v.proposal.id, v.proposal]));
    const existingIds = [...proposals.keys()].filter(id => !params.newProposalIds.has(id));
    const previous = await read(block.parentHash, existingIds.map(() => "proposals"), existingIds.map(id => [BigInt(id)]));
    const totals = new Map<string, Contribution>([...proposals.keys()].map(id => [id, zero()]));
    existingIds.forEach((id, i) => {
      const value = previous[i] as { votes: bigint; yea: bigint };
      totals.set(id, contribution(value.votes, value.yea));
    });
    const accounts = new Map(votes.map(v => [key(v.proposal.id, v.account), { id: v.proposal.id, account: v.account }]));
    if (roles) for (const id of proposals.keys()) for (const account of [roles.ybc, roles.delegated]) accounts.set(key(id, account), { id, account });
    const existingAccounts = [...accounts.values()].filter(a => !params.newProposalIds.has(a.id));
    const recorded = await read(block.parentHash, existingAccounts.map(() => "votes"), existingAccounts.map(a => [a.account, BigInt(a.id)]));
    const contributions = new Map<string, Contribution>([...accounts.keys()].map(k => [k, zero()]));
    existingAccounts.forEach((a, i) => {
      const [weight, yea] = recorded[i] as readonly [bigint, bigint];
      contributions.set(key(a.id, a.account), contribution(weight, yea));
    });
    const collective = (id: string) => roles ? combined(contributions.get(key(id, roles.ybc))!, contributions.get(key(id, roles.delegated))!) : null;
    const enriched = actions.map(action => {
      const id = action.proposal.id;
      const before = serialize(totals.get(id)!);
      const collectiveBefore = collective(id);
      for (const vote of groups.get(action.eventId)!) {
        const k = key(id, vote.account);
        const old = contributions.get(k)!;
        const next = fromEvent(vote);
        const total = totals.get(id)!;
        totals.set(id, contribution(total.votes - old.votes + next.votes, total.yea - old.yea + next.yea));
        contributions.set(k, next);
      }
      const after = serialize(totals.get(id)!);
      const collectiveAfter = collective(id);
      return { ...action, tally: { before, after },
        collective: action.collectiveUpdated && collectiveAfter ? { before: collectiveBefore, after: collectiveAfter } : null };
    });
    // Reject incomplete histories before attaching any transaction-level delta.
    for (const [id, expected] of proposals) {
      const actual = totals.get(id)!;
      if (actual.votes !== BigInt(expected.votes) || actual.yea !== BigInt(expected.yea)) throw new Error("dao_vote_history_mismatch");
    }
    return enriched;
  } catch {
    console.warn("dao_vote_history_unavailable");
    return actions;
  }
}
