import { decodeEventLog, type Abi, type Address, type Hex } from "viem";

import {
  BONUS_DISTRIBUTOR,
  FUNDING_DISTRIBUTOR,
  REVENUE_RECIPIENT,
  TEAM_ACCOUNTANT,
  TEAM_REGISTRY,
  TEAMS_BUDGET_GENESIS,
  TEAMS_PERIOD_SECONDS,
  YBC_BONUS_RECIPIENT,
} from "../../contracts";
import {
  BONUS_DISTRIBUTOR_EVENT_TOPICS,
  BONUS_DISTRIBUTOR_EVENTS_ABI,
  FUNDING_DISTRIBUTOR_EVENT_TOPICS,
  FUNDING_DISTRIBUTOR_EVENTS_ABI,
  REVENUE_RECIPIENT_EVENT_TOPICS,
  REVENUE_RECIPIENT_EVENTS_ABI,
  TEAM_ACCOUNTANT_EVENT_TOPICS,
  TEAM_ACCOUNTANT_EVENTS_ABI,
  TEAM_EVENT_TOPICS,
  TEAM_EVENTS_ABI,
  TEAM_REGISTRY_EVENT_TOPICS,
  TEAM_REGISTRY_EVENTS_ABI,
  TEAMS_READ_ABI,
  TOKEN_METADATA_ABI,
  YBC_BONUS_RECIPIENT_EVENT_TOPICS,
  YBC_BONUS_RECIPIENT_EVENTS_ABI,
} from "../../product-abis";
import type {
  AlertTokenAmount,
  ProductAlertAction,
  TeamPeriodFinancials,
} from "../../product-types";
import {
  isRpcRangeTooLargeError,
  type RpcBlock,
  type RpcClient,
} from "../../rpc";
import {
  asAddress,
  asBigint,
  asBoolean,
  asRecord,
  assertCanonicalProductLog,
  canonicalProductLog,
  exactlyOne,
  exactBlock,
  exactRead,
  normalizeAddress,
  onchainSource,
  productEventId,
  sortProductLogs,
  type CanonicalProductLog,
} from "../product-scanner-utils";

interface StoredTeamReference {
  readonly address: string;
  readonly index: string;
}

export interface StoredTeamsState {
  readonly teams: readonly StoredTeamReference[];
}

export interface TeamsState {
  readonly teams: ReadonlyMap<Address, bigint>;
}

export interface TeamsScanFailure {
  readonly code: "range_too_large" | "scan_failed";
  readonly reason: string;
  readonly contract: string | null;
  readonly blockNumber: number | null;
  readonly transactionHash: string | null;
  readonly eventName: string | null;
}

export interface TeamsScanResult {
  readonly state: TeamsState;
  readonly actions: readonly ProductAlertAction[];
  readonly failure: TeamsScanFailure | null;
}

const FIXED_ADDRESSES = [
  TEAM_REGISTRY,
  TEAM_ACCOUNTANT,
  REVENUE_RECIPIENT,
  FUNDING_DISTRIBUTOR,
  BONUS_DISTRIBUTOR,
  YBC_BONUS_RECIPIENT,
].map(normalizeAddress);

const FIXED_TOPICS = [
  ...Object.values(TEAM_REGISTRY_EVENT_TOPICS),
  ...Object.values(TEAM_ACCOUNTANT_EVENT_TOPICS),
  ...Object.values(REVENUE_RECIPIENT_EVENT_TOPICS),
  ...Object.values(FUNDING_DISTRIBUTOR_EVENT_TOPICS),
  ...Object.values(BONUS_DISTRIBUTOR_EVENT_TOPICS),
  ...Object.values(YBC_BONUS_RECIPIENT_EVENT_TOPICS),
];

function decoded(
  log: CanonicalProductLog,
  abi: Abi,
): { readonly eventName: string; readonly args: Record<string, unknown> } {
  const result = decodeEventLog({
    abi,
    data: log.data,
    topics: log.topics as [Hex, ...Hex[]],
    strict: true,
  });
  if (result.eventName === undefined) throw new Error("teams_event_name_missing");
  return {
    eventName: result.eventName,
    args: result.args === undefined
      ? {}
      : asRecord(result.args, "teams_event_args"),
  };
}

