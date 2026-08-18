import type { Address } from "viem";
import type { DaoTestBridgeAdapter } from "@/lib/test-bridge";
import { nowSeconds } from "@/lib/mocks/time";
import {
  assertDaoProposalInvariants,
  deriveDaoCapabilities,
  deriveDaoDisplayGroup,
  deriveDaoDisplayStatus,
  deriveDaoProtocolStatus,
  deriveDaoProposerState,
  deriveDaoVotingWeight,
  serializeDaoProposalRef,
} from "./domain";
import {
  createDaoMockFeed,
  DAO_MOCK_NOW,
  getDaoMockFixture,
} from "./fixtures";
import {
  DAO_EXECUTOR_SCRIPT_ERROR_VECTORS,
  DAO_EXECUTOR_VALID_SCRIPT_VECTORS,
} from "./script-vectors";
import { checkDaoExecutorScript } from "./script";
import type {
  DaoAccountProposalFacts,
  DaoAccountProposalState,
  DaoExecutionGuard,
  DaoMockAccountState,
  DaoMockAnalysisState,
  DaoMockAuthoring,
  DaoMockAuthoringState,
  DaoMockContentState,
  DaoMockExecutionState,
  DaoMockFixtureId,
  DaoMockLifecycleState,
  DaoMockPersona,
  DaoMockProposalFlagsPatch,
  DaoMockProposalTimingPatch,
  DaoMockProposerState,
  DaoMockRole,
  DaoMockRuntimeSnapshot,
  DaoMockSurfaceState,
  DaoMockVetoState,
  DaoProposal,
  DaoProposalLookup,
  DaoProposalRef,
  DaoProposerEligibilityInput,
  DaoProposerState,
} from "./types";

const DAY_SECONDS = 86_400;
const DEFAULT_FIXTURE_ID: DaoMockFixtureId = "voting";
const DEFAULT_WEIGHT = 100n * 10n ** 18n;

type Listener = () => void;

type DaoMockProposalRuntime = {
  proposal: DaoProposal;
  retracted: boolean;
  executed: boolean;
  flagged: boolean;
  vetoed: boolean;
  postVoteEpochEndsAt: number;
  vetoEndsAt: number;
};

type DaoMockStoreState = {
  surface: DaoMockSurfaceState;
  selectedFixtureId: DaoMockFixtureId | null;
  selectedProposalId: bigint;
  persona: DaoMockPersona;
  now: number;
  feed: ReturnType<typeof createDaoMockFeed>;
  proposals: DaoMockProposalRuntime[];
  account: DaoAccountProposalFacts;
  accountDecayLengthSeconds: number;
  proposer: DaoProposerEligibilityInput;
  executionGuard: DaoExecutionGuard;
  authoring: DaoMockAuthoring;
};

const listeners = new Set<Listener>();
let state: DaoMockStoreState | null = null;
let snapshot: DaoMockRuntimeSnapshot | null = null;

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function getState(): DaoMockStoreState {
  if (state === null) {
    commit(createStoreState(nowSeconds(), DEFAULT_FIXTURE_ID), false);
  }
  return state as DaoMockStoreState;
}

function commit(next: DaoMockStoreState, shouldEmit = true) {
  state = normalizeStoreState(next);
  snapshot = createSnapshot(state);
  if (shouldEmit) emit();
}

function updateStore(transform: (current: DaoMockStoreState) => void) {
  const next = cloneValue(getState());
  transform(next);
  commit(next);
  return getDaoMockSnapshot();
}

function createStoreState(
  now: number,
  fixtureId: DaoMockFixtureId
): DaoMockStoreState {
  const fixture = getDaoMockFixture(fixtureId);
  const proposals = createAnchoredProposalRuntimes(now);
  const delta = now - fixture.now;
  const proposer = cloneValue(fixture.proposer);
  proposer.now = now;
  if (proposer.lastProposedAt !== null) {
    proposer.lastProposedAt += delta;
  }

  return {
    surface: "ready",
    selectedFixtureId: fixtureId,
    selectedProposalId: fixture.proposalRef.proposalId,
    persona: resolveFixturePersona(fixtureId),
    now,
    feed: createAnchoredFeed(now),
    proposals,
    account: cloneValue(fixture.account),
    accountDecayLengthSeconds: fixtureId === "late-voting" ? DAY_SECONDS : 0,
    proposer,
    executionGuard: fixture.executionGuard,
    authoring: createAuthoringState("valid-signal"),
  };
}

