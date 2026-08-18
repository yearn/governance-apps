import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import {
  assertDaoProposalInvariants,
  createMockDaoClient,
  DAO_BLOCKED_REASONS,
  DAO_EMPTY_SCRIPT_HASH,
  DAO_MOCK_ACCOUNT_ADDRESS,
  DAO_MOCK_FEED,
  DAO_MOCK_FEED_JSON,
  DAO_MOCK_FIXTURE_IDS,
  deriveDaoProposerState,
  getDaoMockFixture,
  parseDaoBigInt,
  parseDaoFeedJson,
  serializeDaoFeedJson,
  type DaoMockFixtureId,
} from "@/lib/clients/dao";

const requiredFixtures: DaoMockFixtureId[] = [
  "discussion",
  "voting",
  "late-voting",
  "approved-signal",
  "approved-executable",
  "executed",
  "rejected",
  "no-votes",
  "expired",
  "retracted",
  "flagged",
  "early-veto",
  "post-vote-veto",
  "content-unavailable",
  "content-invalid",
  "analysis-pending",
  "partial-decode",
  "simulation-failed",
  "hash-mismatch",
  "direct-proposal",
  "guarded-execution",
  "permissionless-execution",
  "proposal-capacity-full",
];

describe("DAO deterministic mock feed", () => {
  it("exposes every required fixture in stable order", () => {
    expect(DAO_MOCK_FIXTURE_IDS).toEqual(requiredFixtures);
    expect(new Set(DAO_MOCK_FIXTURE_IDS).size).toBe(requiredFixtures.length);
  });

  it("keeps every feed proposal inside the domain invariants", () => {
    expect(DAO_MOCK_FEED.schemaVersion).toBe(1);
    expect(DAO_MOCK_FEED.proposals).toHaveLength(22);
    for (const proposal of DAO_MOCK_FEED.proposals) {
      expect(() => assertDaoProposalInvariants(proposal)).not.toThrow();
    }
    const thresholds = new Set(
      DAO_MOCK_FEED.proposals.map((proposal) => proposal.thresholdBps)
    );
    expect(thresholds.size).toBeGreaterThan(1);
  });

  it("pins the early-veto and post-vote-veto distinctions", () => {
    const early = DAO_MOCK_FEED.proposals.find(
      (proposal) => proposal.ref.proposalId === 12n
    );
    const afterVotes = DAO_MOCK_FEED.proposals.find(
      (proposal) => proposal.ref.proposalId === 13n
    );

    expect(early).toMatchObject({
      protocolStatus: "vetoed",
      totalWeight: 0n,
    });
    expect(afterVotes).toMatchObject({
      protocolStatus: "vetoed",
      totalWeight: 250n * 10n ** 18n,
    });
    expect(early?.events.at(-1)?.reason).toMatch(/before the first vote/i);
    expect(afterVotes?.events.at(-1)?.reason).toMatch(/after participation/i);
  });

  it("pins lifecycle, timing, and vote distinctions in the selected proposals", () => {
    const byId = new Map(
      DAO_MOCK_FEED.proposals.map((proposal) => [
        proposal.ref.proposalId,
        proposal,
      ])
    );

    expect(byId.get(1n)).toMatchObject({
      createdAt: DAO_MOCK_FEED.canonicalBlock.timestamp,
      protocolStatus: "proposed",
      displayGroup: "upcoming",
      totalWeight: 0n,
    });
    expect(byId.get(2n)?.protocolStatus).toBe("voting");
    expect(byId.get(5n)).toMatchObject({
      protocolStatus: "passed",
      displayStatus: "approved",
      displayGroup: "active",
    });
    expect(byId.get(5n)!.executionStartsAt).toBeGreaterThan(
      DAO_MOCK_FEED.canonicalBlock.timestamp
    );
    expect(byId.get(6n)?.protocolStatus).toBe("executed");
    expect(byId.get(6n)?.events.some((event) => event.type === "execute")).toBe(
      true
    );
    expect(byId.get(7n)).toMatchObject({
      protocolStatus: "failed",
      thresholdBps: 6_000,
      totalWeight: 100n,
      yeaWeight: 49n,
    });
    expect(byId.get(8n)).toMatchObject({
      protocolStatus: "failed",
      totalWeight: 0n,
    });
    expect(byId.get(9n)?.protocolStatus).toBe("expired");
    expect(byId.get(10n)?.protocolStatus).toBe("retracted");
    expect(byId.get(11n)?.moderation.flagReason).toMatch(/malformed/i);
  });

  it("derives a decayed effective weight in the late-voting fixture", () => {
    const late = getDaoMockFixture("late-voting");

    expect(late.account.decayBps).toBeGreaterThan(0);
    expect(late.account.decayBps).toBeLessThan(10_000);
    expect(late.account.effectiveVotingWeight).toBeLessThan(
      late.account.votingWeight
    );
  });

  it("represents terminal signal approval without executable actions", () => {
    const signal = DAO_MOCK_FEED.proposals.find(
      (proposal) => proposal.ref.proposalId === 4n
    );

    expect(signal).toMatchObject({
      type: "signal",
      protocolStatus: "executed",
      displayStatus: "approved",
      displayGroup: "closed",
      script: {
        bytes: "0x",
        hash: DAO_EMPTY_SCRIPT_HASH,
        hashVerified: true,
      },
    });
  });

  it("keeps content and analysis failure states distinct", () => {
    const byId = new Map(
      DAO_MOCK_FEED.proposals.map((proposal) => [
        proposal.ref.proposalId,
        proposal,
      ])
    );

    expect(byId.get(14n)?.content.state).toBe("unavailable");
    expect(byId.get(14n)?.discussion).toMatchObject({
      state: "verified",
      url: expect.stringContaining("gov.yearn.fi"),
    });
    expect(byId.get(15n)?.content.state).toBe("invalid");
    expect(byId.get(16n)?.analysis.state).toBe("pending");
    expect(byId.get(17n)?.analysis).toMatchObject({ state: "partial" });
    expect(
      byId.get(17n)?.analysis.calls.map((call) => call.decodeStatus)
    ).toEqual(["verified", "unknown"]);
    expect(byId.get(18n)?.analysis.proposalSimulation.state).toBe("failed");
    expect(byId.get(19n)?.script.hashVerified).toBe(false);
    expect(byId.get(20n)?.discussion.state).toBe("unverified");
  });

  it("round-trips every bigint through canonical decimal JSON strings", () => {
    const parsed = parseDaoFeedJson(DAO_MOCK_FEED_JSON);

    expect(parsed).toEqual(DAO_MOCK_FEED);
    expect(serializeDaoFeedJson(parsed)).toEqual(DAO_MOCK_FEED_JSON);
    expect(typeof DAO_MOCK_FEED_JSON.proposals[0].ref.proposalId).toBe("string");
    expect(typeof DAO_MOCK_FEED_JSON.proposals[0].events[0].log.blockNumber).toBe(
      "string"
    );
  });

  it("rejects ambiguous or signed bigint JSON values", () => {
    expect(() => parseDaoBigInt("01")).toThrow(/canonical unsigned decimals/i);
    expect(() => parseDaoBigInt("-1")).toThrow(/canonical unsigned decimals/i);
  });
});

