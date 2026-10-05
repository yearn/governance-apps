import {
  decodeEventLog, decodeFunctionResult, encodeAbiParameters, encodeFunctionData,
  keccak256, type Hex,
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
import type { DaoAlertAction, DaoAlertConfiguration, DaoAlertProposal, DaoAlertState, DaoTrackedProposal } from "./types";

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
      if (event === "vote" && params.includeVotes === false) continue;
      actions.push({
        ...base, kind: "dao_proposal", event, proposal: p, configuration,
        actor: event === "proposed" ? p.proposer : event === "vote" ? String(args.account).toLowerCase()
          : event === "executed" ? String(args.executor).toLowerCase() : undefined,
        reason: event === "flagged" || event === "vetoed" ? String(args.reason) : undefined,
        weight: event === "vote" ? String(args.weight) : undefined,
        supportBps: event === "vote" ? Number(args.yea) : undefined,
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
  return { terminalBlock: toBlock, terminalHash: terminal.hash, state, actions };
}