function fixedAbi(address: Address): Abi {
  switch (address) {
    case normalizeAddress(TEAM_REGISTRY): return TEAM_REGISTRY_EVENTS_ABI;
    case normalizeAddress(TEAM_ACCOUNTANT): return TEAM_ACCOUNTANT_EVENTS_ABI;
    case normalizeAddress(REVENUE_RECIPIENT): return REVENUE_RECIPIENT_EVENTS_ABI;
    case normalizeAddress(FUNDING_DISTRIBUTOR): return FUNDING_DISTRIBUTOR_EVENTS_ABI;
    case normalizeAddress(BONUS_DISTRIBUTOR): return BONUS_DISTRIBUTOR_EVENTS_ABI;
    case normalizeAddress(YBC_BONUS_RECIPIENT): return YBC_BONUS_RECIPIENT_EVENTS_ABI;
    default: throw new Error("teams_fixed_emitter_invalid");
  }
}

function blockPeriod(timestamp: number): bigint {
  if (timestamp < TEAMS_BUDGET_GENESIS) throw new Error("teams_period_before_genesis");
  return BigInt(Math.floor((timestamp - TEAMS_BUDGET_GENESIS) / TEAMS_PERIOD_SECONDS));
}

function periodStart(period: bigint): bigint {
  return BigInt(TEAMS_BUDGET_GENESIS) + period * BigInt(TEAMS_PERIOD_SECONDS);
}

async function teamName(rpc: RpcClient, block: RpcBlock, team: Address): Promise<string> {
  const value = await exactRead({ rpc, block, address: team, abi: TEAMS_READ_ABI, functionName: "name" });
  if (typeof value !== "string" || value.length === 0 || value.length > 100) {
    throw new Error("teams_name_invalid");
  }
  return value;
}

async function readAddress(
  rpc: RpcClient,
  block: RpcBlock,
  contract: Address,
  functionName: "owner" | "registry" | "treasury" | "recovery_auction" | "token",
): Promise<Address> {
  return asAddress(
    await exactRead({ rpc, block, address: contract, abi: TEAMS_READ_ABI, functionName }),
    `teams_${functionName}`,
  );
}

async function readUint(
  rpc: RpcClient,
  block: RpcBlock,
  contract: Address,
  functionName: "num_teams" | "used",
  args: readonly unknown[] = [],
): Promise<bigint> {
  return asBigint(
    await exactRead({ rpc, block, address: contract, abi: TEAMS_READ_ABI, functionName, args }),
    `teams_${functionName}`,
  );
}

async function assertRegisteredTeam(
  rpc: RpcClient,
  block: RpcBlock,
  team: Address,
  index: bigint,
): Promise<void> {
  const registry = normalizeAddress(TEAM_REGISTRY);
  const [teamRegistry, indexedTeam, registered] = await Promise.all([
    exactRead({ rpc, block, address: team, abi: TEAMS_READ_ABI, functionName: "registry" }),
    exactRead({ rpc, block, address: registry, abi: TEAMS_READ_ABI, functionName: "teams", args: [index] }),
    exactRead({ rpc, block, address: registry, abi: TEAMS_READ_ABI, functionName: "is_team", args: [team] }),
  ]);
  if (
    asAddress(teamRegistry, "teams_team_registry") !== registry ||
    asAddress(indexedTeam, "teams_indexed_team") !== team ||
    !asBoolean(registered, "teams_registered_team")
  ) {
    throw new Error("teams_registry_membership_mismatch");
  }
}

async function financials(
  rpc: RpcClient,
  block: RpcBlock,
  team: Address,
  period: bigint,
): Promise<TeamPeriodFinancials> {
  const [revenue, cost] = await Promise.all([
    exactRead({ rpc, block, address: normalizeAddress(TEAM_ACCOUNTANT), abi: TEAMS_READ_ABI, functionName: "team_revenues", args: [team, period] }),
    exactRead({ rpc, block, address: normalizeAddress(TEAM_ACCOUNTANT), abi: TEAMS_READ_ABI, functionName: "team_costs", args: [team, period] }),
  ]);
  return Object.freeze({
    revenue: asBigint(revenue, "teams_revenue"),
    cost: asBigint(cost, "teams_cost"),
  });
}

async function tokenAmount(
  rpc: RpcClient,
  block: RpcBlock,
  token: Address,
  value: bigint,
): Promise<AlertTokenAmount> {
  try {
    const [symbol, decimals] = await Promise.all([
      exactRead({ rpc, block, address: token, abi: TOKEN_METADATA_ABI, functionName: "symbol" }),
      exactRead({ rpc, block, address: token, abi: TOKEN_METADATA_ABI, functionName: "decimals" }),
    ]);
    if (typeof symbol !== "string" || typeof decimals !== "number" || decimals < 0 || decimals > 255) {
      throw new Error("teams_token_metadata_invalid");
    }
    return Object.freeze({ token, symbol, decimals, value });
  } catch {
    return Object.freeze({ token, symbol: null, decimals: null, value });
  }
}