function normalizeStoreState(next: DaoMockStoreState): DaoMockStoreState {
  next.proposals = next.proposals.map((runtime) => {
    const proposal = runtime.proposal;
    const protocolStatus = deriveDaoProtocolStatus({
      exists: true,
      now: next.now,
      voteStartsAt: proposal.voteStartsAt,
      voteEndsAt: proposal.voteEndsAt,
      postVoteEpochEndsAt: runtime.postVoteEpochEndsAt,
      type: proposal.type,
      thresholdBps: proposal.thresholdBps,
      totalWeight: proposal.totalWeight,
      yeaWeight: proposal.yeaWeight,
      retracted: runtime.retracted,
      executed: runtime.executed,
      flagged: runtime.flagged,
      vetoed: runtime.vetoed,
    });
    const displayStatus = deriveDaoDisplayStatus(protocolStatus, proposal.type);
    const normalizedProposal: DaoProposal = {
      ...proposal,
      protocolStatus,
      displayStatus,
      displayGroup: deriveDaoDisplayGroup(displayStatus, proposal.type),
    };
    assertDaoProposalInvariants(normalizedProposal);
    return { ...runtime, proposal: normalizedProposal };
  });

  next.proposer.now = next.now;
  next.feed = {
    ...next.feed,
    generatedAt: new Date(next.now * 1_000).toISOString(),
    canonicalBlock: {
      ...next.feed.canonicalBlock,
      timestamp: next.now,
    },
    proposals: next.proposals.map((runtime) => cloneValue(runtime.proposal)),
  };

  const selected = getSelectedProposalRuntime(next);
  const weight = deriveDaoVotingWeight({
    votingWeight: next.account.votingWeight,
    now: next.now,
    voteEndsAt: selected.proposal.voteEndsAt,
    decayLengthSeconds: next.accountDecayLengthSeconds,
  });
  next.account = { ...next.account, ...weight };
  return next;
}

function createSnapshot(current: DaoMockStoreState): DaoMockRuntimeSnapshot {
  return cloneValue({
    surface: current.surface,
    selectedFixtureId: current.selectedFixtureId,
    selectedProposalId: current.selectedProposalId,
    persona: current.persona,
    now: current.now,
    feed:
      current.surface === "empty"
        ? { ...current.feed, proposals: [] }
        : current.feed,
    account: current.account,
    proposer: current.proposer,
    executionGuard: current.executionGuard,
    authoring: current.authoring,
  });
}

function createAnchoredFeed(now: number) {
  const feed = createDaoMockFeed();
  const delta = now - DAO_MOCK_NOW;
  return {
    ...feed,
    generatedAt: new Date(now * 1_000).toISOString(),
    canonicalBlock: {
      ...feed.canonicalBlock,
      timestamp: now,
    },
    proposals: feed.proposals.map((proposal) => shiftProposal(proposal, delta)),
  };
}

function createAnchoredProposalRuntimes(now: number): DaoMockProposalRuntime[] {
  return createAnchoredFeed(now).proposals.map((proposal) => ({
    proposal,
    retracted:
      proposal.protocolStatus === "retracted" ||
      proposal.protocolStatus === "flagged" ||
      (proposal.protocolStatus === "vetoed" && proposal.totalWeight === 0n),
    executed: proposal.protocolStatus === "executed",
    flagged: proposal.protocolStatus === "flagged",
    vetoed: proposal.protocolStatus === "vetoed",
    postVoteEpochEndsAt:
      proposal.executionEndsAt ?? proposal.voteEndsAt + 14 * DAY_SECONDS,
    vetoEndsAt:
      proposal.executionEndsAt ?? proposal.voteEndsAt + 14 * DAY_SECONDS,
  }));
}

