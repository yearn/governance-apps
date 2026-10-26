import {
  decodeEventLog, decodeFunctionResult, encodeAbiParameters, encodeFunctionData,
  keccak256, zeroAddress, type Hex,
} from "viem";
import { z } from "zod";
import { ALERT_RPC_MAX_BATCH_SIZE, RpcRequestError, type RpcBlock, type RpcClient } from "../../rpc";
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

const collectiveAccountChanges = new Set(["SetYBC", "SetDelegatedStaking", "SetVoteParameters", "SetYBCWeightAggregator"]);
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

async function reads(rpc: RpcClient, blockHash: string, target: string, names: readonly string[], args: readonly (readonly unknown[])[] = []) {
  const results: unknown[] = [];
  for (let offset = 0; offset < names.length; offset += ALERT_RPC_MAX_BATCH_SIZE) {
    const batch = names.slice(offset, offset + ALERT_RPC_MAX_BATCH_SIZE);
    const values = await rpc.call(batch.map((functionName, i) => ({
      to: target,
      data: encodeFunctionData({ abi: DAO_READS, functionName, args: args[offset + i] ?? [] } as never),
    })), { blockHash, requireCanonical: true });
    if (values.length !== batch.length) throw new Error("dao_read_incomplete");
    for (const [i, functionName] of batch.entries()) {
      results.push(decodeFunctionResult({ abi: DAO_READS, functionName, data: values[i] as Hex } as never));
    }
  }
  return results;
}

async function readConfiguration(rpc: RpcClient, block: RpcBlock): Promise<DaoAlertConfiguration> {
  const [genesis, voteStart, executeDelay, executeGuard, voter, executor, operator] = await reads(
    rpc, block.hash, DAO_VOTING, ["genesis", "vote_start", "execute_delay", "execute_guard", "voter", "executor", "operator"],
  );
  if (genesis !== BigInt(DAO_GENESIS)) throw new Error("dao_genesis_mismatch");
  let decayLength: number | null = null;
  if (String(voter).toLowerCase() === DAO_VOTER) {
    const [voterGenesis, decay] = await reads(rpc, block.hash, DAO_VOTER, ["genesis", "decay_length"]);
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
  const values = await reads(rpc, block.hash, DAO_VOTER, ["ybc", "delegated_staking"]);
  const ybc = address.parse(String(values[0]).toLowerCase());
  const delegated = address.parse(String(values[1]).toLowerCase());
  if (ybc === delegated || ybc === zeroAddress || delegated === zeroAddress) return null;
  return { ybc, delegated };
}

async function addVoteInfluence(rpc: RpcClient, block: RpcBlock, actions: readonly DaoAlertAction[]): Promise<readonly DaoAlertAction[]> {
  const groups = actions.filter((action): action is DaoVoteAction => action.kind === "dao_proposal" && action.event === "vote");
  const pools = new Map<string, { ybc: bigint; delegated: bigint; members: string[] }>();
  for (const action of groups) {
    for (const [i, vote] of action.votes.entries()) {
      if (vote.role !== "ybc" && vote.role !== "delegated") continue;
      const pool = pools.get(action.proposal.id) ?? { ybc: 0n, delegated: 0n, members: [] };
      pool[vote.role] = BigInt(vote.weight);
      if (vote.role === "delegated" && action.votes[i - 1]?.role === "voter" && action.votes[i + 1]?.role === "ybc") {
        pool.members.push(action.votes[i - 1]!.account);
      }
      pools.set(action.proposal.id, pool);
    }
  }
  const ids = [...pools.keys()].filter(id => pools.get(id)!.members.length > 0);
  if (ids.length === 0) return actions;
  const names = ids.map(() => "ybc_votes");
  const args = ids.map(id => [DAO_VOTING, BigInt(id)]);
  const [values, previous] = await Promise.all([
    reads(rpc, block.hash, DAO_VOTER, names, args),
    reads(rpc, block.parentHash, DAO_VOTER, names, args),
  ]);
  const totals = new Map(ids.map((id, i) => {
    const total = (values[i] as readonly [bigint, bigint])[0];
    return [id, { total, delta: total - (previous[i] as readonly [bigint, bigint])[0] }];
  }));
  const accounts = [...new Set(ids.flatMap(id => pools.get(id)!.members.length > 1 ? pools.get(id)!.members : []))];
  const weights = new Map<string, bigint>();
  if (accounts.length > 0) {
    const [aggregator] = await reads(rpc, block.hash, DAO_VOTER, ["ybc_weight_aggregator"]);
    const values = await reads(rpc, block.hash, String(aggregator), accounts.map(() => "weight"), accounts.map(account => [account]));
    for (const [i, account] of accounts.entries()) weights.set(account, values[i] as bigint);
  }
  return actions.map(action => {
    if (action.kind !== "dao_proposal" || action.event !== "vote") return action;
    const pool = pools.get(action.proposal.id);
    if (!pool) return action;
    return { ...action, votes: action.votes.map(vote => {
      if (vote.role !== "voter" || !pool.members.includes(vote.account)) return vote;
      const { total, delta } = totals.get(action.proposal.id)!;
      // One member's recorded weight is exact; same-block batches use current weight, best effort.
      const weight = pool.members.length === 1 ? delta : weights.get(vote.account)!;
      const member = weight > total ? total : weight;
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
  const values = await reads(rpc, terminal.hash, DAO_VOTING, orderedIds.map(() => "proposals"), orderedIds.map(id => [BigInt(id)]));
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
