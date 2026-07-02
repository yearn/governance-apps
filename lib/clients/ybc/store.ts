"use client";

import type { Address } from "viem";
import type { YbcTestBridgeAdapter } from "@/lib/test-bridge";
import { nowSeconds } from "@/lib/mocks/time";
import type { YbcPrototypeScenarioId } from "./client";
import {
  cloneYbcMockScenarioData,
  createEmptyYbcMockData,
  createYbcMockProposal,
  executeYbcMockProposal,
  retractYbcMockProposal,
  voteOnYbcMockProposal,
} from "./mock";
import type {
  YbcAdminRecord,
  YbcMemberRecord,
  YbcMemberStatus,
  YbcMockDataV1,
  YbcProposalPhase,
  YbcProposalRecord,
  YbcProposalType,
  YbcVoteChoice,
} from "./types";

const DAY_SECONDS = 86_400;
const DEFAULT_EPOCH_DURATION_SECONDS = 7 * DAY_SECONDS;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const TERMINAL_PROPOSAL_PHASES = new Set<YbcProposalPhase>([
  "executed",
  "expired",
  "failed",
  "retracted",
]);
const ZERO_WEIGHT = {
  rawStaked: "0",
  effectiveWeight: "0",
  targetWeight: "0",
  maturityBps: 0,
  maturesAt: null,
} as const;

export type YbcRuntimeSnapshot = {
  scenarioId: YbcPrototypeScenarioId;
  loading: boolean;
  emptyRoster: boolean;
  emptyBoard: boolean;
  data: YbcMockDataV1;
};

type YbcRuntimeFlags = Omit<YbcRuntimeSnapshot, "scenarioId" | "data">;

type YbcStoreState = {
  initialized: boolean;
  scenarioId: YbcPrototypeScenarioId;
  baseData: YbcMockDataV1;
  flags: YbcRuntimeFlags;
  snapshot: YbcRuntimeSnapshot;
};

type BridgePatch = Record<string, unknown>;
type Listener = () => void;

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function parseAmount(amount: string): number {
  return Number.parseFloat(amount);
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(4).replace(/\.?0+$/, "");
}

function sumAmounts(values: readonly string[]) {
  return values.reduce((sum, value) => sum + parseAmount(value), 0);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyRecordPatch<T extends Record<string, unknown>>(
  target: T,
  patch: BridgePatch
): T {
  const next = cloneValue(target) as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    const current = next[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      next[key] = applyRecordPatch(current, value);
      continue;
    }

    next[key] = cloneValue(value);
  }

  return next as T;
}

function getDefaultAdminRecord(): YbcAdminRecord {
  const admin = cloneYbcMockScenarioData("operator-admin").admin;
  if (!admin) {
    throw new Error("YBC operator-admin seed is missing admin metadata.");
  }
  return admin;
}

function getSeedData(scenarioId: YbcPrototypeScenarioId): YbcMockDataV1 {
  if (scenarioId === "empty") {
    return createEmptyYbcMockData();
  }

  return cloneYbcMockScenarioData(scenarioId);
}

function resolvePerspectiveScenario(
  perspective: string,
  currentScenarioId: YbcPrototypeScenarioId
): YbcPrototypeScenarioId {
  switch (perspective) {
    case "observer":
      return "observer";
    case "member":
      return currentScenarioId === "member-ramping" ? "member-ramping" : "member-matured";
    case "operator":
    case "operator-admin":
      return "operator-admin";
    case "member-ramping":
    case "member-matured":
    case "empty":
      return perspective;
    default:
      return currentScenarioId;
  }
}

function syncEpoch(data: YbcMockDataV1, asOf: number) {
  const duration = Math.max(
    1,
    data.epoch.endsAt - data.epoch.startsAt || DEFAULT_EPOCH_DURATION_SECONDS
  );
  const cycles = Math.floor((asOf - data.epoch.startsAt) / duration);
  const startsAt = data.epoch.startsAt + cycles * duration;

  return {
    current: Math.max(1, data.epoch.current + cycles),
    startsAt,
    endsAt: startsAt + duration,
  };
}

