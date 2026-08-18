import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyDaoMockFixture,
  createRuntimeMockDaoClient,
  DAO_BLOCKED_REASONS,
  DAO_MOCK_ACCOUNT_ADDRESS,
  DAO_MOCK_FIXTURE_IDS,
  DAO_MOCK_NOW,
  getDaoMockSnapshot,
  readDaoMockAccountProposalState,
  readDaoMockProposerState,
  resetDaoMockStore,
  setDaoMockAccountState,
  setDaoMockAnalysisState,
  setDaoMockAuthoringState,
  setDaoMockContentState,
  setDaoMockEmpty,
  setDaoMockExecutionState,
  setDaoMockLifecycle,
  setDaoMockPersona,
  setDaoMockProposalCapacity,
  setDaoMockProposalFlags,
  setDaoMockProposalThreshold,
  setDaoMockProposalTiming,
  setDaoMockProposalVotes,
  setDaoMockProposerState,
  setDaoMockRole,
  setDaoMockSelectedProposal,
  setDaoMockVetoState,
  subscribeDaoMockStore,
  syncDaoMockStoreToNow,
  type DaoMockFixtureId,
} from "@/lib/clients/dao";
import { setFixedNow } from "@/lib/mocks/time";

const DAY_SECONDS = 86_400;

