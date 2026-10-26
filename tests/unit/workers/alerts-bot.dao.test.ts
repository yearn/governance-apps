import { describe, expect, it, vi } from "vitest";
import { keccak256 } from "viem";
import mainnet from "@/docs/apps/dao/examples/mainnet-deployments.json";
import { DAO_EMPTY_SCRIPT_HASH } from "@/lib/clients/dao/domain";
import { DAO_DEPLOYMENT_BLOCK as G, DAO_EPOCH, DAO_EVENTS, DAO_GENESIS, DAO_VOTER, DAO_VOTER_EVENTS, DAO_VOTING } from "@/workers/alerts-bot/src/domains/dao/contracts";
import { createEmptyDaoState, loadDaoState, scanDaoBlocks } from "@/workers/alerts-bot/src/domains/dao/scanner";
import { daoMilestones, daoPasses, daoTiming, pendingDaoMilestones } from "@/workers/alerts-bot/src/domains/dao/lifecycle";
import { renderDaoAlert, DAO_CONFIGURATION_COPY } from "@/workers/alerts-bot/src/domains/dao/renderer";
import { RpcRequestError } from "@/workers/alerts-bot/src/rpc";
import type { DaoAlertAction } from "@/workers/alerts-bot/src/domains/dao/types";
import { ACCOUNT, configuration, daoAction, daoLog, daoRpc, hash, proposal, trackedState, voteEnd, voteStart } from "./alerts-bot.dao-fixtures";

describe("DAO contract coverage and lifecycle", () => {
  it("pins the same deployed Voting and Voter as the app", () => {
    expect(mainnet[0]).toMatchObject({ votingAddress: DAO_VOTING, deploymentBlock: String(G), genesis: DAO_GENESIS, supportedVoters: [DAO_VOTER] });
  });

  it("requires positive turnout even with a zero threshold, and accepts threshold equality", () => {
    expect(daoPasses({ ...proposal, votes: "0", yea: "0", threshold: 0 })).toBe(false);
    expect(daoPasses({ ...proposal, votes: "2", yea: "1" })).toBe(true);
    expect(daoPasses({ ...proposal, votes: "3", yea: "1" })).toBe(false);
  });

  it("keeps approval separate from signal finalization and execution windows", () => {
    const signal = { ...proposal, scriptHash: DAO_EMPTY_SCRIPT_HASH };
    const kinds = daoMilestones(signal, configuration).map(m => m.kind);
    expect(kinds).toContain("approved");
    expect(kinds).not.toContain("execution_ready");
    expect(kinds).not.toContain("expired");
    expect(daoTiming(proposal, configuration)).toMatchObject({ voteStart, voteEnd, executeStart: voteEnd + 86_400, executeEnd: voteEnd + DAO_EPOCH, decayStart: voteEnd - 86_400 + 1 });
  });

  it("suppresses cancelled proposals while preserving allowed voting under a veto", () => {
    for (const field of ["retracted", "flagged", "executed"] as const) {
      expect(daoMilestones({ ...proposal, [field]: true }, configuration)).toEqual([]);
    }
    const vetoed = daoMilestones({ ...proposal, vetoed: true }, configuration).map(m => m.kind);
    expect(vetoed).toContain("voting_ending");
    expect(vetoed).toContain("vetoed_result");
    expect(vetoed).not.toContain("approved");
    expect(vetoed).not.toContain("execution_ready");
    expect(daoMilestones(proposal, { ...configuration, decayLength: null }).some(m => m.kind === "vote_decay")).toBe(false);
  });

  it("rejects corrupt persisted proposal state", () => {
    expect(() => loadDaoState({ ...trackedState(), proposals: { "3": trackedState().proposals["0"] } })).toThrow();
    expect(() => loadDaoState(trackedState({ ...proposal, yea: "999999999999999999999" }))).toThrow();
  });

  it("emits only the current reminder and orders zero-delay execution after approval", () => {
    const due = pendingDaoMilestones(trackedState().proposals["0"]!, configuration, voteStart - 60)
      .filter(m => m.at <= voteStart - 60);
    expect(due.map(m => m.kind)).toEqual(["discussion_ending"]);
    expect(due[0]!.at).toBe(voteStart - 3_600);
    const atClose = daoMilestones(proposal, { ...configuration, executeDelay: 0 }).filter(m => m.at === voteEnd);
    expect(atClose.map(m => m.kind)).toEqual(["approved", "execution_ready"]);
  });
});