function syncMember(member: YbcMemberRecord, asOf: number): YbcMemberRecord {
  if (member.weight.maturesAt === null) {
    return member;
  }

  if (asOf >= member.weight.maturesAt) {
    return {
      ...member,
      status: member.status === "ramping" ? "active" : member.status,
      weight: {
        ...member.weight,
        effectiveWeight: member.weight.targetWeight,
        maturityBps: 10_000,
        maturesAt: null,
      },
    };
  }

  return member;
}

function getThresholdMet(proposal: YbcProposalRecord) {
  const total = parseAmount(proposal.votes.total);
  const yea = parseAmount(proposal.votes.yea);
  return total > 0 && Math.round((yea / total) * 10_000) >= proposal.thresholdBps;
}

function getTerminalProposalDisabledReason(phase: YbcProposalPhase) {
  switch (phase) {
    case "executed":
      return "Executed proposals are terminal.";
    case "expired":
      return "Expired proposals are terminal; start a new proposal.";
    case "failed":
      return "Failed proposals are terminal; start a new proposal.";
    case "retracted":
      return "Retracted proposals are terminal.";
    default:
      return "No further mock actions are available.";
  }
}

function normalizeTerminalProposal(proposal: YbcProposalRecord): YbcProposalRecord {
  return {
    ...proposal,
    outcome:
      proposal.phase === "expired" || proposal.phase === "executed"
        ? "passed"
        : "failed",
    actions: {
      canRetract: false,
      canVote: false,
      canExecute: false,
      nextAction: "none",
      disabledReason: getTerminalProposalDisabledReason(proposal.phase),
    },
  };
}

function syncProposal(
  proposal: YbcProposalRecord,
  data: Pick<YbcMockDataV1, "me" | "asOf">
): YbcProposalRecord {
  if (TERMINAL_PROPOSAL_PHASES.has(proposal.phase)) {
    return normalizeTerminalProposal(proposal);
  }

  const isMemberViewer = data.me.isMember;
  const isAuthor =
    !!data.me.address &&
    data.me.address.toLowerCase() === proposal.proposer.toLowerCase();
  const thresholdMet = getThresholdMet(proposal);
  const hasRecordedMockVote =
    proposal.actions.disabledReason?.toLowerCase().includes("mock yea vote recorded") ||
    proposal.actions.disabledReason?.toLowerCase().includes("mock nay vote recorded");

  if (data.asOf < proposal.timing.votingStartsAt) {
    return {
      ...proposal,
      phase: "discussion",
      outcome: "pending",
      actions: {
        canRetract: isAuthor,
        canVote: false,
        canExecute: false,
        nextAction: isAuthor ? "retract" : "none",
        disabledReason: isAuthor
          ? null
          : isMemberViewer
            ? "Voting has not opened yet."
            : "Connect a member wallet to act on this proposal.",
      },
    };
  }

  if (data.asOf < proposal.timing.votingEndsAt) {
    return {
      ...proposal,
      phase: "voting",
      outcome:
        parseAmount(proposal.votes.total) <= 0
          ? "pending"
          : thresholdMet
            ? "passing"
            : "failing",
      actions: {
        canRetract: false,
        canVote: hasRecordedMockVote ? false : isMemberViewer,
        canExecute: false,
        nextAction:
          hasRecordedMockVote || !isMemberViewer ? "none" : "vote",
        disabledReason: hasRecordedMockVote
          ? proposal.actions.disabledReason
          : isMemberViewer
            ? null
            : "Connect a member wallet to vote.",
      },
    };
  }

  if (!thresholdMet) {
    return {
      ...proposal,
      phase: "failed",
      outcome: "failed",
      actions: {
        canRetract: false,
        canVote: false,
        canExecute: false,
        nextAction: "none",
        disabledReason: "Failed proposals are terminal; start a new proposal.",
      },
    };
  }

  if (data.asOf < proposal.timing.expiresAt) {
    return {
      ...proposal,
      phase: "awaiting-execution",
      outcome: "passed",
      actions: {
        canRetract: false,
        canVote: false,
        canExecute: isMemberViewer && data.asOf >= proposal.timing.executionOpensAt,
        nextAction:
          isMemberViewer && data.asOf >= proposal.timing.executionOpensAt
            ? "execute"
            : "none",
        disabledReason:
          isMemberViewer && data.asOf >= proposal.timing.executionOpensAt
            ? null
            : "Connect a member wallet to execute.",
      },
    };
  }

  return {
    ...proposal,
    phase: "expired",
    outcome: "passed",
    actions: {
      canRetract: false,
      canVote: false,
      canExecute: false,
      nextAction: "none",
      disabledReason: "Expired proposals are terminal; start a new proposal.",
    },
  };
}

