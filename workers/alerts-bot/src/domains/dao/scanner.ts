import {
  decodeEventLog, decodeFunctionResult, encodeAbiParameters, encodeEventTopics, encodeFunctionData,
  keccak256, zeroAddress, type Address, type Hex,
} from "viem";
import { z } from "zod";
import { ALERT_RPC_MAX_BATCH_SIZE, RpcRequestError, type RpcBlock, type RpcCallTraceFrame, type RpcClient } from "../../rpc";
import {
  assertCanonicalProductLog, canonicalProductLog, exactBlock, onchainSource,
  productEventId, sortProductLogs, type CanonicalProductLog,
} from "../product-scanner-utils";
import {
  DAO_DEPLOYMENT_BLOCK, DAO_EPOCH, DAO_EVENTS, DAO_GENESIS, DAO_READS,
  DAO_VOTER, DAO_VOTER_EVENTS, DAO_VOTING,
} from "./contracts";
import { daoTiming, pendingDaoMilestones } from "./lifecycle";
import type { DaoAlertAction, DaoAlertConfiguration, DaoAlertProposal, DaoAlertState, DaoTrackedProposal, DaoVoteAction, DaoVoteUpdate } from "./types";

const collectiveAccountChanges = new Set(["SetYBC", "SetDelegatedStaking", "SetVoteParameters"]);
const voteTopic = encodeEventTopics({ abi: DAO_EVENTS, eventName: "Vote" })[0];
const uint = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const address = z.string().regex(/^0x[0-9a-f]{40}$/);
const hash = z.string().regex(/^0x[0-9a-f]{64}$/);
const seconds = z.number().int().min(0).max(DAO_EPOCH);
const proposalSchema = z.strictObject({
  id: uint, proposer: address, epoch: z.number().int().positive().max(1_000_000),
  digest: hash, scriptHash: hash, threshold: z.number().int().min(0).max(10_000),
  votes: uint, yea: uint, retracted: z.boolean(), executed: z.boolean(), flagged: z.boolean(), vetoed: z.boolean(),
}).refine(p => BigInt(p.yea) <= BigInt(p.votes));
const configurationSchema = z.strictObject({
  voteStart: seconds, executeDelay: seconds.max(DAO_EPOCH - 1), executeGuard: z.boolean(),
  voter: address, executor: address, operator: address,
  decayLength: seconds.max(DAO_EPOCH / 2 - 1).nullable(),
});
const stateSchema = z.strictObject({
  version: z.literal(1), configuration: configurationSchema.nullable(),
  proposals: z.record(uint, z.strictObject({
    proposal: proposalSchema,
    notified: z.array(z.string().regex(/^[a-z_]+:[0-9]+$/)).max(256),
  })),
}).refine(s => Object.entries(s.proposals).every(([id, p]) => id === p.proposal.id));

export function createEmptyDaoState(): DaoAlertState {
  return { version: 1, configuration: null, proposals: {} };
}

export function loadDaoState(value: unknown): DaoAlertState {
  return stateSchema.parse(value);
}

async function reads(rpc: RpcClient, block: RpcBlock, target: string, names: readonly string[], args: readonly (readonly unknown[])[] = []) {
  const results: unknown[] = [];
  for (let offset = 0; offset < names.length; offset += ALERT_RPC_MAX_BATCH_SIZE) {
    const batch = names.slice(offset, offset + ALERT_RPC_MAX_BATCH_SIZE);
    const values = await rpc.call(batch.map((functionName, i) => ({
      to: target,
      data: encodeFunctionData({ abi: DAO_READS, functionName, args: args[offset + i] ?? [] } as never),
    })), { blockHash: block.hash, requireCanonical: true });
    if (values.length !== batch.length) throw new Error("dao_read_incomplete");
    for (const [i, functionName] of batch.entries()) {
      results.push(decodeFunctionResult({ abi: DAO_READS, functionName, data: values[i] as Hex } as never));
    }
  }
  return results;
}