function shiftProposal(proposal: DaoProposal, delta: number): DaoProposal {
  return {
    ...proposal,
    createdAt: proposal.createdAt + delta,
    voteStartsAt: proposal.voteStartsAt + delta,
    voteEndsAt: proposal.voteEndsAt + delta,
    executionStartsAt:
      proposal.executionStartsAt === null
        ? null
        : proposal.executionStartsAt + delta,
    executionEndsAt:
      proposal.executionEndsAt === null
        ? null
        : proposal.executionEndsAt + delta,
    content: {
      ...proposal.content,
      value:
        proposal.content.value === null
          ? null
          : {
              ...proposal.content.value,
              createdAt: new Date(
                (Date.parse(proposal.content.value.createdAt) / 1_000 + delta) *
                  1_000
              ).toISOString(),
            },
    },
  };
}

function getSelectedProposalRuntime(
  current: DaoMockStoreState
): DaoMockProposalRuntime {
  const selected = current.proposals.find(
    (runtime) =>
      runtime.proposal.ref.proposalId === current.selectedProposalId
  );
  if (!selected) {
    throw new Error(
      `Unknown selected DAO proposal ${current.selectedProposalId.toString()}.`
    );
  }
  return selected;
}

function getProposalRuntimeByRef(
  current: DaoMockStoreState,
  ref: DaoProposalRef
): DaoMockProposalRuntime | null {
  const key = serializeDaoProposalRef(ref);
  return (
    current.proposals.find(
      (runtime) => serializeDaoProposalRef(runtime.proposal.ref) === key
    ) ?? null
  );
}

function replaceSelectedProposal(
  current: DaoMockStoreState,
  fixtureId: DaoMockFixtureId
) {
  const target = getSelectedProposalRuntime(current);
  const sourceId = getDaoMockFixture(fixtureId).proposalRef.proposalId;
  const source = createAnchoredProposalRuntimes(current.now).find(
    (runtime) => runtime.proposal.ref.proposalId === sourceId
  );
  if (!source) throw new Error(`Unknown DAO fixture proposal: ${fixtureId}.`);
  source.proposal.ref = cloneValue(target.proposal.ref);
  current.proposals = current.proposals.map((runtime) =>
    runtime.proposal.ref.proposalId === current.selectedProposalId
      ? source
      : runtime
  );
  current.selectedFixtureId = null;
}

function updateSelectedProposal(
  current: DaoMockStoreState,
  transform: (runtime: DaoMockProposalRuntime) => void
) {
  const selected = getSelectedProposalRuntime(current);
  transform(selected);
  current.selectedFixtureId = null;
}

function resolveFixturePersona(fixtureId: DaoMockFixtureId): DaoMockPersona {
  if (fixtureId === "discussion" || fixtureId === "retracted") return "proposer";
  if (fixtureId === "early-veto") return "guardian";
  if (fixtureId === "guarded-execution") return "operator";
  return "voter";
}

function createAuthoringState(stateId: DaoMockAuthoringState): DaoMockAuthoring {
  if (stateId === "valid-signal") {
    return {
      state: stateId,
      proposalType: "signal",
      scriptCheck: checkDaoExecutorScript(
        DAO_EXECUTOR_VALID_SCRIPT_VECTORS.emptySignal.script,
        "signal"
      ),
    };
  }
  if (stateId === "valid-script") {
    return {
      state: stateId,
      proposalType: "executable",
      scriptCheck: checkDaoExecutorScript(
        DAO_EXECUTOR_VALID_SCRIPT_VECTORS.twoCalls.script,
        "executable"
      ),
    };
  }

  const errorCode =
    stateId === "invalid-frame"
      ? "TRUNCATED_HEADER"
      : stateId === "too-many-calls"
        ? "TOO_MANY_CALLS"
        : "SCRIPT_TOO_LARGE";
  const vector = DAO_EXECUTOR_SCRIPT_ERROR_VECTORS.find(
    (candidate) => candidate.expectedCode === errorCode
  );
  if (!vector) throw new Error(`Missing DAO authoring vector: ${errorCode}.`);
  return {
    state: stateId,
    proposalType: vector.proposalType ?? "executable",
    scriptCheck: checkDaoExecutorScript(
      vector.script,
      vector.proposalType ?? "executable"
    ),
  };
}