function summarizeProposals(items: readonly YbcProposalRecord[]) {
  return {
    activeCount: items.filter((item) =>
      item.phase === "discussion" || item.phase === "voting"
    ).length,
    awaitingExecutionCount: items.filter(
      (item) => item.phase === "awaiting-execution"
    ).length,
    terminalCount: items.filter(
      (item) =>
        item.phase === "executed" ||
        item.phase === "expired" ||
        item.phase === "failed" ||
        item.phase === "retracted"
    ).length,
  };
}

function normalizeYbcData(input: YbcMockDataV1): YbcMockDataV1 {
  const syncedMembers = input.roster.members.map((member) =>
    syncMember(member, input.asOf)
  );
  const activeMembers = syncedMembers.filter((member) => member.status !== "removed");
  const rosterTotals = {
    rawStaked: formatAmount(
      sumAmounts(activeMembers.map((member) => member.weight.rawStaked))
    ),
    effectiveWeight: formatAmount(
      sumAmounts(activeMembers.map((member) => member.weight.effectiveWeight))
    ),
    targetWeight: formatAmount(
      sumAmounts(activeMembers.map((member) => member.weight.targetWeight))
    ),
    rampingMemberCount: activeMembers.filter((member) => member.status === "ramping")
      .length,
  };
  const epoch = syncEpoch(input, input.asOf);
  const viewerMember = input.me.address
    ? activeMembers.find(
        (member) =>
          member.address.toLowerCase() === input.me.address?.toLowerCase()
      )
    : undefined;
  const isMember = !!viewerMember;
  const isOperator = !!(
    input.me.address &&
    input.admin?.operators.some(
      (operator) =>
        operator.address.toLowerCase() === input.me.address?.toLowerCase()
    )
  );
  const me = {
    ...input.me,
    isMember,
    isOperator,
    canPropose: isMember,
    canVote:
      isMember &&
      parseAmount(viewerMember?.weight.effectiveWeight ?? "0") > 0,
    weight: viewerMember ? cloneValue(viewerMember.weight) : cloneValue(ZERO_WEIGHT),
    pendingRewards: isMember ? input.me.pendingRewards : "0",
  };
  const proposals = input.proposals.items.map((proposal) =>
    syncProposal(proposal, {
      me,
      asOf: input.asOf,
    })
  );
  const proposalSummary = summarizeProposals(proposals);
  const delegatedWeight = parseAmount(input.hero.delegatedWeight);
  const normalized: YbcMockDataV1 = {
    ...input,
    epoch,
    hero: {
      ...input.hero,
      memberCount: activeMembers.length,
      internalWeight: rosterTotals.effectiveWeight,
      totalInfluence: formatAmount(
        parseAmount(rosterTotals.effectiveWeight) + delegatedWeight
      ),
      currentEpoch: epoch.current,
      activeProposalCount: proposalSummary.activeCount,
      awaitingExecutionCount: proposalSummary.awaitingExecutionCount,
    },
    me,
    roster: {
      totals: rosterTotals,
      members: syncedMembers,
    },
    proposals: {
      summary: proposalSummary,
      items: proposals,
    },
    admin: input.admin
      ? {
          ...input.admin,
          isOperator,
        }
      : input.admin,
    rewards: {
      ...input.rewards,
      lastUpdatedAt: input.asOf,
      claim: {
        ...input.rewards.claim,
        disabledReason: !isMember
          ? "Connect a member wallet to view claimable rewards."
          : parseAmount(input.rewards.claimable) > 0
            ? null
            : "No finalized YBC rewards are ready on the shared claim surface.",
      },
    },
  };

  return normalized;
}

function applyEmptyRoster(data: YbcMockDataV1): YbcMockDataV1 {
  const empty = createEmptyYbcMockData();

  return normalizeYbcData({
    ...empty,
    generatedAt: data.generatedAt,
    asOf: data.asOf,
    epoch: data.epoch,
    hero: {
      ...empty.hero,
      collectiveAddress: data.hero.collectiveAddress,
      currentEpoch: data.epoch.current,
    },
    rewards: {
      ...empty.rewards,
      claim: {
        ...empty.rewards.claim,
        href: data.rewards.claim.href,
        ctaLabel: data.rewards.claim.ctaLabel,
      },
    },
  });
}