async function approval(
  rpc: RpcClient,
  block: RpcBlock,
  index: bigint,
): Promise<readonly [Address, bigint, Address, bigint, bigint, bigint]> {
  const value = await exactRead({
    rpc,
    block,
    address: normalizeAddress(FUNDING_DISTRIBUTOR),
    abi: TEAMS_READ_ABI,
    functionName: "approvals",
    args: [index],
  });
  if (!Array.isArray(value) || value.length !== 6) throw new Error("teams_approval_invalid");
  return [
    asAddress(value[0], "teams_approval_team"),
    asBigint(value[1], "teams_approval_period"),
    asAddress(value[2], "teams_approval_token"),
    asBigint(value[3], "teams_approval_amount"),
    asBigint(value[4], "teams_approval_duration"),
    asBigint(value[5], "teams_approval_used"),
  ];
}

function action<K extends ProductAlertAction["kind"]>(
  log: CanonicalProductLog,
  kind: K,
  details: Extract<ProductAlertAction, { kind: K }>["details"],
): Extract<ProductAlertAction, { kind: K }> {
  return {
    domainId: "teams",
    kind,
    details,
    eventId: productEventId(log, kind),
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
    source: onchainSource(log),
  } as Extract<ProductAlertAction, { kind: K }>;
}

export function createEmptyTeamsState(): TeamsState {
  return Object.freeze({ teams: new Map<Address, bigint>() });
}

export function serializeTeamsState(state: TeamsState): StoredTeamsState {
  return Object.freeze({
    teams: Object.freeze([...state.teams.entries()]
      .sort((left, right) => left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : 0)
      .map(([address, index]) => Object.freeze({ address, index: index.toString() }))),
  });
}

export function loadTeamsState(value: StoredTeamsState): TeamsState {
  if (typeof value !== "object" || value === null || !Array.isArray(value.teams)) {
    throw new Error("teams_state_invalid");
  }
  const teams = new Map<Address, bigint>();
  const indexes = new Set<string>();
  for (const item of value.teams) {
    if (typeof item !== "object" || item === null || !/^\d+$/.test(item.index)) {
      throw new Error("teams_state_invalid");
    }
    const address = normalizeAddress(item.address);
    if (teams.has(address) || indexes.has(item.index)) throw new Error("teams_state_duplicate");
    teams.set(address, BigInt(item.index));
    indexes.add(item.index);
  }
  return Object.freeze({ teams });
}

function companionKey(
  args: Record<string, unknown>,
  type: "revenue" | "cost",
): string {
  return [
    type,
    asAddress(args.team, "teams_adjust_team"),
    asBigint(args.period, "teams_adjust_period"),
    asBigint(args.amount, "teams_adjust_amount"),
    asBoolean(args.increment, "teams_adjust_increment") ? "1" : "0",
  ].join(":");
}

interface TeamBonusBundle {
  readonly claims: readonly CanonicalProductLog[];
  readonly deposit: CanonicalProductLog | null;
}

function buildTeamBonusBundles(
  byTransaction: ReadonlyMap<string, readonly CanonicalProductLog[]>,
  decodedByLog: ReadonlyMap<CanonicalProductLog, ReturnType<typeof decoded>>,
  recordEvidence: (log: CanonicalProductLog, eventName: string) => void,
): ReadonlyMap<CanonicalProductLog, TeamBonusBundle> {
  const bundles = new Map<CanonicalProductLog, TeamBonusBundle>();
  for (const transactionLogs of byTransaction.values()) {
    let pending: CanonicalProductLog[] = [];
    const finish = (deposit: CanonicalProductLog | null) => {
      const evidence = deposit ?? pending[0] ?? null;
      if (evidence !== null) {
        recordEvidence(evidence, decodedByLog.get(evidence)!.eventName);
      }
      if (pending.length === 0) {
        if (deposit !== null) throw new Error("teams_bonus_deposit_without_claim");
        return;
      }
      const values = pending.map((claim) => decodedByLog.get(claim)!.args);
      const team = asAddress(values[0]!.team, "teams_bonus_team");
      if (values.some((value) => asAddress(value.team, "teams_bonus_team") !== team)) {
        throw new Error("teams_bonus_claim_run_ambiguous");
      }
      const ybcAmount = values.reduce(
        (sum, value) => sum + asBigint(value.ybc_amount, "teams_bonus_ybc"),
        0n,
      );
      if (ybcAmount === 0n) {
        if (deposit !== null) throw new Error("teams_bonus_zero_deposit_unexpected");
      } else {
        if (deposit === null) throw new Error("teams_bonus_deposit_missing");
        const args = decodedByLog.get(deposit)!.args;
        if (
          asAddress(args.depositor, "teams_bonus_depositor") !== normalizeAddress(BONUS_DISTRIBUTOR) ||
          asBigint(args.amount, "teams_bonus_deposit") !== ybcAmount
        ) {
          throw new Error("teams_bonus_deposit_mismatch");
        }
      }
      bundles.set(pending[0]!, Object.freeze({
        claims: Object.freeze(pending),
        deposit,
      }));
      pending = [];
    };

    for (const candidate of transactionLogs) {
      const event = decodedByLog.get(candidate)!;
      if (candidate.address === normalizeAddress(BONUS_DISTRIBUTOR) && event.eventName === "ClaimBonus") {
        recordEvidence(candidate, event.eventName);
        if (
          pending.length > 0 &&
          asAddress(decodedByLog.get(pending[0]!)!.args.team, "teams_bonus_team") !==
            asAddress(event.args.team, "teams_bonus_team")
        ) {
          finish(null);
        }
        pending.push(candidate);
      } else if (
        candidate.address === normalizeAddress(YBC_BONUS_RECIPIENT) &&
        event.eventName === "Deposit"
      ) {
        if (
          asAddress(event.args.depositor, "teams_bonus_depositor") ===
          normalizeAddress(BONUS_DISTRIBUTOR)
        ) {
          recordEvidence(candidate, event.eventName);
          finish(candidate);
        }
      }
    }
    finish(null);
  }
  return bundles;
}

