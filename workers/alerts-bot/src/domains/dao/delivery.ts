import type { DaoVoteAction } from "./types";

/** Legacy per-log receipts cover rows, while the stable group key covers future retries. */
export async function pendingDaoVote(action: DaoVoteAction, receipts: {
  read: (id: string) => Promise<boolean>;
  mark: (id: string) => Promise<void>;
}): Promise<DaoVoteAction | null> {
  if (await receipts.read(action.eventId)) return null;
  // Collective-only transactions have no personal rows; their raw log receipts still matter.
  const ids = action.votes.length ? action.votes.map(v => v.eventId) : action.sourceEventIds;
  const sent = new Set<string>();
  for (const id of ids) if (await receipts.read(id)) sent.add(id);
  if (ids.length > 0 && sent.size === ids.length) {
    await receipts.mark(action.eventId);
    return null;
  }
  if (!sent.size) return action;
  return { ...action, votes: action.votes.filter(v => !sent.has(v.eventId)), previouslyReported: sent.size };
}