async function readConfiguration(rpc: RpcClient, block: RpcBlock): Promise<DaoAlertConfiguration> {
  const [genesis, voteStart, executeDelay, executeGuard, voter, executor, operator] = await reads(
    rpc, block, DAO_VOTING, ["genesis", "vote_start", "execute_delay", "execute_guard", "voter", "executor", "operator"],
  );
  if (genesis !== BigInt(DAO_GENESIS)) throw new Error("dao_genesis_mismatch");
  let decayLength: number | null = null;
  if (String(voter).toLowerCase() === DAO_VOTER) {
    const [voterGenesis, decay] = await reads(rpc, block, DAO_VOTER, ["genesis", "decay_length"]);
    if (voterGenesis !== genesis) throw new Error("dao_voter_genesis_mismatch");
    decayLength = Number(decay);
  }
  return configurationSchema.parse({
    voteStart: Number(voteStart), executeDelay: Number(executeDelay), executeGuard,
    voter: String(voter).toLowerCase(), executor: String(executor).toLowerCase(),
    operator: String(operator).toLowerCase(), decayLength,
  });
}

interface DecodedLog {
  readonly log: CanonicalProductLog;
  readonly name: string;
  readonly args: Record<string, unknown>;
}

async function readCollectiveAccounts(rpc: RpcClient, block: RpcBlock) {
  const values = await reads(rpc, block, DAO_VOTER, ["ybc", "delegated_staking"]);
  const ybc = address.parse(String(values[0]).toLowerCase());
  const delegated = address.parse(String(values[1]).toLowerCase());
  if (ybc === delegated || ybc === zeroAddress || delegated === zeroAddress) return null;
  return { ybc, delegated };
}

function findVoterFrame(trace: RpcCallTraceFrame, firstLogIndex: number, action: DaoVoteAction, vote: DaoVoteUpdate): RpcCallTraceFrame {
  const topics = encodeEventTopics({ abi: DAO_EVENTS, eventName: "Vote",
    args: { account: vote.account as Address, idx: BigInt(action.proposal.id) } }) as readonly Hex[];
  const data = encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [BigInt(vote.weight), BigInt(vote.supportBps)]);
  const frames: { frame: RpcCallTraceFrame; index: number }[] = [];
  let firstTraceIndex = Infinity;
  const visit = (frame: RpcCallTraceFrame) => {
    if (frame.error !== null) return;
    for (const log of frame.logs) {
      if (log.address === DAO_VOTING && log.topics[0] === voteTopic) firstTraceIndex = Math.min(firstTraceIndex, log.index);
    }
    if (frame.to === DAO_VOTER && frame.from === vote.account) {
      const log = frame.calls.filter(call => call.to === DAO_VOTING && call.error === null).flatMap(call => call.logs).find(log =>
        log.address === DAO_VOTING && log.data === data && log.topics.length === topics.length &&
        log.topics.every((topic, i) => topic === topics[i]?.toLowerCase()));
      if (log) frames.push({ frame, index: log.index });
    }
    for (const call of frame.calls) visit(call);
  };
  visit(trace);
  // Trace log indices are transaction-relative; receipt log indices are block-relative.
  const matches = frames.filter(item => item.index - firstTraceIndex === vote.logIndex - firstLogIndex);
  if (matches.length !== 1) throw new Error("dao_vote_trace_frame_mismatch");
  return matches[0]!.frame;
}

function memberWeightFrom(frame: RpcCallTraceFrame, account: string): bigint {
  const votingCalls = frame.calls.filter(call => call.to === DAO_VOTING && call.error === null &&
    call.logs.some(log => log.address === DAO_VOTING && log.topics[0] === voteTopic));
  // Voter._vote emits one personal vote, plus two collective votes for positive YBC member weight.
  if (votingCalls.length === 1) return 0n;
  const input = encodeFunctionData({ abi: DAO_READS, functionName: "weight", args: [account as Address] });
  const weightCalls = frame.calls.filter(call => call.type === "STATICCALL" && call.from === DAO_VOTER &&
    call.input === input && call.error === null);
  const weightCall = weightCalls.length === 1 ? weightCalls[0] : undefined;
  if (votingCalls.length !== 3 || !weightCall) throw new Error("dao_vote_trace_weight_invalid");
  const output = weightCall.output;
  if (output === null || !/^0x[0-9a-f]{64}$/.test(output)) {
    throw new Error("dao_vote_trace_weight_invalid");
  }
  const weight = BigInt(output);
  if (weight === 0n) throw new Error("dao_vote_trace_weight_invalid");
  return weight;
}

