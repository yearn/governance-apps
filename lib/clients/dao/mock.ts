import { keccak256, stringToHex, type Address } from "viem";
import type { PreparedTransaction, TransactionHash } from "@/lib/tx/types";
import type { DaoClient } from "./client";
import {
  deriveDaoCapabilities,
  deriveDaoProposerState,
  serializeDaoProposalRef,
  validateDaoModerationReason,
} from "./domain";
import {
  createDaoMockFeed,
  DAO_MOCK_FIXTURE_IDS,
  getDaoMockFixture,
} from "./fixtures";
import {
  readDaoMockAccountProposalState,
  readDaoMockFeed,
  readDaoMockProposal,
  readDaoMockProposerState,
  prepareDaoMockExecute,
  prepareDaoMockFlag,
  prepareDaoMockRetract,
  prepareDaoMockVeto,
  prepareDaoMockVote,
} from "./store";
import type {
  DaoAccountProposalState,
  DaoActionType,
  DaoFeedV1,
  DaoMockFixture,
  DaoMockFixtureId,
  DaoProposal,
  DaoProposalLookup,
  DaoProposalRef,
  DaoProposerState,
  DaoVoteDirection,
} from "./types";

export type DaoMockFixtureCatalogEntry = {
  id: DaoMockFixtureId;
  label: string;
  proposalRef: DaoProposalRef;
};

export class MockDaoClient implements DaoClient {
  private readonly fixtureId: DaoMockFixtureId;
  private readonly latencyMs: number;
  private nextTransactionNonce = 0n;

  constructor(
    options: { fixtureId?: DaoMockFixtureId; latencyMs?: number } = {}
  ) {
    this.fixtureId = options.fixtureId ?? "voting";
    this.latencyMs = options.latencyMs ?? 250;
  }

  listFixtureCatalog(): DaoMockFixtureCatalogEntry[] {
    return DAO_MOCK_FIXTURE_IDS.map((id) => {
      const fixture = getDaoMockFixture(id);
      return {
        id,
        label: fixture.label,
        proposalRef: { ...fixture.proposalRef },
      };
    });
  }

  getFixture(): DaoMockFixture {
    return structuredClone(getDaoMockFixture(this.fixtureId));
  }

  async getFeed(): Promise<DaoFeedV1> {
    await this.waitForLatency();
    return createDaoMockFeed();
  }

  async getProposal(ref: DaoProposalRef): Promise<DaoProposalLookup> {
    await this.waitForLatency();
    const proposal = findProposal(createDaoMockFeed(), ref);
    if (proposal) return { state: "found", proposal };
    return {
      state: "not_found",
      ref: { ...ref },
      protocolStatus: "invalid",
      displayStatus: "not_found",
    };
  }

  async getAccountProposalState(
    ref: DaoProposalRef,
    address: Address
  ): Promise<DaoAccountProposalState> {
    await this.waitForLatency();
    return createImmutableAccountProposalState(this.fixtureId, ref, address);
  }

  async getProposerState(address: Address): Promise<DaoProposerState> {
    await this.waitForLatency();
    const fixture = getDaoMockFixture(this.fixtureId);
    return deriveDaoProposerState({
      ...structuredClone(fixture.proposer),
      address,
    });
  }

  async prepareVote(
    ref: DaoProposalRef,
    address: Address,
    direction: DaoVoteDirection
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return this.prepareAction("vote", ref, address, direction, null);
  }

  async prepareRetract(
    ref: DaoProposalRef,
    address: Address
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return this.prepareAction("retract", ref, address, null, null);
  }

  async prepareFlag(
    ref: DaoProposalRef,
    address: Address,
    reason: string
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    const checkedReason = assertImmutableModerationReason("flag", reason);
    return this.prepareAction("flag", ref, address, null, checkedReason);
  }

  async prepareVeto(
    ref: DaoProposalRef,
    address: Address,
    reason: string
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    const checkedReason = assertImmutableModerationReason("veto", reason);
    return this.prepareAction("veto", ref, address, null, checkedReason);
  }

  async prepareExecute(
    ref: DaoProposalRef,
    address: Address
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return this.prepareAction("execute", ref, address, null, null);
  }

  private prepareAction(
    action: DaoActionType,
    ref: DaoProposalRef,
    address: Address,
    direction: DaoVoteDirection | null,
    reason: string | null
  ): PreparedTransaction {
    const snapshot = createImmutableAccountProposalState(
      this.fixtureId,
      ref,
      address
    );
    assertImmutableActionAllowed(action, snapshot);
    const capturedRef = structuredClone(ref);
    return async () => {
      assertImmutableActionAllowed(action, snapshot);
      const checkedReason = assertImmutableModerationReason(action, reason);
      const nonce = this.nextTransactionNonce;
      const transactionHash = createImmutableTransactionHash(
        action,
        capturedRef,
        address,
        nonce,
        direction,
        checkedReason
      );
      this.nextTransactionNonce += 1n;
      return transactionHash;
    };
  }