describe("DAO confirmed scanner", () => {
  it("reads proposal facts at the canonical event block and stops before later events", async () => {
    const p = { ...proposal, scriptHash: keccak256("0x1234"), votes: "0", yea: "0" };
    const log = daoLog(DAO_EVENTS, "Propose", { idx: 0n, proposer: ACCOUNT, epoch: 20n, ipfs: p.digest, script: "0x1234" });
    const later = daoLog(DAO_EVENTS, "SetOperator", { operator: ACCOUNT }, G + 5);
    const { rpc, call } = daoRpc({ logs: [later, log], proposal: p });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G + 10, state: createEmptyDaoState() });
    expect(result.terminalBlock).toBe(G);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({ event: "proposed", proposal: p });
    expect(call.mock.calls.every(([, ref]) => ref.blockHash === hash(G) && ref.requireCanonical)).toBe(true);
    expect(result.state.proposals["0"]!.proposal).toEqual(p);
  });

  it("finds the first deadline block even when a requested range crosses several windows", async () => {
    const { rpc } = daoRpc({ startTime: voteStart - 86_424 });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G + 100_000, state: trackedState() });
    expect(result.terminalBlock).toBe(G + 2);
    expect(result.actions.map(a => a.event)).toEqual(["discussion_ending"]);
    expect(result.actions[0]!.source.kind).toBe("synthetic");
    const retry = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G + 5, state: trackedState() });
    expect(retry.actions).toEqual(result.actions);
  });

  it("advances across quiet windows once, including results, execution and expiry", async () => {
    const { rpc } = daoRpc({ startTime: voteStart - 86_424 });
    let state = trackedState();
    let fromBlock = G;
    const actions: DaoAlertAction[] = [];
    const target = G + Math.ceil((voteEnd + DAO_EPOCH - voteStart + 86_424) / 12);
    for (let runs = 0; fromBlock <= target && runs < 30; runs++) {
      const result = await scanDaoBlocks({ rpc, fromBlock, toBlock: target, state });
      actions.push(...result.actions);
      state = result.state;
      fromBlock = result.terminalBlock + 1;
    }
    expect(fromBlock).toBe(target + 1);
    expect(actions.map(a => a.event)).toEqual([
      "discussion_ending", "discussion_ending", "voting_open", "voting_ending", "vote_decay", "voting_ending",
      "approved", "execution_ready", "execution_ending", "execution_ending", "expired",
    ]);
    expect(new Set(actions.map(a => a.eventId)).size).toBe(actions.length);
    expect(state.proposals).toEqual({});
  });

  it("cancels a deadline alert when retraction occurs in its boundary block", async () => {
    const log = daoLog(DAO_EVENTS, "Retract", { idx: 0n }, G + 2);
    const { rpc } = daoRpc({ startTime: voteStart - 24, logs: [log], proposal: block => ({ ...proposal, votes: "0", yea: "0", retracted: block >= G + 2 }) });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G + 10, state: trackedState() });
    // Earlier overdue reminders can be processed first; start at the exact retraction boundary.
    const boundary = await scanDaoBlocks({ rpc, fromBlock: G + 2, toBlock: G + 10, state: result.state });
    expect(boundary.actions.map(a => a.event)).toEqual(["retracted"]);
    expect(boundary.state.proposals).toEqual({});
  });

  it("uses block totals for collective vote updates instead of adding them together", async () => {
    const logs = [daoLog(DAO_EVENTS, "Vote", { account: ACCOUNT, idx: 0n, weight: 5n, yea: 10_000n }),
      daoLog(DAO_EVENTS, "Vote", { account: ACCOUNT, idx: 0n, weight: 7n, yea: 6_000n }, G, 1)];
    const { rpc } = daoRpc({ startTime: voteStart + 12, logs });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState(proposal, [`voting_open:${voteStart}`]) });
    expect(result.actions).toHaveLength(2);
    expect(result.actions[1]).toMatchObject({ event: "vote", weight: "7", supportBps: 6_000, proposal: { votes: proposal.votes, yea: proposal.yea } });
    const muted = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState(proposal, [`voting_open:${voteStart}`]), includeVotes: false });
    expect(muted.actions).toEqual([]);
    expect(muted.state.proposals["0"]!.proposal.votes).toBe(proposal.votes);
  });

  it("re-evaluates active proposals after a timing configuration change", async () => {
    const changed = { ...configuration, voteStart: configuration.voteStart - 3_600 };
    const log = daoLog(DAO_EVENTS, "SetVoteParameters", { length: BigInt(DAO_EPOCH - changed.voteStart), voter: DAO_VOTER });
    const { rpc } = daoRpc({ startTime: voteStart - 1_800, logs: [log], config: changed });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G + 10, state: trackedState() });
    expect(result.actions.map(a => a.event)).toEqual(["SetVoteParameters", "voting_open"]);
  });

  it("continues lifecycle coverage with an unknown Voter but disables decay assumptions", async () => {
    const { rpc } = daoRpc({ config: { ...configuration, voter: ACCOUNT } });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState() });
    expect(result.state.configuration?.decayLength).toBeNull();
  });

  it("reduces provider-limited ranges without changing the saved state", async () => {
    const { rpc } = daoRpc();
    const state = trackedState();
    const before = structuredClone(state);
    vi.mocked(rpc.getLogs).mockRejectedValueOnce(new RpcRequestError("range limit", "eth_getLogs", undefined, -32005, undefined, true));
    await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G + 100, state });
    expect(vi.mocked(rpc.getLogs).mock.calls[1]![0].toBlock).toBe(G + 50);
    expect(state).toEqual(before);
  });

  it.each(["malformed", "noncanonical", "duplicate", "unknown", "removed"])("fails closed on %s logs", async kind => {
    const log = daoLog(DAO_EVENTS, "Retract", { idx: 0n });
    if (kind === "malformed") log.data = "0x12";
    if (kind === "noncanonical") log.blockHash = hash(1);
    if (kind === "unknown") log.topics[0] = hash(2);
    if (kind === "removed") log.removed = true;
    const { rpc } = daoRpc({ logs: kind === "duplicate" ? [log, log] : [log] });
    await expect(scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState() })).rejects.toThrow();
  });

  it.each(["Flag", "Veto", "Execute"])("decodes %s with exact block context", async name => {
    const args = name === "Execute" ? { idx: 0n, executor: ACCOUNT } : { idx: 0n, reason: "Review required" };
    const p = { ...proposal, flagged: name === "Flag", retracted: name === "Flag", vetoed: name === "Veto", executed: name === "Execute" };
    const { rpc } = daoRpc({ logs: [daoLog(DAO_EVENTS, name, args)], proposal: p });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState() });
    expect(result.actions[0]).toMatchObject({ event: { Flag: "flagged", Veto: "vetoed", Execute: "executed" }[name], proposal: p, blockHash: hash(G) });
    expect(result.state.proposals["0"] !== undefined).toBe(name === "Veto");
  });

  it("rejects mismatched genesis and proposal commitments", async () => {
    const wrongGenesis = daoRpc({ genesis: 1 }).rpc;
    await expect(scanDaoBlocks({ rpc: wrongGenesis, fromBlock: G, toBlock: G, state: createEmptyDaoState() })).rejects.toThrow("dao_genesis_mismatch");
    const log = daoLog(DAO_EVENTS, "Propose", { idx: 0n, proposer: ACCOUNT, epoch: 20n, ipfs: proposal.digest, script: "0x" });
    await expect(scanDaoBlocks({ rpc: daoRpc({ logs: [log] }).rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() })).rejects.toThrow("dao_propose_mismatch");
  });
});