export async function scanTeamsBlocks(params: {
  readonly rpc: RpcClient;
  readonly fromBlock: number;
  readonly toBlock: number;
  readonly state: TeamsState;
}): Promise<TeamsScanResult> {
  const teams = new Map(params.state.teams);
  let failureEvidence: Omit<TeamsScanFailure, "code" | "reason"> = {
    contract: null,
    blockNumber: null,
    transactionHash: null,
    eventName: null,
  };
  const recordEvidence = (log: CanonicalProductLog, eventName: string | null) => {
    failureEvidence = {
      contract: log.address,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      eventName,
    };
  };
  try {
    const fixedRaw = await params.rpc.getLogs({
      address: FIXED_ADDRESSES,
      topics: [FIXED_TOPICS],
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
    });
    const fixed = sortProductLogs(fixedRaw.map(canonicalProductLog).filter((log): log is CanonicalProductLog => log !== null));
    const blockCache = new Map<number, Promise<RpcBlock>>();
    const getBlock = (number: number) => {
      const cached = blockCache.get(number);
      if (cached !== undefined) return cached;
      const pending = exactBlock(params.rpc, number);
      blockCache.set(number, pending);
      return pending;
    };

    for (const log of fixed) {
      recordEvidence(log, null);
      assertCanonicalProductLog(log, await getBlock(log.blockNumber));
      if (log.address !== normalizeAddress(TEAM_REGISTRY)) continue;
      const event = decoded(log, TEAM_REGISTRY_EVENTS_ABI);
      recordEvidence(log, event.eventName);
      if (event.eventName !== "AddTeam") continue;
      const team = asAddress(event.args.team, "teams_add_team");
      const index = asBigint(event.args.idx, "teams_add_index");
      if (teams.has(team)) throw new Error("teams_duplicate_team");
      await assertRegisteredTeam(params.rpc, await getBlock(log.blockNumber), team, index);
      teams.set(team, index);
    }

    const dynamicRaw = teams.size === 0
      ? []
      : await params.rpc.getLogs({
          address: [...teams.keys()],
          topics: [Object.values(TEAM_EVENT_TOPICS)],
          fromBlock: params.fromBlock,
          toBlock: params.toBlock,
        });
    const dynamic = sortProductLogs(dynamicRaw.map(canonicalProductLog).filter((log): log is CanonicalProductLog => log !== null));
    const logs = sortProductLogs([...fixed, ...dynamic]);
    for (const log of dynamic) {
      recordEvidence(log, null);
      assertCanonicalProductLog(log, await getBlock(log.blockNumber));
    }
    const nameCache = new Map<string, Promise<string>>();
    const getName = (block: RpcBlock, team: Address) => {
      const key = `${block.hash}:${team}`;
      const cached = nameCache.get(key);
      if (cached !== undefined) return cached;
      const pending = teamName(params.rpc, block, team);
      nameCache.set(key, pending);
      return pending;
    };

    const decodedByLog = new Map<CanonicalProductLog, ReturnType<typeof decoded>>();
    for (const log of logs) {
      recordEvidence(log, null);
      const event = decoded(log, teams.has(log.address) ? TEAM_EVENTS_ABI : fixedAbi(log.address));
      recordEvidence(log, event.eventName);
      decodedByLog.set(log, event);
    }
    const byTransaction = new Map<string, CanonicalProductLog[]>();
    for (const log of logs) {
      const group = byTransaction.get(log.transactionHash) ?? [];
      group.push(log);
      byTransaction.set(log.transactionHash, group);
    }
    const bonusBundles = buildTeamBonusBundles(byTransaction, decodedByLog, recordEvidence);
    const actions: ProductAlertAction[] = [];

    for (const log of logs) {
      const event = decodedByLog.get(log)!;
      recordEvidence(log, event.eventName);
      const block = await getBlock(log.blockNumber);

      if (log.address === normalizeAddress(TEAM_REGISTRY)) {
        if (event.eventName === "AddTeam") {
          const team = asAddress(event.args.team, "teams_add_team");
          const index = asBigint(event.args.idx, "teams_add_index");
          actions.push(action(log, "team_added", {
            team,
            teamName: await getName(block, team),
            teamIndex: index,
            owner: await readAddress(params.rpc, block, team, "owner"),
            currentPeriod: blockPeriod(block.timestamp!),
          }));
        } else if (event.eventName === "RetireTeam") {
          const team = asAddress(event.args.team, "teams_retire_team");
          const retirementPeriod = asBigint(event.args.period, "teams_retire_period");
          actions.push(action(log, "team_retirement_scheduled", {
            team,
            teamName: await getName(block, team),
            currentPeriod: blockPeriod(block.timestamp!),
            retirementPeriod,
            retirementTime: periodStart(retirementPeriod),
          }));
        } else if (event.eventName === "Deprecate") {
          actions.push(action(log, "teams_registry_deprecated", {
            registry: normalizeAddress(TEAM_REGISTRY),
            successor: asAddress(event.args.successor, "teams_successor"),
            teamCount: await readUint(params.rpc, block, normalizeAddress(TEAM_REGISTRY), "num_teams"),
          }));
        } else if (event.eventName === "MigrateTeam") {
          const team = asAddress(event.args.team, "teams_migrate_team");
          const companions = (byTransaction.get(log.transactionHash) ?? []).filter((candidate) => {
            const value = decodedByLog.get(candidate)!;
            return candidate.address === team && value.eventName === "Migrate";
          });
          const companion = exactlyOne(
            companions,
            "teams_migration_companion_missing",
            "teams_migration_companion_ambiguous",
          );
          const migrated = decodedByLog.get(companion)!;
          actions.push(action(log, "team_migrated", {
            team,
            teamName: await getName(block, team),
            previousRegistry: normalizeAddress(TEAM_REGISTRY),
            currentRegistry: asAddress(migrated.args.registry, "teams_migration_registry"),
          }));
        }
        continue;
      }

      if (teams.has(log.address)) {
        const team = log.address;
        const teamLabel = await getName(block, team);
        if (event.eventName === "PendingOwner") {
          actions.push(action(log, "team_owner_pending", {
            team,
            teamName: teamLabel,
            currentOwner: await readAddress(params.rpc, block, team, "owner"),
            pendingOwner: asAddress(event.args.owner, "teams_pending_owner"),
          }));
        } else if (event.eventName === "SetOwner") {
          if (log.blockNumber === 0) throw new Error("teams_owner_prior_block_missing");
          const prior = await getBlock(log.blockNumber - 1);
          actions.push(action(log, "team_owner_set", {
            team,
            teamName: teamLabel,
            previousOwner: await readAddress(params.rpc, prior, team, "owner"),
            currentOwner: asAddress(event.args.owner, "teams_owner"),
          }));
        } else if (event.eventName === "DepositRevenue") {
          const period = asBigint(event.args.period, "teams_revenue_period");
          const revenue = asBigint(event.args.revenue, "teams_revenue_value");
          const amountValue = asBigint(event.args.amount, "teams_revenue_amount");
          const token = asAddress(event.args.token, "teams_revenue_token");
          const accountingCandidates = (byTransaction.get(log.transactionHash) ?? []).filter((candidate) => {
            if (candidate.address !== normalizeAddress(TEAM_ACCOUNTANT)) return false;
            const value = decodedByLog.get(candidate)!;
            return value.eventName === "AdjustRevenue" &&
              asAddress(value.args.operator, "teams_revenue_operator") === normalizeAddress(REVENUE_RECIPIENT) &&
              asAddress(value.args.team, "teams_revenue_team") === team &&
              asBigint(value.args.period, "teams_revenue_period") === period;
          });
          const companion = exactlyOne(
            accountingCandidates,
            "teams_revenue_companion_missing",
            "teams_revenue_companion_ambiguous",
          );
          if (
            companionKey(decodedByLog.get(companion)!.args, "revenue") !==
              ["revenue", team, period, revenue, "1"].join(":")
          ) {
            throw new Error("teams_revenue_companion_mismatch");
          }
          const recipientCandidates = (byTransaction.get(log.transactionHash) ?? []).filter((candidate) => {
            if (candidate.address !== normalizeAddress(REVENUE_RECIPIENT)) return false;
            const value = decodedByLog.get(candidate)!;
            return value.eventName === "DepositRevenue" &&
              asAddress(value.args.team, "teams_recipient_team") === team &&
              asBigint(value.args.period, "teams_recipient_period") === period;
          });
          const recipientCompanion = exactlyOne(
            recipientCandidates,
            "teams_revenue_recipient_missing",
            "teams_revenue_recipient_ambiguous",
          );
          const recipientArgs = decodedByLog.get(recipientCompanion)!.args;
          if (
            asAddress(recipientArgs.token, "teams_recipient_token") !== token ||
            asBigint(recipientArgs.amount, "teams_recipient_amount") !== amountValue ||
            asBigint(recipientArgs.revenue, "teams_recipient_revenue") !== revenue
          ) {
            throw new Error("teams_revenue_recipient_mismatch");
          }
          if (amountValue === 0n && revenue === 0n) continue;
          actions.push(action(log, "team_revenue_deposited", {
            team,
            teamName: teamLabel,
            deposited: await tokenAmount(params.rpc, block, token, amountValue),
            revenueUsd: revenue,
            depositor: asAddress(event.args.depositor, "teams_revenue_depositor"),
            period,
            financialsAfter: await financials(params.rpc, block, team, period),
          }));
        } else if (event.eventName === "ClaimFunding" || event.eventName === "ReturnFunding") {
          const index = asBigint(event.args.idx, "teams_funding_index");
          const period = asBigint(event.args.period, "teams_funding_period");
          const amountValue = asBigint(event.args.amount, "teams_funding_amount");
          const distributorName = event.eventName;
          const distributorCompanion = exactlyOne(
            (byTransaction.get(log.transactionHash) ?? []).filter((candidate) => {
              if (candidate.address !== normalizeAddress(FUNDING_DISTRIBUTOR)) return false;
              const value = decodedByLog.get(candidate)!;
              return value.eventName === distributorName &&
                asBigint(value.args.idx, "teams_distributor_index") === index;
            }),
            "teams_funding_companion_missing",
            "teams_funding_companion_ambiguous",
          );
          const distributorArgs = decodedByLog.get(distributorCompanion)!.args;
          if (
            asBigint(distributorArgs.idx, "teams_distributor_index") !== index ||
            asAddress(distributorArgs.team, "teams_distributor_team") !== team ||
            asBigint(distributorArgs.period, "teams_distributor_period") !== period ||
            asAddress(distributorArgs.token, "teams_distributor_token") !== asAddress(event.args.token, "teams_funding_token") ||
            asBigint(distributorArgs.amount, "teams_distributor_amount") !== amountValue
          ) throw new Error("teams_funding_companion_mismatch");
          const adjustType = "cost" as const;
          const adjustment = event.eventName === "ClaimFunding"
            ? asBigint(event.args.cost, "teams_funding_cost")
            : asBigint(event.args.refund, "teams_funding_refund");
          const increment = event.eventName === "ClaimFunding";
          if (event.eventName === "ClaimFunding") {
            if (
              asBigint(distributorArgs.cost, "teams_distributor_cost") !== adjustment ||
              asAddress(distributorArgs.vest, "teams_distributor_vest") !== asAddress(event.args.vest, "teams_funding_vest") ||
              asAddress(distributorArgs.recipient, "teams_distributor_recipient") !== asAddress(event.args.recipient, "teams_funding_recipient")
            ) throw new Error("teams_funding_companion_mismatch");
          } else if (
            asBigint(distributorArgs.refund, "teams_distributor_refund") !== adjustment ||
            asAddress(distributorArgs.sender, "teams_distributor_sender") !== asAddress(event.args.sender, "teams_funding_sender")
          ) {
            throw new Error("teams_funding_companion_mismatch");
          }
          const accountingCompanion = exactlyOne((byTransaction.get(log.transactionHash) ?? []).filter((candidate) => {
            if (candidate.address !== normalizeAddress(TEAM_ACCOUNTANT)) return false;
            const value = decodedByLog.get(candidate)!;
            return value.eventName === "AdjustCost" &&
              asAddress(value.args.operator, "teams_funding_operator") === normalizeAddress(FUNDING_DISTRIBUTOR) &&
              asAddress(value.args.team, "teams_funding_team") === team &&
              asBigint(value.args.period, "teams_funding_period") === period;
          }), "teams_funding_accounting_missing", "teams_funding_accounting_ambiguous");
          if (
            companionKey(decodedByLog.get(accountingCompanion)!.args, adjustType) !==
              [adjustType, team, period, adjustment, increment ? "1" : "0"].join(":")
          ) {
            throw new Error("teams_funding_accounting_mismatch");
          }
          const [approvalTeam, , token, approvedAmount, , used] = await approval(params.rpc, block, index);
          if (approvalTeam !== team || used > approvedAmount) throw new Error("teams_funding_approval_mismatch");
          if (event.eventName === "ClaimFunding") {
            actions.push(action(log, "team_funding_claimed", {
              approvalId: index,
              team,
              teamName: teamLabel,
              claimed: await tokenAmount(params.rpc, block, token, amountValue),
              costUsd: adjustment,
              recipient: asAddress(event.args.recipient, "teams_funding_recipient"),
              vest: asAddress(event.args.vest, "teams_funding_vest"),
              remaining: await tokenAmount(params.rpc, block, token, approvedAmount - used),
            }));
          } else {
            actions.push(action(log, "team_funding_returned", {
              approvalId: index,
              team,
              teamName: teamLabel,
              returned: await tokenAmount(params.rpc, block, token, amountValue),
              refundUsd: adjustment,
              sender: asAddress(event.args.sender, "teams_funding_sender"),
              usedAfter: await tokenAmount(params.rpc, block, token, used),
            }));
          }
        }
        continue;
      }

      if (log.address === normalizeAddress(FUNDING_DISTRIBUTOR) && event.eventName === "ApproveFunding") {
        const team = asAddress(event.args.team, "teams_approval_team");
        const period = asBigint(event.args.period, "teams_approval_period");
        const duration = asBigint(event.args.duration, "teams_approval_duration");
        const token = asAddress(event.args.token, "teams_approval_token");
        const approvalId = asBigint(event.args.idx, "teams_approval_index");
        const [storedTeam, storedPeriod, storedToken, storedAmount, storedDuration, storedUsed] = await approval(params.rpc, block, approvalId);
        if (
          storedTeam !== team ||
          storedPeriod !== period ||
          storedToken !== token ||
          storedAmount !== asBigint(event.args.amount, "teams_approval_amount") ||
          storedDuration !== duration ||
          storedUsed !== 0n
        ) throw new Error("teams_approval_evidence_mismatch");
        actions.push(action(log, "team_funding_approved", {
          approvalId,
          team,
          teamName: await getName(block, team),
          funding: await tokenAmount(params.rpc, block, token, asBigint(event.args.amount, "teams_approval_amount")),
          period,
          vestingDurationSeconds: duration,
          claimStartsAt: periodStart(period),
          claimEndsAt: periodStart(period) + BigInt(TEAMS_PERIOD_SECONDS),
        }));
        continue;
      }

      if (log.address === normalizeAddress(BONUS_DISTRIBUTOR) && event.eventName === "ClaimBonus") {
        const bundle = bonusBundles.get(log);
        if (bundle === undefined) continue;
        const claims = bundle.claims;
        const values = claims.map((claim) => decodedByLog.get(claim)!.args);
        const team = asAddress(values[0]!.team, "teams_bonus_team");
        const gross = values.reduce((sum, value) => sum + asBigint(value.amount, "teams_bonus_amount"), 0n);
        const ybcAmount = values.reduce((sum, value) => sum + asBigint(value.ybc_amount, "teams_bonus_ybc"), 0n);
        const recipient = asAddress(values[0]!.recipient, "teams_bonus_recipient");
        if (
          gross < ybcAmount ||
          values.some((value) => asAddress(value.recipient, "teams_bonus_recipient") !== recipient)
        ) throw new Error("teams_bonus_values_invalid");
        if (gross === 0n && ybcAmount === 0n) continue;
        actions.push(action(log, "team_bonus_claimed", {
          team,
          teamName: await getName(block, team),
          periods: values.map((value) => asBigint(value.period, "teams_bonus_period")),
          gross,
          teamAmount: gross - ybcAmount,
          ybcAmount,
          recipient,
        }));
        continue;
      }

      if (log.address === normalizeAddress(TEAM_ACCOUNTANT) && (event.eventName === "AdjustRevenue" || event.eventName === "AdjustCost")) {
        const transactionLogs = byTransaction.get(log.transactionHash)!;
        const adjustmentTeam = asAddress(event.args.team, "teams_adjust_team");
        const adjustmentPeriod = asBigint(event.args.period, "teams_adjust_period");
        const adjustmentAmount = asBigint(event.args.amount, "teams_adjust_amount");
        const adjustmentIncrement = asBoolean(event.args.increment, "teams_adjust_increment");
        const adjustmentOperator = asAddress(event.args.operator, "teams_adjust_operator");
        const isCausalCompanion = transactionLogs.some((candidate) => {
          if (!teams.has(candidate.address)) return false;
          const value = decodedByLog.get(candidate)!;
          if (event.eventName === "AdjustRevenue" && value.eventName === "DepositRevenue") {
            return candidate.address === adjustmentTeam &&
              asBigint(value.args.period, "teams_deposit_period") === adjustmentPeriod &&
              asBigint(value.args.revenue, "teams_deposit_revenue") === adjustmentAmount &&
              adjustmentIncrement &&
              adjustmentOperator === normalizeAddress(REVENUE_RECIPIENT);
          }
          if (event.eventName === "AdjustCost" && (value.eventName === "ClaimFunding" || value.eventName === "ReturnFunding")) {
            const reported = value.eventName === "ClaimFunding"
              ? asBigint(value.args.cost, "teams_claim_cost")
              : asBigint(value.args.refund, "teams_return_refund");
            return candidate.address === adjustmentTeam &&
              asBigint(value.args.period, "teams_funding_period") === adjustmentPeriod &&
              reported === adjustmentAmount &&
              adjustmentIncrement === (value.eventName === "ClaimFunding") &&
              adjustmentOperator === normalizeAddress(FUNDING_DISTRIBUTOR);
          }
          return false;
        });
        if (isCausalCompanion) continue;
        if (adjustmentAmount === 0n) continue;
        const kind = event.eventName === "AdjustRevenue" ? "team_revenue_adjusted" : "team_cost_adjusted";
        const team = asAddress(event.args.team, "teams_adjust_team");
        const period = asBigint(event.args.period, "teams_adjust_period");
        actions.push(action(log, kind, {
          team,
          teamName: await getName(block, team),
          operator: asAddress(event.args.operator, "teams_adjust_operator"),
          period,
          amountUsd: adjustmentAmount,
          increment: asBoolean(event.args.increment, "teams_adjust_increment"),
          financialsAfter: await financials(params.rpc, block, team, period),
        }));
        continue;
      }

      if (log.address === normalizeAddress(REVENUE_RECIPIENT)) {
        if (event.eventName === "ToRewards" || event.eventName === "ToTreasury" || event.eventName === "ToRecovery") {
          const token = await readAddress(params.rpc, block, normalizeAddress(REVENUE_RECIPIENT), "token");
          const amountValue = asBigint(event.args.amount, "teams_route_amount");
          const bucket = event.eventName === "ToRewards" ? 0n : event.eventName === "ToTreasury" ? 1n : 2n;
          const shared = {
            amount: await tokenAmount(params.rpc, block, token, amountValue),
            usedAfter: await tokenAmount(params.rpc, block, token, await readUint(params.rpc, block, normalizeAddress(REVENUE_RECIPIENT), "used", [bucket])),
          };
          if (event.eventName === "ToRewards") {
            actions.push(action(log, "team_revenue_to_rewards", { ...shared, rewardEpoch: asBigint(event.args.epoch, "teams_reward_epoch") }));
          } else if (event.eventName === "ToTreasury") {
            actions.push(action(log, "team_revenue_to_treasury", { ...shared, treasury: await readAddress(params.rpc, block, normalizeAddress(REVENUE_RECIPIENT), "treasury") }));
          } else {
            actions.push(action(log, "team_revenue_to_recovery", { ...shared, recoveryAuction: await readAddress(params.rpc, block, normalizeAddress(REVENUE_RECIPIENT), "recovery_auction") }));
          }
        }
      }
    }

    actions.sort((left, right) => left.blockNumber - right.blockNumber || left.logIndex - right.logIndex);
    return { state: Object.freeze({ teams }), actions: Object.freeze(actions), failure: null };
  } catch (error) {
    return {
      state: params.state,
      actions: Object.freeze([]),
      failure: {
        code: isRpcRangeTooLargeError(error) ? "range_too_large" : "scan_failed",
        reason: error instanceof Error ? error.message : "unknown",
        ...failureEvidence,
      },
    };
  }
}
