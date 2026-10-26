import { describe, expect, it, vi } from "vitest";
import { decodeFunctionData, keccak256, type Hex } from "viem";
import mainnet from "@/docs/apps/dao/examples/mainnet-deployments.json";
import { DAO_EMPTY_SCRIPT_HASH } from "@/lib/clients/dao/domain";
import { DAO_DEPLOYMENT_BLOCK as G, DAO_EPOCH, DAO_EVENTS, DAO_GENESIS, DAO_READS, DAO_VOTER, DAO_VOTER_EVENTS, DAO_VOTING } from "@/workers/alerts-bot/src/domains/dao/contracts";
import { createEmptyDaoState, loadDaoState, scanDaoBlocks } from "@/workers/alerts-bot/src/domains/dao/scanner";
import { daoMilestones, daoPasses, daoTiming, pendingDaoMilestones } from "@/workers/alerts-bot/src/domains/dao/lifecycle";
import { renderDaoAlert, DAO_CONFIGURATION_COPY } from "@/workers/alerts-bot/src/domains/dao/renderer";
import { RpcRequestError } from "@/workers/alerts-bot/src/rpc";
import type { DaoAlertAction } from "@/workers/alerts-bot/src/domains/dao/types";
import { ACCOUNT, GUARDIAN, collectiveAccounts, configuration, daoAction, daoLog, daoRpc, hash, proposal, trackedState, voteEnd, voteStart, ybcDaoVoteLogs } from "./alerts-bot.dao-fixtures";

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

  it("keeps each personal Vote log and its confirmed proposal totals", async () => {
    const logs = [daoLog(DAO_EVENTS, "Vote", { account: ACCOUNT, idx: 0n, weight: 5n, yea: 10_000n }),
      daoLog(DAO_EVENTS, "Vote", { account: ACCOUNT, idx: 0n, weight: 7n, yea: 6_000n }, G, 1)];
    const { rpc } = daoRpc({ startTime: voteStart + 12, logs });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState(proposal, [`voting_open:${voteStart}`]) });
    expect(result.actions).toMatchObject([
      { event: "vote", account: ACCOUNT, weight: "5", supportBps: 10_000, logIndex: 0 },
      { event: "vote", account: ACCOUNT, weight: "7", supportBps: 6_000, logIndex: 1 },
    ]);
    expect(result.actions.every(action => action.kind === "dao_proposal" && action.proposal.votes === proposal.votes)).toBe(true);
    const html = renderDaoAlert(result.actions[1]!);
    expect(html).toContain("Vote: <b>60% For · 40% Against</b>");
    expect(html).toContain("Weight: &lt;0.01");
    expect(html.match(/Account:/g)).toHaveLength(1);
    const muted = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState(proposal, [`voting_open:${voteStart}`]), includeVotes: false });
    expect(muted.actions).toEqual([]);
    expect(muted.state.proposals["0"]!.proposal.votes).toBe(proposal.votes);
  });

  it("emits one personal alert with YBC influence and its original receipt key", async () => {
    const logs = ybcDaoVoteLogs();
    const { rpc } = daoRpc({ startTime: voteStart + 12, logs: [...logs].reverse() });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: trackedState(proposal, [`voting_open:${voteStart}`]) });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({
      event: "vote", eventId: `dao:${logs[0]!.transactionHash}:0:Vote`,
      logIndex: 0, source: { kind: "onchain", logIndex: 0 },
      account: "0x1d70e9414b639286665df4794ff5c7ea538b4eac", weight: "31064793252156000000",
      ybcCollectiveUpdated: true, supportBps: 10_000,
    });
    const html = renderDaoAlert(result.actions[0]!);
    expect(html).toContain("<b>🗳️ DAO vote</b>");
    expect(html).toContain("Weight: 31.06 | +YBC");
    expect(html.match(/etherscan.io\/address\//g)).toHaveLength(1);
    expect(html).not.toContain(collectiveAccounts.ybc);
    expect(html).not.toContain(collectiveAccounts.delegated);
    expect(html).not.toContain("replace earlier weight");
    expect(html).toContain("Vote: <b>For</b>");
    expect(html).toContain("For 6 · Against 4");
    expect(html).not.toContain("Current tally");
    expect(html.match(/etherscan.io\/tx\//g)).toHaveLength(1);
    expect(html).toMatchSnapshot("YBC personal vote");
  });

  it("uses confirmed collective roles rather than the number of account updates", async () => {
    const accounts = { ybc: ACCOUNT, delegated: GUARDIAN };
    const voteLogs = (addresses: string[]) => addresses.map((account, i) =>
      daoLog(DAO_EVENTS, "Vote", { account, idx: 0n, weight: 5n, yea: 10_000n }, G, i));
    const logs = voteLogs([collectiveAccounts.ybc, accounts.delegated, accounts.ybc]);
    const { rpc, call } = daoRpc({ startTime: voteStart + 12, logs, collectiveAccounts: accounts });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({ account: collectiveAccounts.ybc });
    expect(call.mock.calls.every(([, ref]) => ref.blockHash === hash(G) && ref.requireCanonical)).toBe(true);
    const unrelated = await scanDaoBlocks({ rpc: daoRpc({ startTime: voteStart + 12,
      logs: voteLogs([ACCOUNT, GUARDIAN, "0x3333333333333333333333333333333333333333"]) }).rpc,
      fromBlock: G, toBlock: G, state: createEmptyDaoState() });
    expect(unrelated.actions).toHaveLength(3);
    expect(unrelated.actions.map(action => renderDaoAlert(action)).join("\n")).not.toContain("YBC");
  });

  it("does not alert on confirmed collective updates alone", async () => {
    const { rpc } = daoRpc({ logs: ybcDaoVoteLogs().slice(1) });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
    expect(result.actions).toEqual([]);
  });

  it.each(["delegated transaction", "YBC transaction", "proposal", "order", "intervening event"])(
    "does not infer YBC participation across a mismatched %s", async kind => {
      const logs = ybcDaoVoteLogs();
      if (kind === "delegated transaction") logs[1] = { ...logs[1]!, transactionHash: hash(777) };
      if (kind === "YBC transaction") logs[2] = { ...logs[2]!, transactionHash: hash(777) };
      if (kind === "proposal") logs[2] = ybcDaoVoteLogs(1n)[2]!;
      if (kind === "order") [logs[1], logs[2]] = [{ ...logs[2]!, logIndex: 1 }, { ...logs[1]!, logIndex: 2 }];
      if (kind === "intervening event") {
        logs[1] = { ...logs[1]!, logIndex: 2 };
        logs[2] = { ...logs[2]!, logIndex: 3 };
        logs.push(daoLog(DAO_EVENTS, "SetThreshold", { threshold: 6_000n }, G, 1));
      }
      const { rpc } = daoRpc({ logs, proposal: (_block, id) => ({ ...proposal, id }) });
      const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
      expect(result.actions[0]).toMatchObject({ event: "vote", account: "0x1d70e9414b639286665df4794ff5c7ea538b4eac" });
      expect(result.actions[0]).toMatchObject({ ybcCollectiveUpdated: false });
    },
  );

  it.each([30n, 3n])("uses the recorded %s YFI personal vote weight with a YBC marker", async personal => {
    const logs = [
      daoLog(DAO_EVENTS, "Vote", { account: ACCOUNT, idx: 0n, weight: personal * 10n ** 18n, yea: 10_000n }),
      daoLog(DAO_EVENTS, "Vote", { account: collectiveAccounts.delegated, idx: 0n, weight: 100n * 10n ** 18n, yea: 10_000n }, G, 1),
      daoLog(DAO_EVENTS, "Vote", { account: collectiveAccounts.ybc, idx: 0n, weight: 20n * 10n ** 18n, yea: 10_000n }, G, 2),
    ];
    const { rpc, call } = daoRpc({ logs });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
    expect(result.actions[0]).toMatchObject({ weight: String(personal * 10n ** 18n), ybcCollectiveUpdated: true });
    expect(renderDaoAlert(result.actions[0]!)).toContain(`Weight: ${personal} | +YBC`);
    expect(call.mock.calls.every(([, ref]) => ref.blockHash === hash(G) && ref.requireCanonical)).toBe(true);
  });

  it("does not read YBC participation or member weights to mark a vote", async () => {
    const logs = ybcDaoVoteLogs();
    const { rpc, call } = daoRpc({ logs });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
    expect(result.actions[0]).toMatchObject({ weight: "31064793252156000000", ybcCollectiveUpdated: true });
    const requests = call.mock.calls.flatMap(([requests, ref]) => (Array.isArray(requests) ? requests : [requests]).map(request => ({
      name: decodeFunctionData({ abi: DAO_READS, data: request.data as Hex }).functionName, blockHash: ref.blockHash,
    })));
    expect(requests.every(r => r.blockHash === hash(G))).toBe(true);
    expect(requests.map(r => r.name)).toEqual([
      "genesis", "vote_start", "execute_delay", "execute_guard", "voter", "executor", "operator",
      "genesis", "decay_length", "ybc", "delegated_staking", "proposals",
    ]);
    expect(rpc.getBlockByNumber).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("marks both members without assigning collective weights: separate txs=%s", async separate => {
    const unit = 10n ** 18n;
    const vote = (account: string, weight: bigint, i: number, tx = hash(G + 10_000)) => ({
      ...daoLog(DAO_EVENTS, "Vote", { account, idx: 0n, weight, yea: 10_000n }, G, i), transactionHash: tx,
    });
    const tx2 = separate ? hash(777) : hash(G + 10_000);
    const logs = [vote(ACCOUNT, 20n * unit, 10), vote(collectiveAccounts.delegated, 60n * unit, 11), vote(collectiveAccounts.ybc, 30n * unit, 12),
      vote(GUARDIAN, 5n * unit, 13, tx2), vote(collectiveAccounts.delegated, 60n * unit, 14, tx2), vote(collectiveAccounts.ybc, 30n * unit, 15, tx2),
      vote("0x3333333333333333333333333333333333333333", 7n * unit, 16, tx2)];
    const { rpc } = daoRpc({ logs });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
    const voters = result.actions.filter(action => action.kind === "dao_proposal" && action.event === "vote");
    expect(voters).toMatchObject([
      { account: ACCOUNT, weight: String(20n * unit), ybcCollectiveUpdated: true },
      { account: GUARDIAN, weight: String(5n * unit), ybcCollectiveUpdated: true },
      { account: "0x3333333333333333333333333333333333333333", weight: String(7n * unit), ybcCollectiveUpdated: false },
    ]);
    const html = result.actions.map(action => renderDaoAlert(action)).join("\n");
    expect(html.match(/\| \+YBC/g)).toHaveLength(2);
    expect(html).toContain("Weight: 7");
  });

  it.each([new TypeError("Network unavailable"), new RpcRequestError("RPC unavailable", "eth_call")])(
    "propagates failed collective account reads without changing state: %s", async error => {
      const { rpc } = daoRpc({ startTime: voteStart + 12, logs: ybcDaoVoteLogs(), collectiveAccounts: error });
      const state = trackedState();
      const before = structuredClone(state);
      await expect(scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state })).rejects.toBe(error);
      expect(state).toEqual(before);
    },
  );

  it.each(["unknown Voter", "SetYBC", "SetDelegatedStaking", "SetVoteParameters", "SetYBCWeightAggregator"])(
    "keeps neutral account labels with %s", async kind => {
      const logs = ybcDaoVoteLogs();
      if (kind === "SetYBC") logs.push(daoLog(DAO_VOTER_EVENTS, kind, { ybc: ACCOUNT }, G, 3, DAO_VOTER));
      if (kind === "SetDelegatedStaking") logs.push(daoLog(DAO_VOTER_EVENTS, kind, { staking: ACCOUNT }, G, 3, DAO_VOTER));
      if (kind === "SetYBCWeightAggregator") logs.push(daoLog(DAO_VOTER_EVENTS, kind, { aggregator: ACCOUNT }, G, 3, DAO_VOTER));
      if (kind === "SetVoteParameters") logs.push(daoLog(DAO_EVENTS, kind, { length: 1n, voter: DAO_VOTER }, G, 3));
      const { rpc } = daoRpc({ startTime: voteStart + 12, logs,
        config: kind === "unknown Voter" ? { ...configuration, voter: ACCOUNT } : configuration });
      const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
      const votes = result.actions.filter(action => action.kind === "dao_proposal" && action.event === "vote");
      expect(votes.map(vote => vote.account)).toEqual(["0x1d70e9414b639286665df4794ff5c7ea538b4eac", collectiveAccounts.delegated, collectiveAccounts.ybc]);
      expect(votes.every(vote => !vote.ybcCollectiveUpdated)).toBe(true);
      const html = votes.map(vote => renderDaoAlert(vote)).join("\n");
      expect(html).not.toContain("YBC");
      expect(html.match(/Account: <a href=/g)).toHaveLength(3);
    },
  );

  it("preserves personal vote and configuration order across proposals and transactions", async () => {
    const tx2 = hash(777);
    const logs = [
      ...ybcDaoVoteLogs(),
      daoLog(DAO_EVENTS, "SetThreshold", { threshold: 6_000n }, G, 3),
      ...ybcDaoVoteLogs(0n, 4),
      ...ybcDaoVoteLogs(1n, 7),
      ...ybcDaoVoteLogs(0n, 10),
      ...ybcDaoVoteLogs(0n, 13).map(log => ({ ...log, transactionHash: tx2 })),
    ];
    const { rpc } = daoRpc({ startTime: voteStart + 12, logs, proposal: (_block, id) => ({ ...proposal, id }) });
    const initial = trackedState(proposal, [`voting_open:${voteStart}`]);
    const state = { ...initial, proposals: { ...initial.proposals, "1": { ...initial.proposals["0"]!, proposal: { ...proposal, id: "1" } } } };
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state });
    expect(result.actions).toMatchObject([
      { event: "vote", logIndex: 0, proposal: { id: "0" }, eventId: `dao:${logs[0]!.transactionHash}:0:Vote` },
      { event: "SetThreshold", logIndex: 3 },
      { event: "vote", logIndex: 4, proposal: { id: "0" }, eventId: `dao:${logs[0]!.transactionHash}:4:Vote` },
      { event: "vote", logIndex: 7, proposal: { id: "1" } },
      { event: "vote", logIndex: 10, proposal: { id: "0" } },
      { event: "vote", logIndex: 13, proposal: { id: "0" }, txHash: tx2 },
    ]);
  });

  it("emits two member alerts in one transaction using their recorded weights", async () => {
    const unit = 10n ** 18n;
    const logs = [
      daoLog(DAO_EVENTS, "Vote", { account: ACCOUNT, idx: 0n, weight: 20n * unit, yea: 10_000n }, G, 0),
      daoLog(DAO_EVENTS, "Vote", { account: collectiveAccounts.delegated, idx: 0n, weight: 30n * unit, yea: 10_000n }, G, 1),
      daoLog(DAO_EVENTS, "Vote", { account: collectiveAccounts.ybc, idx: 0n, weight: 15n * unit, yea: 10_000n }, G, 2),
      daoLog(DAO_EVENTS, "Vote", { account: GUARDIAN, idx: 0n, weight: 5n * unit, yea: 0n }, G, 3),
      daoLog(DAO_EVENTS, "Vote", { account: collectiveAccounts.delegated, idx: 0n, weight: 60n * unit, yea: 3_333n }, G, 4),
      daoLog(DAO_EVENTS, "Vote", { account: collectiveAccounts.ybc, idx: 0n, weight: 30n * unit, yea: 3_333n }, G, 5),
    ];
    const { rpc } = daoRpc({ logs });
    const result = await scanDaoBlocks({ rpc, fromBlock: G, toBlock: G, state: createEmptyDaoState() });
    expect(result.actions).toMatchObject([
      { account: ACCOUNT, weight: String(20n * unit), ybcCollectiveUpdated: true, eventId: `dao:${logs[0]!.transactionHash}:0:Vote` },
      { account: GUARDIAN, weight: String(5n * unit), ybcCollectiveUpdated: true, eventId: `dao:${logs[0]!.transactionHash}:3:Vote` },
    ]);
    const html = result.actions.map(action => renderDaoAlert(action));
    expect(html[0]).toContain("Vote: <b>For</b>");
    expect(html[1]).toContain("Vote: <b>Against</b>");
    expect(html.every(message => message.match(/Account:/g)?.length === 1)).toBe(true);
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
  it("bounds a personal vote message at maximum field lengths", () => {
    const base = daoAction("vote");
    if (base.kind !== "dao_proposal" || base.event !== "vote") throw new Error("test_vote_missing");
    const html = renderDaoAlert({ ...base, weight: ((1n << 256n) - 1n).toString() },
      { title: "x".repeat(140), summary: "", discussionUrl: "https://gov.yearn.fi/" + "x".repeat(480) });
    expect(html.length).toBeLessThanOrEqual(4_096);
    expect(html.match(/etherscan.io\/address\//g)).toHaveLength(1);
    expect(html).toContain("115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457.58");
    expect(html).toContain(`etherscan.io/tx/${base.txHash}`);
  });

  it("matches the approved historical vote template and footer order", () => {
    const base = daoAction("vote", { ...proposal, id: "2", epoch: 18, votes: "1762291976828952204004", yea: "1762291976828952204004" });
    if (base.kind !== "dao_proposal" || base.event !== "vote") throw new Error("test_vote_missing");
    const tx = "0x13cc67c6090c28e96a787b521b6af4275f546577de9f0ec26209dfec1f07dff4";
    const html = renderDaoAlert({ ...base, timestamp: 1_793_015_627, txHash: tx,
      account: "0x1d70e9414b639286665df4794ff5c7ea538b4eac", weight: "31064793252156000000", ybcCollectiveUpdated: true, supportBps: 10_000, logIndex: 611,
    }, { title: "BR: DAO-ops 5", summary: "", discussionUrl: "https://gov.yearn.fi/t/budget-request-dao-ops-5/14722" });
    expect(html).toContain("Weight: 31.06 | +YBC");
    expect(html).toContain("For 1,762.29 · Against 0");
    expect(html).toContain("Required 50%\n\n- <a href=\"https://dao.yearn.fi/proposals/2");
    expect(html.indexOf(">Proposal</a>")).toBeLessThan(html.indexOf(">Discussion</a>"));
    expect(html.indexOf(">Discussion</a>")).toBeLessThan(html.indexOf(">Transaction</a>"));
    expect(html.endsWith("26 Oct, 11:53 UTC")).toBe(true);
    for (const prose of ["Voting open", "Observed:", "Ethereum block", "Proposal state and totals", "≈"]) expect(html).not.toContain(prose);
    expect(html).toMatchSnapshot("approved vote template");
  });

  it.each([[voteEnd - 1, true], [voteEnd, false]])("marks approval live only before voting closes: %s", (timestamp, live) => {
    const html = renderDaoAlert({ ...daoAction("vote"), timestamp });
    expect(html.includes("Approval 60% (live) · Required 50%")).toBe(live);
    if (!live) expect(html).toContain("Approval 60% · Required 50%");
  });

  it.each([[0, "Against"], [10_000, "For"], [6_125, "61.25% For · 38.75% Against"]])("renders support %i without YBC wording", (supportBps, choice) => {
    const base = daoAction("vote");
    if (base.kind !== "dao_proposal" || base.event !== "vote") throw new Error("test_vote_missing");
    const html = renderDaoAlert({ ...base, weight: "31064793252156000000", supportBps });
    expect(html).toContain(`Vote: <b>${choice}</b>`);
    expect(html).toContain("Weight: 31.06");
    expect(html).not.toContain("YBC");
  });

  it.each([[0n, "0"], [4_999_999_999_999_999n, "&lt;0.01"], [5_000_000_000_000_000n, "0.01"],
    [1_995000000000000000n, "2"], [999_995000000000000000n, "1,000"]])("rounds weight %s without hiding positive values", (raw, formatted) => {
    const base = daoAction("vote");
    if (base.kind !== "dao_proposal" || base.event !== "vote") throw new Error("test_vote_missing");
    const html = renderDaoAlert({ ...base, weight: String(raw) });
    expect(html).toContain(`Weight: ${formatted}`);
  });

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