function applyEmptyBoard(data: YbcMockDataV1): YbcMockDataV1 {
  return normalizeYbcData({
    ...data,
    proposals: {
      summary: {
        activeCount: 0,
        awaitingExecutionCount: 0,
        terminalCount: 0,
      },
      items: [],
    },
    hero: {
      ...data.hero,
      activeProposalCount: 0,
      awaitingExecutionCount: 0,
    },
  });
}

function createRuntimeSnapshot(
  scenarioId: YbcPrototypeScenarioId,
  baseData: YbcMockDataV1,
  flags: YbcRuntimeFlags
): YbcRuntimeSnapshot {
  let data = normalizeYbcData(baseData);

  if (flags.emptyRoster) {
    data = applyEmptyRoster(data);
  }

  if (flags.emptyBoard) {
    data = applyEmptyBoard(data);
  }

  return {
    scenarioId,
    loading: flags.loading,
    emptyRoster: flags.emptyRoster,
    emptyBoard: flags.emptyBoard,
    data,
  };
}

function createStoreState(
  scenarioId: YbcPrototypeScenarioId,
  baseData: YbcMockDataV1,
  flags: YbcRuntimeFlags,
  initialized: boolean
): YbcStoreState {
  return {
    initialized,
    scenarioId,
    baseData,
    flags,
    snapshot: createRuntimeSnapshot(scenarioId, baseData, flags),
  };
}

const listeners = new Set<Listener>();
let state = createStoreState(
  "observer",
  getSeedData("observer"),
  {
    loading: true,
    emptyRoster: false,
    emptyBoard: false,
  },
  false
);

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(nextState: YbcStoreState) {
  state = nextState;
  emit();
}

function updateStore(
  updater: (current: YbcStoreState) => YbcStoreState
): YbcStoreState["snapshot"] {
  const nextState = updater(state);
  setState(nextState);
  return nextState.snapshot;
}