describe("DAO message catalogue", () => {
  const events = ["proposed", "vote", "retracted", "flagged", "vetoed", "executed", "discussion_ending", "voting_open", "voting_ending", "vote_decay", "approved", "rejected", "vetoed_result", "execution_ready", "execution_ending", "expired"] as const;
  it.each(events)("renders %s with proposal identity, evidence and bounded HTML", event => {
    const html = renderDaoAlert(daoAction(event), { title: "<test>", summary: "untrusted & text", discussionUrl: "https://gov.yearn.fi/t/example/123" });
    expect(html).toContain(`proposals/0?chain=1&amp;voting=${DAO_VOTING}`);
    expect(html).toContain("&lt;test&gt;");
    expect(html).toContain("UTC");
    expect(html.length).toBeLessThanOrEqual(4_096);
    expect(html).toMatchSnapshot();
  });

  it("renders every Voting and Voter configuration event", async () => {
    for (const [contract, abi] of [[DAO_VOTING, DAO_EVENTS], [DAO_VOTER, DAO_VOTER_EVENTS]] as const) {
      for (const event of abi) {
        if (!DAO_CONFIGURATION_COPY[event.name]) continue;
        const args = Object.fromEntries(event.inputs.map(i => [i.name, i.type === "address" ? ACCOUNT : i.type === "bool" ? true : 5_000n]));
        const { rpc } = daoRpc({ logs: [daoLog(abi, event.name, args, G, 0, contract)] });
        const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
        const html = renderDaoAlert(result.actions[0]!);
        expect(html.length).toBeLessThanOrEqual(4_096);
        expect(html).toMatchSnapshot(`${contract === DAO_VOTING ? "Voting" : "Voter"}.${event.name}`);
      }
    }
  });

  it("states veto voting limits, escaping reasons without inventing an actor", () => {
    const action = daoAction("vetoed", { ...proposal, vetoed: true });
    const html = renderDaoAlert(action);
    expect(html).toContain("Voting remains open");
    expect(html).toContain("&lt;b&gt;untrusted &amp; reason&lt;/b&gt;");
    expect(html).not.toContain("Vetoed by");
    expect(renderDaoAlert(daoAction("vetoed", { ...proposal, vetoed: true, retracted: true }))).toContain("Voting is unavailable");
  });

  it("uses block links for deadlines and never claims an execution simulation succeeded", () => {
    const action = { ...daoAction("execution_ready"), timestamp: voteEnd + 86_400, source: { kind: "synthetic" as const, metricId: "ready", blockHash: hash(G), orderingIndex: 0 }, txHash: "" };
    const html = renderDaoAlert(action);
    expect(html).toContain("run a fresh execution simulation");
    expect(html).toContain(`etherscan.io/block/${G}`);
    expect(html).not.toContain("etherscan.io/tx/");
    expect(renderDaoAlert(daoAction("approved", { ...proposal, scriptHash: DAO_EMPTY_SCRIPT_HASH }))).toContain("No execution transaction is needed");
  });
});