describe("MockDaoClient", () => {
  it("returns clones so callers cannot mutate deterministic source fixtures", async () => {
    const client = createMockDaoClient({ latencyMs: 0 });
    const first = await client.getFeed();
    first.proposals[0].content.error = "mutated";

    const second = await client.getFeed();
    expect(second.proposals[0].content.error).toBeNull();
  });

  it("looks proposals up by composite identity, not numeric id alone", async () => {
    const client = createMockDaoClient({ latencyMs: 0 });
    const ref = DAO_MOCK_FEED.proposals[0].ref;

    await expect(client.getProposal(ref)).resolves.toMatchObject({
      state: "found",
      proposal: { ref: { proposalId: ref.proposalId } },
    });
    await expect(
      client.getProposal({ ...ref, chainId: 10 })
    ).resolves.toMatchObject({ state: "not_found" });
    await expect(
      client.getProposal({
        ...ref,
        votingAddress:
          "0x9999999999999999999999999999999999999999" as Address,
      })
    ).resolves.toMatchObject({ state: "not_found" });
  });

  it("derives post-veto participation through the account overlay", async () => {
    const client = createMockDaoClient({
      fixtureId: "post-vote-veto",
      latencyMs: 0,
    });
    const fixture = client.getFixture();

    const state = await client.getAccountProposalState(
      fixture.proposalRef,
      DAO_MOCK_ACCOUNT_ADDRESS
    );

    expect(state.capabilities).toMatchObject({
      canVote: true,
      votePurpose: "participation_only",
    });
  });

  it("keeps guarded and permissionless execution capability distinct", async () => {
    const guarded = createMockDaoClient({
      fixtureId: "guarded-execution",
      latencyMs: 0,
    });
    const guardedFixture = guarded.getFixture();
    const guardedState = await guarded.getAccountProposalState(
      guardedFixture.proposalRef,
      DAO_MOCK_ACCOUNT_ADDRESS
    );
    const guardedOperatorState = await guarded.getAccountProposalState(
      guardedFixture.proposalRef,
      guardedFixture.account.address
    );

    const permissionless = createMockDaoClient({
      fixtureId: "permissionless-execution",
      latencyMs: 0,
    });
    const permissionlessFixture = permissionless.getFixture();
    const permissionlessState = await permissionless.getAccountProposalState(
      permissionlessFixture.proposalRef,
      permissionlessFixture.account.address
    );

    expect(guardedState.capabilities.executeBlockedReason).toBe(
      DAO_BLOCKED_REASONS.guardedExecution
    );
    expect(guardedOperatorState.capabilities.canExecute).toBe(true);
    expect(permissionlessState.capabilities.canExecute).toBe(true);
  });

  it("reports shared proposal capacity from all six affected epochs", async () => {
    const client = createMockDaoClient({
      fixtureId: "proposal-capacity-full",
      latencyMs: 0,
    });

    const state = await client.getProposerState(DAO_MOCK_ACCOUNT_ADDRESS);

    expect(state.affectedBoostEpochs).toHaveLength(6);
    expect(state.affectedBoostEpochs.some((epoch) => epoch.currentProposalCount === 64)).toBe(
      true
    );
    expect(state.canPropose).toBe(false);
    expect(state.proposeBlockedReason).toBe(
      DAO_BLOCKED_REASONS.proposerCapacity
    );
    expect(deriveDaoProposerState(getDaoMockFixture("discussion").proposer).canPropose).toBe(
      true
    );
  });
});
