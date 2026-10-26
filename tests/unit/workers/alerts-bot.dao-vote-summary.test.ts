import { describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/dao-vote-crossing.json";
import { buildDaoVoteActions } from "@/workers/alerts-bot/src/domains/dao/vote-summary";
import { pendingDaoVote } from "@/workers/alerts-bot/src/domains/dao/delivery";
import { approval, approvalBar, approvalChange, thresholdStatus } from "@/workers/alerts-bot/src/domains/dao/vote-display";
import { renderDaoAlert } from "@/workers/alerts-bot/src/domains/dao/renderer";
import type { RawDaoVoteAction, DaoVoteAction, DaoVoteTally } from "@/workers/alerts-bot/src/domains/dao/types";
import { ACCOUNT, GUARDIAN, collectiveAccounts, configuration, daoAction, hash, proposal, voteStart } from "./alerts-bot.dao-fixtures";

const block = { number: 100, hash: hash(100), parentHash: hash(99), timestamp: voteStart + 12 };
function raw(account: string, weight: string, supportBps: number, index = 0, tx: string = hash(999), id = "0", final = { votes: "10", yea: "6" }): RawDaoVoteAction {
  return {
    domainId: "dao", kind: "dao_proposal", event: "vote", eventId: `dao:${tx}:${index}:Vote`,
    blockNumber: block.number, blockHash: block.hash, logIndex: index, txHash: tx,
    source: { kind: "onchain", txHash: tx, logIndex: index }, timestamp: block.timestamp,
    proposal: { ...proposal, ...final, id }, configuration, account, weight, supportBps,
  };
}
const readHistory = (initial: DaoVoteTally, old: Record<string, readonly [bigint, bigint]> = {}) => vi.fn(
  async (_hash: string, names: readonly string[], args: readonly (readonly unknown[])[]) =>
    names.map((name, i) => name === "proposals" ? { votes: BigInt(initial.votes), yea: BigInt(initial.yea) } : old[String(args[i]![0])] ?? [0n, 0n]),
);
async function groups(votes: RawDaoVoteAction[], read = readHistory({ votes: "0", yea: "0" }), roles: typeof collectiveAccounts | null = collectiveAccounts, newProposalIds = new Set<string>()) {
  return buildDaoVoteActions({ votes, block, collectiveAccounts: roles, read, newProposalIds });
}
function example(): DaoVoteAction {
  const a = daoAction("vote");
  if (a.kind !== "dao_proposal" || a.event !== "vote") throw new Error("missing fixture");
  return a;
}

describe("DAO vote replay", () => {
  it("replays the real gov-apps-stats threshold crossing without double-counting collectives", async () => {
    const old = Object.fromEntries(fixture.previousContributions.map(v => [v.account, [BigInt(v.weight), BigInt(v.yea)] as const]));
    const read = readHistory(fixture.before, old);
    const votes = fixture.events.map(v => ({
      ...raw(v.account, v.weight, Number(v.yea), v.log.logIndex, fixture.transactionHash, fixture.proposalId, fixture.after),
      timestamp: fixture.block.timestamp, blockNumber: Number(fixture.block.blockNumber), blockHash: fixture.block.blockHash,
      proposal: { ...proposal, ...fixture.after, epoch: 17 },
    }));
    const result = await groups(votes, read);
    expect(result).toHaveLength(1);
    expect(result[0]!.tally).toEqual({ before: fixture.before, after: fixture.after });
    expect(result[0]!.votes).toHaveLength(1);
    expect(approval(result[0]!.collective!.before!)).toBe("100%");
    // The absolute FOR contributions are individually truncated by Voting.
    expect(approval(result[0]!.collective!.after)).toBe("22.55%");
    const html = renderDaoAlert(result[0]!, { title: "Historical vote example", summary: "", discussionUrl: null });
    expect(html).toContain("100% → 31.25%");
    expect(html).toContain("Below threshold");
    expect(html).toContain("YBC vote (includes stYFIx)");
    expect(html).toMatchSnapshot();
    expect(read.mock.calls.every(([h]) => h === block.parentHash)).toBe(true);
  });

  it("chains separate transactions within one block and replaces a prior contribution", async () => {
    const final = { votes: "12", yea: "7" };
    const result = await groups([
      raw(ACCOUNT, "7", 10_000, 0, hash(11), "0", final),
      raw(GUARDIAN, "5", 0, 1, hash(12), "0", final),
    ], readHistory({ votes: "3", yea: "0" }, { [ACCOUNT]: [3n, 0n] }));
    expect(result.map(a => a.tally)).toEqual([
      { before: { votes: "3", yea: "0" }, after: { votes: "7", yea: "7" } },
      { before: { votes: "7", yea: "7" }, after: final },
    ]);
  });

  it("replaces repeated accounts within one transaction with integer split rounding", async () => {
    const final = { votes: "7", yea: "4" };
    const result = await groups([raw(ACCOUNT, "5", 10_000, 0, hash(11), "0", final), raw(ACCOUNT, "7", 6_000, 1, hash(11), "0", final)]);
    expect(result[0]!.tally).toEqual({ before: { votes: "0", yea: "0" }, after: final });
    expect(result[0]!.votes).toHaveLength(2);
  });

  it("starts new proposals at zero without reading nonexistent parent storage", async () => {
    const final = { votes: "5", yea: "5" };
    const read = readHistory({ votes: "123", yea: "123" });
    const result = await groups([raw(ACCOUNT, "5", 10_000, 0, hash(11), "9", final)], read, collectiveAccounts, new Set(["9"]));
    expect(result[0]!.tally?.before).toEqual({ votes: "0", yea: "0" });
    expect(read.mock.calls.every(([, names]) => names.length === 0)).toBe(true);
  });

  it.each(["unavailable", "mismatch"])("drops all transaction changes when history is %s", async failure => {
    const votes = [raw(ACCOUNT, "3", 10_000)];
    const read = readHistory({ votes: "0", yea: "0" });
    if (failure === "unavailable") read.mockRejectedValueOnce(new Error("offline"));
    const result = await groups(votes, read);
    expect(result[0]!.tally).toBeNull();
    expect(result[0]!.votes).toHaveLength(1);
    expect(result[0]!.eventId).toBe(`dao:${hash(999)}:0:vote-group:v1`);
    const html = renderDaoAlert(result[0]!);
    expect(html).toContain("Approval at end of block");
    expect(html).not.toContain("Transaction approval");
  });

  it("keeps group identities stable when role and history reads recover", async () => {
    const final = { votes: "10", yea: "10" };
    const votes = [raw(ACCOUNT, "2", 10_000, 0, hash(11), "0", final), raw(collectiveAccounts.ybc, "8", 10_000, 1, hash(11), "0", final)];
    const unknown = await groups(votes, readHistory({ votes: "0", yea: "0" }), null);
    const known = await groups(votes);
    expect(unknown[0]!.eventId).toBe(known[0]!.eventId);
    expect(unknown[0]!.votes).toHaveLength(2);
    expect(known[0]!.votes).toHaveLength(1);
  });
});

describe("DAO vote delivery migration", () => {
  it("filters only previously delivered personal rows and seals a fully delivered legacy group", async () => {
    const action = { ...example(), votes: [
      { ...example().votes[0]!, eventId: "old:1" }, { ...example().votes[0]!, account: GUARDIAN, eventId: "old:2" },
    ], sourceEventIds: ["old:1", "old:collective", "old:2"] };
    const sent = new Set(["old:1"]);
    const receipts = { read: async (id: string) => sent.has(id), mark: async (id: string) => { sent.add(id); } };
    const pending = await pendingDaoVote(action, receipts);
    expect(pending?.votes.map(v => v.eventId)).toEqual(["old:2"]);
    expect(renderDaoAlert(pending!)).toContain("Totals cover the whole transaction");
    sent.add("old:2");
    expect(await pendingDaoVote(action, receipts)).toBeNull();
    expect(sent.has(action.eventId)).toBe(true);
    expect(await pendingDaoVote({ ...action, rolesVerified: false, votes: [{ ...action.votes[0]!, eventId: "old:collective" }] }, receipts)).toBeNull();
  });

  it("does not silently consume a collective-only group with no legacy receipts", async () => {
    const action = { ...example(), votes: [], sourceEventIds: ["collective"] };
    const receipts = { read: async () => false, mark: vi.fn() };
    expect(await pendingDaoVote(action, receipts)).toEqual(action);
    expect(receipts.mark).not.toHaveBeenCalled();
  });
});

describe("DAO vote display", () => {
  it.each([0, 5_000, 6_000, 10_000])("marks the stored threshold %s", threshold => {
    const bar = approvalBar({ votes: "100", yea: "60" }, threshold);
    expect(bar.split("\n")[1]!.indexOf("│")).toBe(Math.round(threshold / 500));
    expect(bar).toContain(`required ${threshold / 100}%`);
  });
  it("uses exact status at threshold boundaries and no-vote state", () => {
    expect(thresholdStatus({ votes: "0", yea: "0" }, 0)).toBe("No votes yet");
    expect(thresholdStatus({ votes: "2", yea: "1" }, 5_000)).toContain("At threshold");
    expect(thresholdStatus({ votes: "100000", yea: "49999" }, 5_000)).toContain("Below threshold · <0.01 pp");
    expect(thresholdStatus({ votes: "100000", yea: "50001" }, 5_000)).toContain("Currently passing · <0.01 pp");
    expect(approval({ votes: "100001", yea: "1" })).toBe("<0.01%");
    expect(approval({ votes: "100001", yea: "100000" })).toBe(">99.99%");
    expect(approvalChange({ votes: "0", yea: "0" }, { votes: "2", yea: "1" })).toBe("");
  });
  it("keeps veto and retraction status ahead of a passing tally", () => {
    const base = example();
    for (const flags of [{ vetoed: true }, { retracted: true }, { flagged: true }]) {
      const html = renderDaoAlert({ ...base, proposal: { ...base.proposal, ...flags } });
      expect(html).not.toContain("Currently passing");
      expect(html).toMatch(/Execution blocked|Voting unavailable/);
      expect(html).toContain("end of block");
    }
  });
  it("bounds large batches with an explicit omitted count and keeps the transaction link", () => {
    const base = example();
    const votes = Array.from({ length: 100 }, (_, i) => ({ ...base.votes[0]!, eventId: `v:${i}`, weight: ((1n << 256n) - 1n).toString() }));
    const html = renderDaoAlert({ ...base, votes }, { title: "<".repeat(140), summary: "", discussionUrl: "https://gov.yearn.fi/" + "x".repeat(480) });
    expect(html.length).toBeLessThanOrEqual(4_096);
    expect(html).toContain("more vote updates · see Transaction");
    expect(html).toContain("etherscan.io/tx/");
  });
});