function parseUnsignedBigInt(value: string, label: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${label} must be a canonical unsigned decimal.`);
  }
  return BigInt(value);
}

export function subscribeDaoMockStore(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDaoMockSnapshot(): DaoMockRuntimeSnapshot {
  getState();
  return snapshot as DaoMockRuntimeSnapshot;
}

export function resetDaoMockStore(
  options: { fixtureId?: DaoMockFixtureId; now?: number } = {}
) {
  commit(
    createStoreState(
      options.now ?? nowSeconds(),
      options.fixtureId ?? DEFAULT_FIXTURE_ID
    )
  );
  return getDaoMockSnapshot();
}

export function applyDaoMockFixture(fixtureId: DaoMockFixtureId) {
  const current = getState();
  commit(createStoreState(current.now, fixtureId));
  return getDaoMockSnapshot();
}

export function syncDaoMockStoreToNow(timestamp: number = nowSeconds()) {
  if (!Number.isSafeInteger(timestamp)) {
    throw new Error("DAO mock time must be a safe integer timestamp.");
  }
  return updateStore((current) => {
    current.now = timestamp;
  });
}

export function setDaoMockSurface(surface: DaoMockSurfaceState) {
  return updateStore((current) => {
    current.surface = surface;
  });
}

export function setDaoMockLoading(value: boolean) {
  return setDaoMockSurface(value ? "loading" : "ready");
}

export function setDaoMockEmpty(value: boolean) {
  return setDaoMockSurface(value ? "empty" : "ready");
}

export function setDaoMockSelectedProposal(proposalId: string) {
  const parsed = parseUnsignedBigInt(proposalId, "DAO proposal ID");
  return updateStore((current) => {
    if (
      !current.proposals.some(
        (runtime) => runtime.proposal.ref.proposalId === parsed
      )
    ) {
      throw new Error(`Unknown DAO mock proposal ${proposalId}.`);
    }
    current.selectedProposalId = parsed;
    current.selectedFixtureId = null;
  });
}

export function setDaoMockPersona(persona: DaoMockPersona) {
  return updateStore((current) => {
    current.persona = persona;
    current.account.connected = persona !== "observer";
    current.account.correctChain = true;
    current.account.isProposer = persona === "proposer";
    current.account.isOperator = persona === "operator";
    current.account.isGuardian = persona === "guardian";
    current.account.hasVoted = false;
    current.account.voteDirection = null;
    current.account.votingWeight = persona === "observer" ? 0n : DEFAULT_WEIGHT;
    current.accountDecayLengthSeconds = 0;
    current.proposer.connected = persona !== "observer";
    current.proposer.correctChain = true;
    current.proposer.blacklisted = false;
    current.proposer.currentWeight =
      persona === "proposer" ? DEFAULT_WEIGHT : current.proposer.currentWeight;
  });
}

export function setDaoMockRole(role: DaoMockRole, enabled: boolean) {
  return updateStore((current) => {
    if (role === "proposer") current.account.isProposer = enabled;
    if (role === "operator") current.account.isOperator = enabled;
    if (role === "guardian") current.account.isGuardian = enabled;
  });
}

export function setDaoMockContentState(contentState: DaoMockContentState) {
  return updateStore((current) => {
    const sourceFixture =
      contentState === "unavailable"
        ? "content-unavailable"
        : contentState === "invalid"
          ? "content-invalid"
          : contentState === "unverified-forum"
            ? "direct-proposal"
            : "voting";
    const sourceId = getDaoMockFixture(sourceFixture).proposalRef.proposalId;
    const source = createAnchoredProposalRuntimes(current.now).find(
      (runtime) => runtime.proposal.ref.proposalId === sourceId
    );
    if (!source) throw new Error(`Unknown DAO content fixture: ${sourceFixture}.`);
    updateSelectedProposal(current, (selected) => {
      if (contentState !== "unverified-forum") {
        selected.proposal.content = cloneValue(source.proposal.content);
      }
      selected.proposal.discussion = cloneValue(source.proposal.discussion);
    });
  });
}

export function setDaoMockLifecycle(lifecycle: DaoMockLifecycleState) {
  const fixtureByLifecycle: Record<DaoMockLifecycleState, DaoMockFixtureId> = {
    discussion: "discussion",
    voting: "voting",
    approved: "approved-executable",
    rejected: "rejected",
    expired: "expired",
    retracted: "retracted",
    flagged: "flagged",
  };
  return updateStore((current) => {
    replaceSelectedProposal(current, fixtureByLifecycle[lifecycle]);
  });
}

export function setDaoMockVetoState(vetoState: DaoMockVetoState) {
  return updateStore((current) => {
    replaceSelectedProposal(
      current,
      vetoState === "before-votes" ? "early-veto" : "post-vote-veto"
    );
  });
}

export function setDaoMockAnalysisState(analysisState: DaoMockAnalysisState) {
  return updateStore((current) => {
    if (analysisState === "hash-mismatch") {
      const sourceId = getDaoMockFixture("hash-mismatch").proposalRef.proposalId;
      const source = createAnchoredProposalRuntimes(current.now).find(
        (runtime) => runtime.proposal.ref.proposalId === sourceId
      );
      if (!source) throw new Error("Missing DAO hash mismatch fixture.");
      updateSelectedProposal(current, (selected) => {
        selected.proposal.type = "executable";
        selected.proposal.script = cloneValue(source.proposal.script);
        selected.proposal.executionStartsAt = source.proposal.executionStartsAt;
        selected.proposal.executionEndsAt = source.proposal.executionEndsAt;
        selected.postVoteEpochEndsAt = source.postVoteEpochEndsAt;
      });
      return;
    }

    const fixtureByAnalysis: Record<
      Exclude<DaoMockAnalysisState, "hash-mismatch">,
      DaoMockFixtureId
    > = {
      pending: "analysis-pending",
      decoded: "voting",
      partial: "partial-decode",
      failed: "simulation-failed",
    };
    const sourceId = getDaoMockFixture(
      fixtureByAnalysis[analysisState]
    ).proposalRef.proposalId;
    const source = createAnchoredProposalRuntimes(current.now).find(
      (runtime) => runtime.proposal.ref.proposalId === sourceId
    );
    if (!source) throw new Error(`Unknown DAO analysis state: ${analysisState}.`);
    updateSelectedProposal(current, (selected) => {
      selected.proposal.analysis = cloneValue(source.proposal.analysis);
      if (selected.proposal.type === "executable") {
        selected.proposal.script.hashVerified = true;
      }
    });
  });
}

export function setDaoMockAccountState(accountState: DaoMockAccountState) {
  return updateStore((current) => {
    current.account.connected = true;
    current.account.correctChain = true;
    current.account.hasVoted = accountState === "already-voted";
    current.account.voteDirection =
      accountState === "already-voted" ? "yea" : null;
    current.account.votingWeight =
      accountState === "no-weight" ? 0n : DEFAULT_WEIGHT;
    current.accountDecayLengthSeconds =
      accountState === "late-decayed" ? DAY_SECONDS : 0;
    if (accountState === "late-decayed") {
      replaceSelectedProposal(current, "late-voting");
    }
  });
}

export function setDaoMockAccountWeight(weight: string) {
  return updateStore((current) => {
    current.account.votingWeight = parseUnsignedBigInt(
      weight,
      "DAO account weight"
    );
  });
}

export function setDaoMockAlreadyVoted(
  hasVoted: boolean,
  direction: "yea" | "nay" | null = hasVoted ? "yea" : null
) {
  return updateStore((current) => {
    current.account.hasVoted = hasVoted;
    current.account.voteDirection = hasVoted ? direction ?? "yea" : null;
  });
}

export function setDaoMockExecutionState(executionState: DaoMockExecutionState) {
  return updateStore((current) => {
    if (executionState === "signal") {
      const sourceId = getDaoMockFixture("approved-signal").proposalRef.proposalId;
      const source = createAnchoredProposalRuntimes(current.now).find(
        (runtime) => runtime.proposal.ref.proposalId === sourceId
      );
      if (!source) throw new Error("Missing DAO signal fixture.");
      updateSelectedProposal(current, (selected) => {
        selected.proposal.type = "signal";
        selected.proposal.script = cloneValue(source.proposal.script);
        selected.proposal.analysis = cloneValue(source.proposal.analysis);
        selected.proposal.executionStartsAt = null;
        selected.proposal.executionEndsAt = null;
        selected.postVoteEpochEndsAt = selected.proposal.voteEndsAt + 14 * DAY_SECONDS;
        if (selected.proposal.content.value) {
          selected.proposal.content.value.proposalType = "signal";
        }
      });
      return;
    }

    if (executionState === "executable") {
      const sourceId = getDaoMockFixture("voting").proposalRef.proposalId;
      const source = createAnchoredProposalRuntimes(current.now).find(
        (runtime) => runtime.proposal.ref.proposalId === sourceId
      );
      if (!source) throw new Error("Missing DAO executable fixture.");
      updateSelectedProposal(current, (selected) => {
        selected.proposal.type = "executable";
        selected.proposal.script = cloneValue(source.proposal.script);
        selected.proposal.analysis = cloneValue(source.proposal.analysis);
        selected.proposal.executionStartsAt = selected.proposal.voteEndsAt + DAY_SECONDS;
        selected.proposal.executionEndsAt = selected.proposal.voteEndsAt + 14 * DAY_SECONDS;
        selected.postVoteEpochEndsAt = selected.proposal.executionEndsAt;
        if (selected.proposal.content.value) {
          selected.proposal.content.value.proposalType = "executable";
        }
      });
      return;
    }

    const fixtureId =
      executionState === "permissionless"
        ? "permissionless-execution"
        : "guarded-execution";
    replaceSelectedProposal(current, fixtureId);
    current.executionGuard =
      executionState === "permissionless" ? "permissionless" : "guarded";
    current.account.isOperator = executionState !== "permissionless";
    current.account.executionPreflight = {
      ...current.account.executionPreflight,
      state: executionState === "simulation-failure" ? "failed" : "succeeded",
      scriptHash: getSelectedProposalRuntime(current).proposal.script.hash,
      blockNumber: 24_000_001n,
      simulatedAt: new Date(current.now * 1_000).toISOString(),
      error:
        executionState === "simulation-failure"
          ? "Mock current-state simulation reverted."
          : null,
    };
  });
}

export function setDaoMockExecutionGuard(guard: DaoExecutionGuard) {
  return updateStore((current) => {
    current.executionGuard = guard;
  });
}

export function setDaoMockAuthoringState(authoringState: DaoMockAuthoringState) {
  return updateStore((current) => {
    current.authoring = createAuthoringState(authoringState);
  });
}

export function setDaoMockProposerState(proposerState: DaoMockProposerState) {
  return updateStore((current) => {
    current.proposer.connected = true;
    current.proposer.correctChain = true;
    current.proposer.blacklisted = proposerState === "blacklisted";
    current.proposer.currentWeight =
      proposerState === "insufficient-weight"
        ? 0n
        : current.proposer.minimumWeight + 1n;
    current.proposer.lastProposedAt =
      proposerState === "cooldown" ? current.now : null;
    current.proposer.affectedBoostEpochs =
      current.proposer.affectedBoostEpochs.map((affected, index) => ({
        ...affected,
        currentProposalCount:
          proposerState === "capacity-full" && index === 2
            ? affected.proposalLimit
            : Math.min(affected.currentProposalCount, affected.proposalLimit - 1),
      }));
  });
}

export function setDaoMockProposalVotes(totalWeight: string, yeaWeight: string) {
  const total = parseUnsignedBigInt(totalWeight, "DAO total vote weight");
  const yea = parseUnsignedBigInt(yeaWeight, "DAO Yea vote weight");
  if (yea > total) throw new Error("DAO Yea weight cannot exceed total weight.");
  return updateStore((current) => {
    updateSelectedProposal(current, (selected) => {
      selected.proposal.totalWeight = total;
      selected.proposal.yeaWeight = yea;
      selected.proposal.nayWeight = total - yea;
    });
  });
}

export function setDaoMockProposalThreshold(thresholdBps: number) {
  if (!Number.isInteger(thresholdBps) || thresholdBps < 0 || thresholdBps > 10_000) {
    throw new Error("DAO threshold must be an integer from 0 through 10,000.");
  }
  return updateStore((current) => {
    updateSelectedProposal(current, (selected) => {
      selected.proposal.thresholdBps = thresholdBps;
    });
  });
}

export function setDaoMockProposalFlags(flags: DaoMockProposalFlagsPatch) {
  return updateStore((current) => {
    updateSelectedProposal(current, (selected) => {
      if (flags.retracted !== undefined) selected.retracted = flags.retracted;
      if (flags.executed !== undefined) selected.executed = flags.executed;
      if (flags.flagged !== undefined) selected.flagged = flags.flagged;
      if (flags.vetoed !== undefined) selected.vetoed = flags.vetoed;
    });
  });
}

export function setDaoMockProposalTiming(timing: DaoMockProposalTimingPatch) {
  return updateStore((current) => {
    updateSelectedProposal(current, (selected) => {
      if (timing.createdAt !== undefined) {
        selected.proposal.createdAt = timing.createdAt;
      }
      if (timing.voteStartsAt !== undefined) {
        selected.proposal.voteStartsAt = timing.voteStartsAt;
      }
      if (timing.voteEndsAt !== undefined) {
        selected.proposal.voteEndsAt = timing.voteEndsAt;
      }
      if (timing.executionStartsAt !== undefined) {
        selected.proposal.executionStartsAt = timing.executionStartsAt;
      }
      if (timing.executionEndsAt !== undefined) {
        selected.proposal.executionEndsAt = timing.executionEndsAt;
      }
      if (timing.postVoteEpochEndsAt !== undefined) {
        selected.postVoteEpochEndsAt = timing.postVoteEpochEndsAt;
      }
      if (timing.vetoEndsAt !== undefined) {
        selected.vetoEndsAt = timing.vetoEndsAt;
      }
    });
  });
}

export function setDaoMockProposerWeights(currentWeight: string, minimumWeight: string) {
  return updateStore((current) => {
    current.proposer.currentWeight = parseUnsignedBigInt(
      currentWeight,
      "DAO proposer weight"
    );
    current.proposer.minimumWeight = parseUnsignedBigInt(
      minimumWeight,
      "DAO minimum proposer weight"
    );
  });
}

export function setDaoMockProposerBlacklist(blacklisted: boolean) {
  return updateStore((current) => {
    current.proposer.blacklisted = blacklisted;
  });
}

export function setDaoMockProposerCooldown(
  lastProposedAt: number | null,
  cooldownSeconds: number
) {
  return updateStore((current) => {
    current.proposer.lastProposedAt = lastProposedAt;
    current.proposer.cooldownSeconds = cooldownSeconds;
  });
}

export function setDaoMockProposalCapacity(index: number, count: number) {
  if (!Number.isInteger(index) || index < 0 || index >= 6) {
    throw new Error("DAO proposal capacity index must be from 0 through 5.");
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("DAO proposal capacity count must be a non-negative integer.");
  }
  return updateStore((current) => {
    current.proposer.affectedBoostEpochs[index].currentProposalCount = count;
  });
}

export function readDaoMockFeed() {
  return cloneValue(getDaoMockSnapshot().feed);
}

export function readDaoMockProposal(ref: DaoProposalRef): DaoProposalLookup {
  const current = getState();
  const runtime = getProposalRuntimeByRef(current, ref);
  if (runtime) {
    return { state: "found", proposal: cloneValue(runtime.proposal) };
  }
  return {
    state: "not_found",
    ref: cloneValue(ref),
    protocolStatus: "invalid",
    displayStatus: "not_found",
  };
}

export function readDaoMockAccountProposalState(
  ref: DaoProposalRef,
  address: Address
): DaoAccountProposalState {
  const current = getState();
  const runtime = getProposalRuntimeByRef(current, ref);
  if (!runtime) {
    throw new Error(`Unknown DAO proposal ${serializeDaoProposalRef(ref)}.`);
  }
  const weight = deriveDaoVotingWeight({
    votingWeight: current.account.votingWeight,
    now: current.now,
    voteEndsAt: runtime.proposal.voteEndsAt,
    decayLengthSeconds: current.accountDecayLengthSeconds,
  });
  const account = {
    ...cloneValue(current.account),
    ...weight,
    address,
  };
  return {
    ...account,
    capabilities: deriveDaoCapabilities({
      proposal: runtime.proposal,
      account,
      now: current.now,
      vetoEndsAt: runtime.vetoEndsAt,
      executionGuard: current.executionGuard,
    }),
  };
}

export function readDaoMockProposerState(address: Address): DaoProposerState {
  return deriveDaoProposerState({
    ...cloneValue(getState().proposer),
    address,
  });
}

export function createDaoTestBridgeAdapter(): DaoTestBridgeAdapter {
  return {
    resetDao: async () => {
      resetDaoMockStore();
    },
    setDaoFixture: async (fixtureId) => {
      applyDaoMockFixture(fixtureId);
    },
    setDaoSelectedProposal: async (proposalId) => {
      setDaoMockSelectedProposal(proposalId);
    },
    setDaoLoading: async (value) => {
      setDaoMockLoading(value);
    },
    setDaoEmpty: async (value) => {
      setDaoMockEmpty(value);
    },
    setDaoSurface: async (surface) => {
      setDaoMockSurface(surface);
    },
    setDaoPersona: async (persona) => {
      setDaoMockPersona(persona);
    },
    setDaoRole: async (role, enabled) => {
      setDaoMockRole(role, enabled);
    },
    setDaoContentState: async (contentState) => {
      setDaoMockContentState(contentState);
    },
    setDaoLifecycle: async (lifecycle) => {
      setDaoMockLifecycle(lifecycle);
    },
    setDaoVetoState: async (vetoState) => {
      setDaoMockVetoState(vetoState);
    },
    setDaoAnalysisState: async (analysisState) => {
      setDaoMockAnalysisState(analysisState);
    },
    setDaoAccountState: async (accountState) => {
      setDaoMockAccountState(accountState);
    },
    setDaoAccountWeight: async (weight) => {
      setDaoMockAccountWeight(weight);
    },
    setDaoAlreadyVoted: async (hasVoted, direction) => {
      setDaoMockAlreadyVoted(hasVoted, direction);
    },
    setDaoExecutionState: async (executionState) => {
      setDaoMockExecutionState(executionState);
    },
    setDaoExecutionGuard: async (guard) => {
      setDaoMockExecutionGuard(guard);
    },
    setDaoAuthoringState: async (authoringState) => {
      setDaoMockAuthoringState(authoringState);
    },
    setDaoProposerState: async (proposerState) => {
      setDaoMockProposerState(proposerState);
    },
    setDaoProposalVotes: async (totalWeight, yeaWeight) => {
      setDaoMockProposalVotes(totalWeight, yeaWeight);
    },
    setDaoProposalThreshold: async (thresholdBps) => {
      setDaoMockProposalThreshold(thresholdBps);
    },
    setDaoProposalFlags: async (flags) => {
      setDaoMockProposalFlags(flags);
    },
    setDaoProposalTiming: async (timing) => {
      setDaoMockProposalTiming(timing);
    },
    setDaoProposerWeights: async (currentWeight, minimumWeight) => {
      setDaoMockProposerWeights(currentWeight, minimumWeight);
    },
    setDaoProposerBlacklist: async (blacklisted) => {
      setDaoMockProposerBlacklist(blacklisted);
    },
    setDaoProposerCooldown: async (lastProposedAt, cooldownSeconds) => {
      setDaoMockProposerCooldown(lastProposedAt, cooldownSeconds);
    },
    setDaoProposalCapacity: async (index, count) => {
      setDaoMockProposalCapacity(index, count);
    },
    onSetNow: async (timestamp) => {
      syncDaoMockStoreToNow(timestamp);
    },
  };
}
