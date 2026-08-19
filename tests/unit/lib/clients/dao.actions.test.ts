import { beforeEach, describe, expect, it } from "vitest";
import {
  applyDaoMockFixture,
  DAO_BLOCKED_REASONS,
  DAO_MOCK_ACCOUNT_ADDRESS,
  DAO_MOCK_NOW,
  getDaoMockSnapshot,
  indexDaoMockPendingAction,
  prepareDaoMockExecute,
  prepareDaoMockFlag,
  prepareDaoMockRetract,
  prepareDaoMockVeto,
  prepareDaoMockVote,
  readDaoMockAccountProposalState,
  resetDaoMockStore,
  setDaoMockAccountState,
  setDaoMockRole,
  setDaoMockTransactionOutcome,
  validateDaoModerationReason,
  type DaoActionType,
  type DaoMockFixtureId,
  type DaoProposal,
} from "@/lib/clients/dao";

describe("DAO mock proposal actions", () => {
  beforeEach(() => {
    resetDaoMockStore({ now: DAO_MOCK_NOW });
  });

  it("keeps a submitted vote out of canonical history until indexing", async () => {
    const before = selectedProposal();
    const totals = {
      total: before.totalWeight,
      yea: before.yeaWeight,
      events: before.events.length,
    };
    const prepared = prepareDaoMockVote(
      before.ref,
      DAO_MOCK_ACCOUNT_ADDRESS,
      "yea"
    );

    await expect(prepared()).resolves.toMatch(/^0x[0-9a-f]{64}$/);

    const awaiting = selectedProposal();
    expect(awaiting.totalWeight).toBe(totals.total);
    expect(awaiting.yeaWeight).toBe(totals.yea);
    expect(awaiting.events).toHaveLength(totals.events);
    expect(getDaoMockSnapshot().pendingAction).toMatchObject({
      action: "vote",
      direction: "yea",
      effectiveVotingWeight: 100n * 10n ** 18n,
    });
    expect(
      readDaoMockAccountProposalState(
        before.ref,
        DAO_MOCK_ACCOUNT_ADDRESS
      )
    ).toMatchObject({
      hasVoted: true,
      voteDirection: "yea",
      capabilities: {
        canVote: false,
        voteBlockedReason: DAO_BLOCKED_REASONS.voteAlreadySubmitted,
      },
    });

    indexDaoMockPendingAction();

    const indexed = selectedProposal();
    expect(indexed.totalWeight).toBe(totals.total + 100n * 10n ** 18n);
    expect(indexed.yeaWeight).toBe(totals.yea + 100n * 10n ** 18n);
    expect(indexed.events).toHaveLength(totals.events + 1);
    expect(indexed.events.at(-1)).toMatchObject({
      type: "vote",
      actor: DAO_MOCK_ACCOUNT_ADDRESS,
      voteActorKind: "human",
      yeaBps: 10_000,
      direction: "yea",
      weight: 100n * 10n ** 18n,
    });
    expect(getDaoMockSnapshot().pendingAction).toBeNull();
  });

  it("allows participation voting after a post-vote veto", async () => {
    const proposal = load("post-vote-veto");
    const account = readDaoMockAccountProposalState(
      proposal.ref,
      DAO_MOCK_ACCOUNT_ADDRESS
    );
    expect(account.capabilities).toMatchObject({
      canVote: true,
      votePurpose: "participation_only",
    });

    await prepareDaoMockVote(
      proposal.ref,
      DAO_MOCK_ACCOUNT_ADDRESS,
      "nay"
    )();
    indexDaoMockPendingAction();

    expect(selectedProposal()).toMatchObject({
      protocolStatus: "vetoed",
      displayStatus: "vetoed",
    });
    expect(selectedProposal().events.at(-1)).toMatchObject({
      type: "vote",
      direction: "nay",
    });
  });

  it("blocks an early-veto vote, a duplicate vote, and zero effective weight", () => {
    const earlyVeto = load("early-veto");
    expect(() =>
      prepareDaoMockVote(
        earlyVeto.ref,
        DAO_MOCK_ACCOUNT_ADDRESS,
        "yea"
      )
    ).toThrow(DAO_BLOCKED_REASONS.voteLifecycle);

    const voting = load("voting");
    setDaoMockAccountState("already-voted");
    expect(() =>
      prepareDaoMockVote(voting.ref, DAO_MOCK_ACCOUNT_ADDRESS, "nay")
    ).toThrow(DAO_BLOCKED_REASONS.voteAlreadySubmitted);

    setDaoMockAccountState("no-weight");
    expect(() =>
      prepareDaoMockVote(voting.ref, DAO_MOCK_ACCOUNT_ADDRESS, "nay")
    ).toThrow(DAO_BLOCKED_REASONS.zeroVotingWeight);
  });

  it.each([
    ["retract", "discussion", "proposer", "retracted", null],
    ["flag", "discussion", "operator", "flagged", "Malformed or spam"],
    ["veto", "discussion", "guardian", "vetoed", "Emergency veto"],
    ["execute", "permissionless-execution", null, "executed", null],
  ] as const)(
    "applies the exact %s effect only after indexing",
    async (action, fixture, role, expectedStatus, reason) => {
      const proposal = load(fixture);
      if (role) setDaoMockRole(role, true);
      const beforeEvents = selectedProposal().events.length;
      const prepared = prepareAction(action, proposal, reason);

      await prepared();
      expect(selectedProposal().displayStatus).not.toBe(expectedStatus);
      expect(getDaoMockSnapshot().pendingAction).toMatchObject({ action });

      indexDaoMockPendingAction();

      const indexed = selectedProposal();
      expect(indexed.displayStatus).toBe(expectedStatus);
      expect(indexed.events).toHaveLength(beforeEvents + 1);
      expect(indexed.events.at(-1)).toMatchObject({
        type: action,
        reason,
      });
      if (action === "flag") {
        expect(indexed.moderation.flagReason).toBe(reason);
      }
      if (action === "veto") {
        expect(indexed.moderation.vetoReason).toBe(reason);
        expect(
          readDaoMockAccountProposalState(
            indexed.ref,
            DAO_MOCK_ACCOUNT_ADDRESS
          ).capabilities.canVote
        ).toBe(false);
      }
    }
  );

  it("keeps post-vote veto participation open after the veto is indexed", async () => {
    const proposal = load("voting");
    setDaoMockRole("guardian", true);
    await prepareDaoMockVeto(
      proposal.ref,
      DAO_MOCK_ACCOUNT_ADDRESS,
      "Post-vote safeguard"
    )();
    indexDaoMockPendingAction();

    const indexed = selectedProposal();
    expect(indexed.protocolStatus).toBe("vetoed");
    expect(
      readDaoMockAccountProposalState(
        indexed.ref,
        DAO_MOCK_ACCOUNT_ADDRESS
      ).capabilities
    ).toMatchObject({ canVote: true, votePurpose: "participation_only" });
  });

  it.each(["user-rejected", "revert", "network-error"] as const)(
    "does not create a pending action when the transaction outcome is %s",
    async (outcome) => {
      const proposal = load("voting");
      setDaoMockTransactionOutcome(outcome);
      const prepared = prepareDaoMockVote(
        proposal.ref,
        DAO_MOCK_ACCOUNT_ADDRESS,
        "yea"
      );

      await expect(prepared()).rejects.toThrow();
      expect(getDaoMockSnapshot().pendingAction).toBeNull();
      expect(getDaoMockSnapshot().account.hasVoted).toBe(false);
    }
  );

  it("validates required moderation reasons against the pinned UTF-8 byte bound", () => {
    expect(validateDaoModerationReason("  ")).toMatchObject({
      bytes: 0,
      error: "Enter a reason.",
    });
    expect(validateDaoModerationReason("a".repeat(256))).toMatchObject({
      bytes: 256,
      error: null,
    });
    expect(validateDaoModerationReason("é".repeat(129))).toMatchObject({
      bytes: 258,
      error: "Reason must be at most 256 UTF-8 bytes.",
    });
  });

  it("resets transaction controls and any pending live overlay", async () => {
    const proposal = load("voting");
    await prepareDaoMockVote(
      proposal.ref,
      DAO_MOCK_ACCOUNT_ADDRESS,
      "yea"
    )();
    setDaoMockTransactionOutcome("network-error");

    expect(getDaoMockSnapshot()).toMatchObject({
      transactionOutcome: "network-error",
      pendingAction: { action: "vote" },
    });

    resetDaoMockStore({ now: DAO_MOCK_NOW });
    expect(getDaoMockSnapshot()).toMatchObject({
      transactionOutcome: "success",
      pendingAction: null,
    });
  });
});

function load(fixture: DaoMockFixtureId): DaoProposal {
  applyDaoMockFixture(fixture);
  return selectedProposal();
}

function selectedProposal(): DaoProposal {
  const runtime = getDaoMockSnapshot();
  const proposal = runtime.feed.proposals.find(
    (candidate) => candidate.ref.proposalId === runtime.selectedProposalId
  );
  if (!proposal) throw new Error("Selected DAO proposal is unavailable.");
  return proposal;
}

function prepareAction(
  action: Exclude<DaoActionType, "vote">,
  proposal: DaoProposal,
  reason: string | null
) {
  if (action === "retract") {
    return prepareDaoMockRetract(proposal.ref, DAO_MOCK_ACCOUNT_ADDRESS);
  }
  if (action === "flag") {
    return prepareDaoMockFlag(
      proposal.ref,
      DAO_MOCK_ACCOUNT_ADDRESS,
      reason ?? "Flag"
    );
  }
  if (action === "veto") {
    return prepareDaoMockVeto(
      proposal.ref,
      DAO_MOCK_ACCOUNT_ADDRESS,
      reason ?? "Veto"
    );
  }
  return prepareDaoMockExecute(proposal.ref, DAO_MOCK_ACCOUNT_ADDRESS);
}
