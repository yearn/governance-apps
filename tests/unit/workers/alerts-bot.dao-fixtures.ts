import { vi } from "vitest";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, encodeFunctionResult, type Abi, type Hex } from "viem";
import { DAO_DEPLOYMENT_BLOCK, DAO_EPOCH, DAO_EXECUTOR, DAO_GENESIS, DAO_READS, DAO_VOTER, DAO_VOTING } from "@/workers/alerts-bot/src/domains/dao/contracts";
import type { DaoAlertAction, DaoAlertConfiguration, DaoAlertProposal, DaoAlertState } from "@/workers/alerts-bot/src/domains/dao/types";
import type { RpcBlock, RpcCallRequest, RpcClient, RpcLog } from "@/workers/alerts-bot/src/rpc";

export const ACCOUNT = "0x1111111111111111111111111111111111111111";
export const GUARDIAN = "0x2222222222222222222222222222222222222222";
export const hash = (n: number): Hex => `0x${n.toString(16).padStart(64, "0")}`;
export const configuration: DaoAlertConfiguration = {
  voteStart: DAO_EPOCH / 2, executeDelay: 86_400, executeGuard: true,
  voter: DAO_VOTER, executor: DAO_EXECUTOR, operator: ACCOUNT, decayLength: 86_400,
};
export const proposal: DaoAlertProposal = {
  id: "0", proposer: ACCOUNT, epoch: 20, digest: hash(200), scriptHash: hash(201),
  threshold: 5_000, votes: "10000000000000000000", yea: "6000000000000000000",
  retracted: false, flagged: false, vetoed: false, executed: false,
};
export const voteStart = DAO_GENESIS + proposal.epoch * DAO_EPOCH + configuration.voteStart;
export const voteEnd = DAO_GENESIS + (proposal.epoch + 1) * DAO_EPOCH;
export const trackedState = (p: DaoAlertProposal = proposal, notified: string[] = []): DaoAlertState => ({
  version: 1, configuration, proposals: { [p.id]: { proposal: p, notified } },
});

export function daoAction(event: Extract<DaoAlertAction, { kind: "dao_proposal" }>["event"], p = proposal): DaoAlertAction {
  const timestamp = {
    proposed: voteStart - 172_800, vote: voteStart + 12, retracted: voteStart - 86_400,
    flagged: voteStart - 86_400, vetoed: voteStart + 12, executed: voteEnd + 86_412,
    discussion_ending: voteStart - 3_600, voting_open: voteStart, voting_ending: voteEnd - 3_600,
    vote_decay: voteEnd - 86_400 + 1, approved: voteEnd, rejected: voteEnd, vetoed_result: voteEnd,
    execution_ready: voteEnd + 86_400, execution_ending: voteEnd + DAO_EPOCH - 3_600, expired: voteEnd + DAO_EPOCH,
  }[event];
  const onchain = ["proposed", "vote", "retracted", "flagged", "vetoed", "executed"].includes(event);
  const observed = { ...p };
  if (["proposed", "retracted", "flagged", "discussion_ending", "voting_open"].includes(event)) {
    observed.votes = "0";
    observed.yea = "0";
  }
  if (event === "rejected") observed.yea = "0";
  if (event === "retracted" || event === "flagged") observed.retracted = true;
  if (event === "flagged") observed.flagged = true;
  if (event === "vetoed" || event === "vetoed_result") observed.vetoed = true;
  if (event === "executed") observed.executed = true;
  return {
    domainId: "dao", kind: "dao_proposal", event, eventId: `test:${event}`, blockNumber: DAO_DEPLOYMENT_BLOCK,
    blockHash: hash(DAO_DEPLOYMENT_BLOCK),
    timestamp, logIndex: 0, txHash: onchain ? hash(999) : "",
    source: onchain ? { kind: "onchain", txHash: hash(999), logIndex: 0 }
      : { kind: "synthetic", metricId: `test:${event}`, blockHash: hash(DAO_DEPLOYMENT_BLOCK), orderingIndex: 0 },
    proposal: observed, configuration, actor: ACCOUNT, weight: "5000000000000000000", supportBps: 10_000,
    reason: "<b>untrusted & reason</b>",
  };
}