export function subscribeYbcMockStore(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getYbcMockSnapshot() {
  return state.snapshot;
}

export function isYbcMockStoreInitialized() {
  return state.initialized;
}

function seedScenario(
  scenarioId: YbcPrototypeScenarioId,
  flags: Partial<YbcRuntimeFlags> = {}
) {
  return createStoreState(
    scenarioId,
    normalizeYbcData(getSeedData(scenarioId)),
    {
      loading: false,
      emptyRoster: false,
      emptyBoard: false,
      ...flags,
    },
    true
  );
}

export function ensureYbcMockStoreInitialized(
  scenarioId: YbcPrototypeScenarioId = "observer"
) {
  if (state.initialized) {
    return state.snapshot;
  }

  return updateStore(() => seedScenario(scenarioId));
}

export function resetYbcMockStore(
  options: {
    scenarioId?: YbcPrototypeScenarioId;
  } = {}
) {
  return updateStore(() => seedScenario(options.scenarioId ?? "observer"));
}

export function seedYbcPerspective(perspective: string) {
  return updateStore((current) =>
    seedScenario(resolvePerspectiveScenario(perspective, current.scenarioId))
  );
}

export function setYbcLoading(value: boolean) {
  return updateStore((current) =>
    createStoreState(current.scenarioId, current.baseData, {
      ...current.flags,
      loading: value,
    }, true)
  );
}

export function setYbcEmptyRoster(value: boolean) {
  return updateStore((current) =>
    createStoreState(current.scenarioId, current.baseData, {
      ...current.flags,
      emptyRoster: value,
    }, true)
  );
}

export function setYbcEmptyBoard(value: boolean) {
  return updateStore((current) =>
    createStoreState(current.scenarioId, current.baseData, {
      ...current.flags,
      emptyBoard: value,
    }, true)
  );
}

function withBaseData(transform: (data: YbcMockDataV1) => YbcMockDataV1) {
  return updateStore((current) =>
    createStoreState(
      current.scenarioId,
      normalizeYbcData(transform(cloneValue(current.baseData))),
      current.flags,
      true
    )
  );
}

export function syncYbcMockStoreToNow(timestamp: number = nowSeconds()) {
  return withBaseData((data) => ({
    ...data,
    asOf: timestamp,
    generatedAt: timestamp,
  }));
}

export function setYbcEpoch(epoch: number) {
  return withBaseData((data) => {
    const duration = Math.max(
      1,
      data.epoch.endsAt - data.epoch.startsAt || DEFAULT_EPOCH_DURATION_SECONDS
    );
    const startsAt = data.asOf - Math.floor(duration / 2);

    return {
      ...data,
      epoch: {
        current: Math.max(1, epoch),
        startsAt,
        endsAt: startsAt + duration,
      },
      hero: {
        ...data.hero,
        currentEpoch: Math.max(1, epoch),
      },
    };
  });
}

export function createYbcProposal(type: YbcProposalType) {
  return updateStore((current) => {
    const sourceData = current.flags.emptyBoard
      ? current.snapshot.data
      : current.baseData;

    return createStoreState(
      current.scenarioId,
      normalizeYbcData(createYbcMockProposal(cloneValue(sourceData), type)),
      {
        ...current.flags,
        emptyBoard: false,
      },
      true
    );
  });
}

export function retractYbcProposal(proposalId: string) {
  return withBaseData((data) => retractYbcMockProposal(data, proposalId));
}

export function voteOnYbcProposal(
  proposalId: string,
  choice: YbcVoteChoice
) {
  return withBaseData((data) => voteOnYbcMockProposal(data, proposalId, choice));
}

export function executeYbcProposal(proposalId: string) {
  return withBaseData((data) => executeYbcMockProposal(data, proposalId));
}

export function setYbcMemberStatus(
  memberId: string,
  status: YbcMemberStatus
) {
  return withBaseData((data) => ({
    ...data,
    roster: {
      ...data.roster,
      members: data.roster.members.map((member) =>
        member.address.toLowerCase() === memberId.toLowerCase()
          ? { ...member, status }
          : member
      ),
    },
  }));
}

export function setYbcMemberMaturity(
  memberId: string,
  maturityBps: number
) {
  return withBaseData((data) => ({
    ...data,
    roster: {
      ...data.roster,
      members: data.roster.members.map((member) => {
        if (member.address.toLowerCase() !== memberId.toLowerCase()) {
          return member;
        }

        const clamped = Math.max(0, Math.min(10_000, maturityBps));
        const target = parseAmount(member.weight.targetWeight);

        return {
          ...member,
          status:
            member.status === "removed"
              ? "removed"
              : clamped >= 10_000
                ? "active"
                : "ramping",
          weight: {
            ...member.weight,
            maturityBps: clamped,
            effectiveWeight: formatAmount((target * clamped) / 10_000),
            maturesAt:
              clamped >= 10_000
                ? null
                : data.asOf +
                  Math.max(1, Math.ceil((10_000 - clamped) / 2_500)) * DAY_SECONDS,
          },
        };
      }),
    },
  }));
}

function getTimingForPhase(
  proposal: YbcProposalRecord,
  phase: YbcProposalPhase,
  asOf: number
) {
  const createdAt = asOf - DAY_SECONDS;

  switch (phase) {
    case "discussion":
      return {
        ...proposal.timing,
        createdAt,
        discussionStartsAt: createdAt,
        votingStartsAt: asOf + DAY_SECONDS,
        votingEndsAt: asOf + 3 * DAY_SECONDS,
        executionOpensAt: asOf + 3 * DAY_SECONDS,
        expiresAt: asOf + 4 * DAY_SECONDS,
        executedAt: undefined,
      };
    case "voting":
      return {
        ...proposal.timing,
        createdAt: asOf - 2 * DAY_SECONDS,
        discussionStartsAt: asOf - 2 * DAY_SECONDS,
        votingStartsAt: asOf - DAY_SECONDS,
        votingEndsAt: asOf + DAY_SECONDS,
        executionOpensAt: asOf + DAY_SECONDS,
        expiresAt: asOf + 2 * DAY_SECONDS,
        executedAt: undefined,
      };
    case "awaiting-execution":
      return {
        ...proposal.timing,
        createdAt: asOf - 3 * DAY_SECONDS,
        discussionStartsAt: asOf - 3 * DAY_SECONDS,
        votingStartsAt: asOf - 2 * DAY_SECONDS,
        votingEndsAt: asOf - Math.floor(DAY_SECONDS / 2),
        executionOpensAt: asOf - Math.floor(DAY_SECONDS / 2),
        expiresAt: asOf + DAY_SECONDS,
        executedAt: undefined,
      };
    case "executed":
      return {
        ...proposal.timing,
        createdAt: asOf - 3 * DAY_SECONDS,
        discussionStartsAt: asOf - 3 * DAY_SECONDS,
        votingStartsAt: asOf - 2 * DAY_SECONDS,
        votingEndsAt: asOf - DAY_SECONDS,
        executionOpensAt: asOf - DAY_SECONDS,
        expiresAt: asOf + DAY_SECONDS,
        executedAt: asOf - 60,
      };
    case "expired":
      return {
        ...proposal.timing,
        createdAt: asOf - 5 * DAY_SECONDS,
        discussionStartsAt: asOf - 5 * DAY_SECONDS,
        votingStartsAt: asOf - 4 * DAY_SECONDS,
        votingEndsAt: asOf - 3 * DAY_SECONDS,
        executionOpensAt: asOf - 3 * DAY_SECONDS,
        expiresAt: asOf - 60,
        executedAt: undefined,
      };
    case "failed":
      return {
        ...proposal.timing,
        createdAt: asOf - 4 * DAY_SECONDS,
        discussionStartsAt: asOf - 4 * DAY_SECONDS,
        votingStartsAt: asOf - 3 * DAY_SECONDS,
        votingEndsAt: asOf - 2 * DAY_SECONDS,
        executionOpensAt: asOf - 2 * DAY_SECONDS,
        expiresAt: asOf + DAY_SECONDS,
        executedAt: undefined,
      };
    case "retracted":
      return {
        ...proposal.timing,
        createdAt,
        discussionStartsAt: createdAt,
        votingStartsAt: asOf + DAY_SECONDS,
        votingEndsAt: asOf + 3 * DAY_SECONDS,
        executionOpensAt: asOf + 3 * DAY_SECONDS,
        expiresAt: asOf + 4 * DAY_SECONDS,
        executedAt: undefined,
      };
  }
}

export function setYbcProposalPhase(
  proposalId: string,
  phase: YbcProposalPhase
) {
  return withBaseData((data) => ({
    ...data,
    proposals: {
      ...data.proposals,
      items: data.proposals.items.map((proposal) => {
        if (proposal.id !== proposalId) {
          return proposal;
        }

        return {
          ...proposal,
          phase,
          timing: getTimingForPhase(proposal, phase, data.asOf),
        };
      }),
    },
  }));
}

export function setYbcProposalVoteState(
  proposalId: string,
  voteState: "clear" | "passing" | "failing"
) {
  return withBaseData((data) => ({
    ...data,
    proposals: {
      ...data.proposals,
      items: data.proposals.items.map((proposal) => {
        if (proposal.id !== proposalId) {
          return proposal;
        }

        if (voteState === "clear") {
          return {
            ...proposal,
            votes: {
              total: "0",
              yea: "0",
              nay: "0",
            },
          };
        }

        const total = 20_000;
        const yea =
          voteState === "passing"
            ? Math.max(
                Math.ceil((proposal.thresholdBps / 10_000) * total),
                Math.round(total * 0.7)
              )
            : Math.round(total * 0.4);

        return {
          ...proposal,
          votes: {
            total: formatAmount(total),
            yea: formatAmount(yea),
            nay: formatAmount(total - yea),
          },
        };
      }),
    },
  }));
}

export function seedYbcRewardsState(mode: "empty" | "member" | "operator") {
  const seededRewards =
    mode === "operator"
      ? cloneYbcMockScenarioData("operator-admin").rewards
      : mode === "member"
        ? cloneYbcMockScenarioData("member-matured").rewards
        : {
            ...createEmptyYbcMockData().rewards,
            claim: {
              ...createEmptyYbcMockData().rewards.claim,
            },
          };

  const pendingRewards =
    mode === "operator"
      ? cloneYbcMockScenarioData("operator-admin").me.pendingRewards
      : mode === "member"
        ? cloneYbcMockScenarioData("member-matured").me.pendingRewards
        : "0";

  return withBaseData((data) => ({
    ...data,
    me: {
      ...data.me,
      pendingRewards,
    },
    rewards: cloneValue(seededRewards),
  }));
}

export function setYbcOperatorAccess(value: boolean) {
  return withBaseData((data) => {
    const admin = cloneValue(data.admin ?? getDefaultAdminRecord());
    if (!data.me.address) {
      return {
        ...data,
        admin,
      };
    }

    const viewerAddress = data.me.address.toLowerCase();
    const preservedOperators = admin.operators.filter(
      (operator) => operator.address.toLowerCase() !== viewerAddress
    );
    const viewerOperator =
      admin.operators.find(
        (operator) => operator.address.toLowerCase() === viewerAddress
      ) ??
      getDefaultAdminRecord().operators.find(
        (operator) => operator.address.toLowerCase() === viewerAddress
      ) ?? {
        address: data.me.address,
        ens:
          data.roster.members.find(
            (member) => member.address.toLowerCase() === viewerAddress
          )?.ens ?? null,
        role: "operator" as const,
      };

    return {
      ...data,
      admin: {
        ...admin,
        operators: value
          ? [viewerOperator, ...preservedOperators]
          : preservedOperators,
      },
    };
  });
}

export function setYbcHooksVisible(value: boolean) {
  return withBaseData((data) => ({
    ...data,
    admin: {
      ...(data.admin ?? getDefaultAdminRecord()),
      hooks: value
        ? getDefaultAdminRecord().hooks
        : {
            membershipHook: ZERO_ADDRESS,
            rewardsDistributor: ZERO_ADDRESS,
            bonusRecipient: ZERO_ADDRESS,
          },
    },
  }));
}

export function setYbcThresholdProfile(profile: "default" | "strict") {
  return withBaseData((data) => ({
    ...data,
    admin: {
      ...(data.admin ?? getDefaultAdminRecord()),
      thresholds:
        profile === "strict"
          ? {
              additionBps: 6_700,
              expulsionBps: 7_500,
            }
          : {
              additionBps: 5_000,
              expulsionBps: 6_000,
            },
    },
  }));
}

export function patchYbcMember(memberId: string, patch: BridgePatch) {
  return withBaseData((data) => ({
    ...data,
    roster: {
      ...data.roster,
      members: data.roster.members.map((member) =>
        member.address.toLowerCase() === memberId.toLowerCase()
          ? applyRecordPatch(member, patch)
          : member
      ),
    },
  }));
}

export function patchYbcProposal(proposalId: string, patch: BridgePatch) {
  return withBaseData((data) => ({
    ...data,
    proposals: {
      ...data.proposals,
      items: data.proposals.items.map((proposal) =>
        proposal.id === proposalId ? applyRecordPatch(proposal, patch) : proposal
      ),
    },
  }));
}

export function patchYbcRewards(patch: BridgePatch) {
  return withBaseData((data) => ({
    ...data,
    rewards: applyRecordPatch(data.rewards, patch),
    me:
      patch.pendingRewards !== undefined
        ? {
            ...data.me,
            pendingRewards: String(patch.pendingRewards),
          }
        : data.me,
  }));
}

export function patchYbcAdmin(patch: BridgePatch) {
  return withBaseData((data) => ({
    ...data,
    admin: applyRecordPatch(data.admin ?? getDefaultAdminRecord(), patch),
  }));
}

export function createYbcTestBridgeAdapter(): YbcTestBridgeAdapter {
  return {
    resetYbc: async () => {
      resetYbcMockStore();
    },
    setYbcPerspective: async (perspective) => {
      seedYbcPerspective(perspective);
    },
    setYbcLoading: async (value) => {
      setYbcLoading(value);
    },
    setYbcEmptyRoster: async (value) => {
      setYbcEmptyRoster(value);
    },
    setYbcEmptyBoard: async (value) => {
      setYbcEmptyBoard(value);
    },
    setYbcEpoch: async (epoch) => {
      setYbcEpoch(epoch);
    },
    patchYbcMember: async (memberId, patch) => {
      patchYbcMember(memberId, patch);
    },
    patchYbcProposal: async (proposalId, patch) => {
      patchYbcProposal(proposalId, patch);
    },
    patchYbcRewards: async (patch) => {
      patchYbcRewards(patch);
    },
    patchYbcAdmin: async (patch) => {
      patchYbcAdmin(patch);
    },
    onSetNow: async (timestamp) => {
      syncYbcMockStoreToNow(timestamp);
    },
  };
}