describe("DAO mutable mock store", () => {
  beforeEach(() => {
    setFixedNow(DAO_MOCK_NOW);
    resetDaoMockStore();
  });

  afterEach(() => {
    setFixedNow(null);
  });

  it("loads every required fixture through the mutable runtime", () => {
    for (const fixtureId of DAO_MOCK_FIXTURE_IDS) {
      const snapshot = applyDaoMockFixture(fixtureId);

      expect(snapshot.selectedFixtureId).toBe(fixtureId);
      expect(snapshot.feed.proposals).toHaveLength(22);
      expect(
        snapshot.feed.proposals.some(
          (proposal) =>
            proposal.ref.proposalId === snapshot.selectedProposalId
        )
      ).toBe(true);
    }
  });

  it("recomputes lifecycle and capabilities when deterministic time changes", () => {
    const discussion = applyDaoMockFixture("discussion");
    const ref = discussion.feed.proposals.find(
      (proposal) => proposal.ref.proposalId === discussion.selectedProposalId
    )!.ref;

    expect(
      discussion.feed.proposals.find(
        (proposal) => proposal.ref.proposalId === discussion.selectedProposalId
      )?.displayStatus
    ).toBe("discussion");
    expect(
      readDaoMockAccountProposalState(ref, DAO_MOCK_ACCOUNT_ADDRESS).capabilities
        .canVote
    ).toBe(false);

    syncDaoMockStoreToNow(DAO_MOCK_NOW + 4 * DAY_SECONDS);

    const voting = getDaoMockSnapshot();
    expect(
      voting.feed.proposals.find(
        (proposal) => proposal.ref.proposalId === voting.selectedProposalId
      )?.displayStatus
    ).toBe("voting");
    expect(
      readDaoMockAccountProposalState(ref, DAO_MOCK_ACCOUNT_ADDRESS).capabilities
    ).toMatchObject({ canVote: true, votePurpose: "decision" });

    syncDaoMockStoreToNow(DAO_MOCK_NOW + 11 * DAY_SECONDS);
    expect(
      getDaoMockSnapshot().feed.proposals.find(
        (proposal) => proposal.ref.proposalId === 1n
      )?.displayStatus
    ).toBe("rejected");
  });

  it("keeps pre-vote and post-vote veto capability pairs distinct", () => {
    const assertVeto = (fixtureId: DaoMockFixtureId, canVote: boolean) => {
      const runtime = applyDaoMockFixture(fixtureId);
      const proposal = runtime.feed.proposals.find(
        (candidate) => candidate.ref.proposalId === runtime.selectedProposalId
      )!;
      expect(proposal.displayStatus).toBe("vetoed");
      expect(
        readDaoMockAccountProposalState(
          proposal.ref,
          DAO_MOCK_ACCOUNT_ADDRESS
        ).capabilities.canVote
      ).toBe(canVote);
    };

    assertVeto("early-veto", false);
    assertVeto("post-vote-veto", true);
  });

  it("mutates independent persona, role, proposal, and analysis facts", () => {
    setDaoMockPersona("observer");
    setDaoMockRole("proposer", true);
    setDaoMockRole("operator", true);
    setDaoMockRole("guardian", true);
    setDaoMockSelectedProposal("2");
    setDaoMockProposalVotes("100", "60");
    setDaoMockProposalThreshold(6_000);
    setDaoMockContentState("unavailable");
    setDaoMockAnalysisState("partial");

    const runtime = getDaoMockSnapshot();
    const proposal = runtime.feed.proposals.find(
      (candidate) => candidate.ref.proposalId === 2n
    )!;
    expect(runtime.account).toMatchObject({
      connected: false,
      isProposer: true,
      isOperator: true,
      isGuardian: true,
    });
    expect(proposal).toMatchObject({
      thresholdBps: 6_000,
      totalWeight: 100n,
      yeaWeight: 60n,
      nayWeight: 40n,
      content: { state: "unavailable" },
      analysis: { state: "partial" },
    });
  });

  it("exposes all grouped UI states without bypassing domain derivation", () => {
    setDaoMockLifecycle("approved");
    expect(selectedProposal().displayStatus).toBe("approved");

    setDaoMockVetoState("after-votes");
    expect(selectedProposal()).toMatchObject({
      displayStatus: "vetoed",
      totalWeight: expect.any(BigInt),
    });

    setDaoMockAccountState("late-decayed");
    expect(getDaoMockSnapshot().account.decayBps).toBeGreaterThan(0);
    expect(getDaoMockSnapshot().account.decayBps).toBeLessThan(10_000);

    setDaoMockExecutionState("simulation-failure");
    const execution = getDaoMockSnapshot();
    const executionProposal = selectedProposal();
    expect(
      readDaoMockAccountProposalState(
        executionProposal.ref,
        DAO_MOCK_ACCOUNT_ADDRESS
      ).capabilities.executeBlockedReason
    ).toBe(DAO_BLOCKED_REASONS.executionSimulationFailed);
    expect(execution.executionGuard).toBe("guarded");
  });

  it("keeps all authoring parser states and proposal eligibility states typed", () => {
    const authoringExpectations = [
      ["valid-signal", "empty", null],
      ["valid-script", "valid", null],
      ["invalid-frame", "invalid", "TRUNCATED_HEADER"],
      ["too-many-calls", "invalid", "TOO_MANY_CALLS"],
      ["too-large", "invalid", "SCRIPT_TOO_LARGE"],
    ] as const;

    for (const [authoringState, checkState, errorCode] of authoringExpectations) {
      setDaoMockAuthoringState(authoringState);
      expect(getDaoMockSnapshot().authoring.scriptCheck).toMatchObject({
        state: checkState,
        error: errorCode === null ? null : { code: errorCode },
      });
    }

    setDaoMockProposerState("capacity-full");
    expect(readDaoMockProposerState(DAO_MOCK_ACCOUNT_ADDRESS)).toMatchObject({
      canPropose: false,
      proposeBlockedReason: DAO_BLOCKED_REASONS.proposerCapacity,
    });

    setDaoMockProposalCapacity(2, 0);
    setDaoMockProposerState("eligible");
    expect(readDaoMockProposerState(DAO_MOCK_ACCOUNT_ADDRESS).canPropose).toBe(
      true
    );
  });

  it("supports granular timing and terminal-flag mutations", () => {
    const now = getDaoMockSnapshot().now;
    setDaoMockSelectedProposal("2");
    setDaoMockProposalTiming({
      createdAt: now - 2 * DAY_SECONDS,
      voteStartsAt: now - DAY_SECONDS,
      voteEndsAt: now + DAY_SECONDS,
      executionStartsAt: now + 2 * DAY_SECONDS,
      executionEndsAt: now + 4 * DAY_SECONDS,
      postVoteEpochEndsAt: now + 4 * DAY_SECONDS,
      vetoEndsAt: now + 4 * DAY_SECONDS,
    });
    expect(selectedProposal().displayStatus).toBe("voting");

    setDaoMockProposalFlags({ vetoed: true });
    expect(selectedProposal().displayStatus).toBe("vetoed");
  });

  it("notifies subscribers, models empty state, and resets to the default", () => {
    let notifications = 0;
    const unsubscribe = subscribeDaoMockStore(() => {
      notifications += 1;
    });

    setDaoMockEmpty(true);
    expect(getDaoMockSnapshot().feed.proposals).toEqual([]);

    resetDaoMockStore();
    expect(getDaoMockSnapshot()).toMatchObject({
      surface: "ready",
      selectedFixtureId: "voting",
      selectedProposalId: 2n,
    });
    expect(getDaoMockSnapshot().feed.proposals).toHaveLength(22);
    expect(notifications).toBe(2);
    unsubscribe();
  });

  it("keeps a cached runtime client live and returns defensive clones", async () => {
    const client = createRuntimeMockDaoClient({ latencyMs: 0 });
    const first = await client.getFeed();
    first.proposals[0].content.error = "caller mutation";

    setDaoMockLifecycle("rejected");
    const second = await client.getFeed();

    expect(second.proposals[0].content.error).toBeNull();
    expect(
      second.proposals.find(
        (proposal) =>
          proposal.ref.proposalId === getDaoMockSnapshot().selectedProposalId
      )?.displayStatus
    ).toBe("rejected");
  });
});

function selectedProposal() {
  const runtime = getDaoMockSnapshot();
  const proposal = runtime.feed.proposals.find(
    (candidate) => candidate.ref.proposalId === runtime.selectedProposalId
  );
  if (!proposal) throw new Error("The selected DAO mock proposal is unavailable.");
  return proposal;
}