  private async waitForLatency(): Promise<void> {
    if (this.latencyMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}

function createImmutableAccountProposalState(
  fixtureId: DaoMockFixtureId,
  ref: DaoProposalRef,
  address: Address
): DaoAccountProposalState {
  const proposal = findProposal(createDaoMockFeed(), ref);
  if (!proposal) {
    throw new Error(`Unknown DAO proposal ${serializeDaoProposalRef(ref)}.`);
  }

  const fixture = getDaoMockFixture(fixtureId);
  const sameFixtureActor =
    address.toLowerCase() === fixture.account.address.toLowerCase();
  const account = {
    ...structuredClone(fixture.account),
    address,
    hasVoted: sameFixtureActor && fixture.account.hasVoted,
    voteDirection:
      sameFixtureActor && fixture.account.hasVoted
        ? fixture.account.voteDirection
        : null,
    isProposer: fixture.account.isProposer && sameFixtureActor,
    isOperator: fixture.account.isOperator && sameFixtureActor,
    isGuardian: fixture.account.isGuardian && sameFixtureActor,
  };
  const vetoEndsAt =
    serializeDaoProposalRef(proposal.ref) ===
    serializeDaoProposalRef(fixture.proposalRef)
      ? fixture.vetoEndsAt
      : proposal.executionEndsAt ?? proposal.voteEndsAt + 14 * 86_400;

  return {
    ...account,
    capabilities: deriveDaoCapabilities({
      proposal,
      account,
      now: fixture.now,
      vetoEndsAt,
      executionGuard: fixture.executionGuard,
    }),
  };
}

function assertImmutableActionAllowed(
  action: DaoActionType,
  account: DaoAccountProposalState
) {
  const capability: readonly [boolean, string | null] =
    action === "vote"
      ? [account.capabilities.canVote, account.capabilities.voteBlockedReason]
      : action === "retract"
        ? [
            account.capabilities.canRetract,
            account.capabilities.retractBlockedReason,
          ]
        : action === "flag"
          ? [account.capabilities.canFlag, account.capabilities.flagBlockedReason]
          : action === "veto"
            ? [account.capabilities.canVeto, account.capabilities.vetoBlockedReason]
            : [
                account.capabilities.canExecute,
                account.capabilities.executeBlockedReason,
              ];
  if (!capability[0]) {
    throw new Error(capability[1] ?? "This proposal action is unavailable.");
  }
}

function assertImmutableModerationReason(
  action: DaoActionType,
  reason: string | null
): string | null {
  if (action !== "flag" && action !== "veto") return null;
  const checked = validateDaoModerationReason(reason ?? "");
  if (checked.error) throw new Error(checked.error);
  return checked.value;
}

function createImmutableTransactionHash(
  action: DaoActionType,
  ref: DaoProposalRef,
  address: Address,
  nonce: bigint,
  direction: DaoVoteDirection | null,
  reason: string | null
): TransactionHash {
  return keccak256(
    stringToHex(
      [
        serializeDaoProposalRef(ref),
        address.toLowerCase(),
        action,
        direction ?? "",
        reason ?? "",
        nonce.toString(),
      ].join("|")
    )
  ) as TransactionHash;
}

export function createMockDaoClient(options?: {
  fixtureId?: DaoMockFixtureId;
  latencyMs?: number;
}): MockDaoClient {
  return new MockDaoClient(options);
}

/**
 * Route-facing adapter. The instance is safe to cache because every read pulls
 * from the mutable DAO runtime store instead of snapshotting a fixture.
 */
export class RuntimeMockDaoClient implements DaoClient {
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 250;
  }

  async getFeed(): Promise<DaoFeedV1> {
    await this.waitForLatency();
    return readDaoMockFeed();
  }

  async getProposal(ref: DaoProposalRef): Promise<DaoProposalLookup> {
    await this.waitForLatency();
    return readDaoMockProposal(ref);
  }

  async getAccountProposalState(
    ref: DaoProposalRef,
    address: Address
  ): Promise<DaoAccountProposalState> {
    await this.waitForLatency();
    return readDaoMockAccountProposalState(ref, address);
  }

  async getProposerState(address: Address): Promise<DaoProposerState> {
    await this.waitForLatency();
    return readDaoMockProposerState(address);
  }

  async prepareVote(
    ref: DaoProposalRef,
    address: Address,
    direction: DaoVoteDirection
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return prepareDaoMockVote(ref, address, direction);
  }

  async prepareRetract(
    ref: DaoProposalRef,
    address: Address
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return prepareDaoMockRetract(ref, address);
  }

  async prepareFlag(
    ref: DaoProposalRef,
    address: Address,
    reason: string
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return prepareDaoMockFlag(ref, address, reason);
  }

  async prepareVeto(
    ref: DaoProposalRef,
    address: Address,
    reason: string
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return prepareDaoMockVeto(ref, address, reason);
  }

  async prepareExecute(
    ref: DaoProposalRef,
    address: Address
  ): Promise<PreparedTransaction> {
    await this.waitForLatency();
    return prepareDaoMockExecute(ref, address);
  }

  private async waitForLatency(): Promise<void> {
    if (this.latencyMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}

export function createRuntimeMockDaoClient(options?: {
  latencyMs?: number;
}): RuntimeMockDaoClient {
  return new RuntimeMockDaoClient(options);
}

function findProposal(feed: DaoFeedV1, ref: DaoProposalRef): DaoProposal | null {
  const key = serializeDaoProposalRef(ref);
  return (
    feed.proposals.find(
      (proposal) => serializeDaoProposalRef(proposal.ref) === key
    ) ?? null
  );
}