async function addVoteInfluence(rpc: RpcClient, block: RpcBlock, actions: readonly DaoAlertAction[]): Promise<readonly DaoAlertAction[]> {
  const groups = actions.filter((action): action is DaoVoteAction => action.kind === "dao_proposal" && action.event === "vote");
  const pools = new Map<string, { ybc?: bigint; delegated?: bigint }>();
  const transactions = new Set<string>();
  const firstIndices = new Map<string, number>();
  for (const action of groups) {
    firstIndices.set(action.txHash, Math.min(firstIndices.get(action.txHash) ?? Infinity, action.votes[0]!.logIndex));
    for (const vote of action.votes) {
      if (vote.role !== "ybc" && vote.role !== "delegated") continue;
      const pool = pools.get(action.proposal.id) ?? {};
      pool[vote.role] = BigInt(vote.weight);
      pools.set(action.proposal.id, pool);
      transactions.add(action.txHash);
    }
  }
  if (transactions.size === 0) return actions;
  if (!rpc.traceTransactionByHash) throw new Error("dao_vote_trace_unavailable");
  const traces = new Map<string, RpcCallTraceFrame>();
  for (const tx of transactions) traces.set(tx, await rpc.traceTransactionByHash(tx));
  const ids = [...pools.keys()];
  const values = await reads(rpc, block, DAO_VOTER, ids.map(() => "ybc_votes"), ids.map(id => [DAO_VOTING, BigInt(id)]));
  const totals = new Map(ids.map((id, i) => [id, (values[i] as readonly [bigint, bigint])[0]]));
  return actions.map(action => {
    if (action.kind !== "dao_proposal" || action.event !== "vote") return action;
    const trace = traces.get(action.txHash);
    const pool = pools.get(action.proposal.id);
    if (!trace || !pool) return action;
    return { ...action, votes: action.votes.map(vote => {
      if (vote.role !== "voter") return vote;
      // Later transfers can change current member weight without changing recorded participation.
      const frame = findVoterFrame(trace, firstIndices.get(action.txHash)!, action, vote);
      const member = memberWeightFrom(frame, vote.account);
      if (member === 0n) return vote;
      const total = totals.get(action.proposal.id)!;
      if (member > total || pool.ybc === undefined || pool.delegated === undefined) throw new Error("dao_vote_influence_invalid");
      const share = pool.ybc * member / total + pool.delegated * member / total;
      return share === 0n ? vote : { ...vote, totalWeight: String(BigInt(vote.weight) + share) };
    }) };
  });
}

function decode(log: CanonicalProductLog): DecodedLog {
  const abi = log.address === DAO_VOTING ? DAO_EVENTS : DAO_VOTER_EVENTS;
  const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics as [Hex, ...Hex[]], strict: true });
  const event = abi.find(item => item.type === "event" && item.name === decoded.eventName);
  if (!event || event.type !== "event") throw new Error("dao_event_unknown");
  const args = decoded.args as Record<string, unknown>;
  const inputs = event.inputs.filter(input => !("indexed" in input && input.indexed));
  if (log.topics.length !== 1 + event.inputs.filter(input => "indexed" in input && input.indexed).length ||
      encodeAbiParameters(inputs, inputs.map(input => args[input.name!])).toLowerCase() !== log.data) {
    throw new Error("dao_event_encoding_invalid");
  }
  return { log, name: decoded.eventName!, args };
}

function proposalFromRead(id: string, value: unknown): DaoAlertProposal {
  const p = value as Record<string, unknown>;
  const proposal = proposalSchema.parse({
    id, proposer: String(p.proposer).toLowerCase(), epoch: Number(p.epoch),
    digest: String(p.ipfs).toLowerCase(), scriptHash: String(p.script_hash).toLowerCase(),
    threshold: Number(p.threshold), votes: String(p.votes), yea: String(p.yea),
    retracted: p.retracted, executed: p.executed, flagged: p.flagged, vetoed: p.vetoed,
  });
  if (/^0x0{40}$/.test(proposal.proposer)) throw new Error("dao_proposal_missing");
  return proposal;
}

/** Locate the first confirmed block at a deadline, independent of scan range size. */
async function boundaryBlock(rpc: RpcClient, from: number, to: number, at: number): Promise<number> {
  while (from < to) {
    const middle = from + Math.floor((to - from) / 2);
    const block = await exactBlock(rpc, middle);
    if (block.timestamp! >= at) to = middle;
    else from = middle + 1;
  }
  return from;
}