export function daoLog(abi: Abi, name: string, args: Record<string, unknown>, blockNumber = DAO_DEPLOYMENT_BLOCK, logIndex = 0, address = DAO_VOTING): RpcLog {
  const event = abi.find(item => item.type === "event" && item.name === name);
  if (!event || event.type !== "event") throw new Error("test_event_missing");
  const inputs = event.inputs.filter(i => !i.indexed);
  return {
    address, blockNumber, logIndex, blockHash: hash(blockNumber), transactionHash: hash(blockNumber + 10_000), removed: false,
    topics: encodeEventTopics({ abi, eventName: name, args } as never) as string[],
    data: encodeAbiParameters(inputs, inputs.map(i => args[i.name!])),
  };
}

export function daoRpc(options: {
  startTime?: number;
  logs?: RpcLog[];
  proposal?: DaoAlertProposal | ((block: number, id: string) => DaoAlertProposal);
  config?: DaoAlertConfiguration | ((block: number) => DaoAlertConfiguration);
  genesis?: number;
} = {}) {
  const block = (number: number): RpcBlock => ({
    number, hash: hash(number), parentHash: hash(number - 1), timestamp: (options.startTime ?? voteStart - 172_800) + (number - DAO_DEPLOYMENT_BLOCK) * 12,
  });
  const call = vi.fn(async (request: RpcCallRequest | RpcCallRequest[], ref: { blockHash: string; requireCanonical: boolean }) => {
    if (!ref.requireCanonical) throw new Error("test_noncanonical_read");
    const number = Number(BigInt(ref.blockHash));
    const config = typeof options.config === "function" ? options.config(number) : options.config ?? configuration;
    const one = (r: RpcCallRequest) => {
      const decoded = decodeFunctionData({ abi: DAO_READS, data: r.data as Hex });
      let result: unknown;
      switch (decoded.functionName) {
        case "genesis": result = BigInt(options.genesis ?? DAO_GENESIS); break;
        case "vote_start": result = BigInt(config.voteStart); break;
        case "execute_delay": result = BigInt(config.executeDelay); break;
        case "execute_guard": result = config.executeGuard; break;
        case "voter": result = config.voter; break;
        case "executor": result = config.executor; break;
        case "operator": result = config.operator; break;
        case "decay_length": result = BigInt(config.decayLength ?? 0); break;
        case "proposals": {
          const p = typeof options.proposal === "function" ? options.proposal(number, String(decoded.args![0])) : options.proposal ?? proposal;
          result = { proposer: p.proposer, epoch: BigInt(p.epoch), ipfs: p.digest, script_hash: p.scriptHash,
            threshold: BigInt(p.threshold), votes: BigInt(p.votes), yea: BigInt(p.yea),
            retracted: p.retracted, executed: p.executed, flagged: p.flagged, vetoed: p.vetoed };
          break;
        }
      }
      return encodeFunctionResult({ abi: DAO_READS, functionName: decoded.functionName, result } as never);
    };
    return Array.isArray(request) ? request.map(one) : one(request);
  });
  const rpc = {
    call, getBlockNumber: vi.fn(async () => DAO_DEPLOYMENT_BLOCK + 6),
    getBlockByNumber: vi.fn(async (n: number) => block(n)),
    getLogs: vi.fn(async ({ fromBlock, toBlock }: { fromBlock: number; toBlock: number }) =>
      (options.logs ?? []).filter(l => l.blockNumber! >= fromBlock && l.blockNumber! <= toBlock)),
  } as unknown as RpcClient;
  return { rpc, block, call };
}