const proposalEvents: Readonly<Record<string, "proposed" | "vote" | "retracted" | "flagged" | "vetoed" | "executed">> = {
  Propose: "proposed", Vote: "vote", Retract: "retracted", Flag: "flagged", Veto: "vetoed", Execute: "executed",
};

export async function scanDaoBlocks(params: {
  readonly rpc: RpcClient;
  readonly fromBlock: number;
  readonly toBlock: number;
  readonly state: DaoAlertState;
  readonly includeVotes?: boolean;
}): Promise<{ terminalBlock: number; terminalHash: string; state: DaoAlertState; actions: readonly DaoAlertAction[] }> {
  const { rpc, fromBlock } = params;
  if (fromBlock < DAO_DEPLOYMENT_BLOCK || params.toBlock < fromBlock) throw new Error("dao_range_invalid");
  // Range reductions happen before state or messages change.
  let toBlock = params.toBlock;
  let logs: readonly CanonicalProductLog[];
  while (true) {
    try {
      const fetched = await rpc.getLogs({ address: [DAO_VOTING, DAO_VOTER], fromBlock, toBlock });
      if (fetched.some(log => log.removed)) throw new Error("dao_log_removed");
      logs = sortProductLogs(fetched
        .map(canonicalProductLog).filter((log): log is CanonicalProductLog => log !== null));
      break;
    } catch (error) {
      if (!(error instanceof RpcRequestError) || !error.rangeLimit || toBlock === fromBlock) throw error;
      toBlock = fromBlock + Math.floor((toBlock - fromBlock) / 2);
    }
  }
  const seen = new Set<string>();
  for (const log of logs) {
    const key = `${log.blockNumber}:${log.logIndex}`;
    if (log.blockNumber < fromBlock || log.blockNumber > toBlock || seen.has(key) ||
        (log.address !== DAO_VOTING && log.address !== DAO_VOTER)) throw new Error("dao_log_range_invalid");
    seen.add(key);
  }
  toBlock = Math.min(toBlock, logs[0]?.blockNumber ?? toBlock);
  let terminal = await exactBlock(rpc, toBlock);
  const previous = params.state.configuration;
  if (previous !== null) {
    const first = await exactBlock(rpc, fromBlock);
    const due = Object.values(params.state.proposals).flatMap(p => pendingDaoMilestones(p, previous, first.timestamp!));
    const earliest = Math.min(...due.map(m => m.at));
    if (earliest <= terminal.timestamp!) {
      toBlock = await boundaryBlock(rpc, fromBlock, toBlock, earliest);
      terminal = await exactBlock(rpc, toBlock);
    }
  }

  const configuration = await readConfiguration(rpc, terminal);
  const events = logs.filter(log => log.blockNumber === toBlock).map(log => {
    assertCanonicalProductLog(log, terminal);
    return decode(log);
  });
  // End-block roles cannot identify accounts reliably if their configuration changed in this block.
  const collectiveAccounts = params.includeVotes !== false && configuration.voter === DAO_VOTER &&
    events.some(event => event.name === "Vote") &&
    !events.some(event => collectiveAccountChanges.has(event.name))
    ? await readCollectiveAccounts(rpc, terminal) : null;
  const ids = new Set(Object.keys(params.state.proposals));
  for (const event of events) {
    if (event.log.address === DAO_VOTING && proposalEvents[event.name]) ids.add(String(event.args.idx));
  }
  const orderedIds = [...ids].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0);
  const values = await reads(rpc, terminal, DAO_VOTING, orderedIds.map(() => "proposals"), orderedIds.map(id => [BigInt(id)]));
  const proposals: Record<string, DaoTrackedProposal> = {};
  for (const [i, id] of orderedIds.entries()) {
    proposals[id] = { proposal: proposalFromRead(id, values[i]), notified: [...(params.state.proposals[id]?.notified ?? [])] };
  }

  const actions: DaoAlertAction[] = [];
  for (const { log, name, args } of events) {
    const base = {
      domainId: "dao" as const, blockNumber: toBlock, blockHash: terminal.hash, logIndex: log.logIndex,
      txHash: log.transactionHash, source: onchainSource(log), timestamp: terminal.timestamp!,
      eventId: `dao:${productEventId(log, name)}`,
    };
    const event = log.address === DAO_VOTING ? proposalEvents[name] : undefined;
    if (event !== undefined) {
      const p = proposals[String(args.idx)]!.proposal;
      if (event === "proposed" && (String(args.proposer).toLowerCase() !== p.proposer ||
          Number(args.epoch) !== p.epoch || String(args.ipfs).toLowerCase() !== p.digest ||
          typeof args.script !== "string" || args.script.length > 4_098 || keccak256(args.script as Hex) !== p.scriptHash)) {
        throw new Error("dao_propose_mismatch");
      }
      if (event === "vote" && (typeof args.yea !== "bigint" || args.yea > 10_000n)) throw new Error("dao_vote_invalid");
      if ((event === "flagged" || event === "vetoed") && new TextEncoder().encode(String(args.reason)).length > 256) {
        throw new Error("dao_reason_invalid");
      }
      if (event === "vote") {
        if (params.includeVotes === false) continue;
        const account = String(args.account).toLowerCase();
        const vote: DaoVoteUpdate = {
          account, weight: String(args.weight),
          role: collectiveAccounts === null ? undefined : account === collectiveAccounts.ybc ? "ybc"
            : account === collectiveAccounts.delegated ? "delegated" : "voter",
          supportBps: Number(args.yea), logIndex: log.logIndex,
        };
        const previous = actions.at(-1);
        const group = previous?.kind === "dao_proposal" && previous.event === "vote" &&
          previous.txHash === log.transactionHash && previous.proposal.id === p.id ? previous : undefined;
        const action: DaoVoteAction = {
          ...base, kind: "dao_proposal", event, proposal: p, configuration,
          // Keep the first log's order/source; the last log's receipt covers the whole group.
          logIndex: group?.logIndex ?? base.logIndex,
          source: group?.source ?? base.source,
          votes: [...(group?.votes ?? []), vote],
        };
        if (group) actions[actions.length - 1] = action;
        else actions.push(action);
        continue;
      }
      actions.push({
        ...base, kind: "dao_proposal", event, proposal: p, configuration,
        actor: event === "proposed" ? p.proposer : event === "executed" ? String(args.executor).toLowerCase() : undefined,
        reason: event === "flagged" || event === "vetoed" ? String(args.reason) : undefined,
      });
    } else {
      actions.push({
        ...base, kind: "dao_configuration", contract: log.address, event: name,
        values: Object.fromEntries(Object.entries(args).map(([key, value]) =>
          [key, typeof value === "boolean" ? value : String(value).toLowerCase()])),
      });
    }
  }

  let ordering = (events.at(-1)?.log.logIndex ?? -1) + 1;
  for (const id of orderedIds) {
    const tracked = proposals[id]!;
    // A late event on a closed proposal must not recreate lifecycle notifications.
    const newlyProposed = events.some(e => e.log.address === DAO_VOTING && e.name === "Propose" && String(e.args.idx) === id);
    if (params.state.proposals[id] || newlyProposed) {
      const due = pendingDaoMilestones(tracked, configuration, terminal.timestamp!).filter(m => m.at <= terminal.timestamp!);
      for (const milestone of due) {
        const eventId = `dao:${DAO_VOTING}:${id}:${milestone.key}`;
        actions.push({
          domainId: "dao", kind: "dao_proposal", event: milestone.kind, eventId,
          proposal: tracked.proposal, configuration, deadline: milestone.deadline,
          timestamp: terminal.timestamp!, blockNumber: toBlock, blockHash: terminal.hash, logIndex: ordering,
          txHash: "", source: { kind: "synthetic", metricId: eventId, blockHash: terminal.hash, orderingIndex: ordering++ },
        });
      }
      proposals[id] = { ...tracked, notified: [...tracked.notified, ...due.map(m => m.key)] };
    }
    const p = tracked.proposal;
    if (p.retracted || p.flagged || p.executed || terminal.timestamp! >= daoTiming(p, configuration).executeEnd) delete proposals[id];
  }
  const state = loadDaoState({ version: 1, configuration, proposals });
  return { terminalBlock: toBlock, terminalHash: terminal.hash, state, actions: await addVoteInfluence(rpc, terminal, actions) };
}
