import type { Address } from "viem";
import type { DaoClient } from "./client";
import {
  deriveDaoCapabilities,
  deriveDaoProposerState,
  serializeDaoProposalRef,
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
} from "./store";
import type {
  DaoAccountProposalState,
  DaoFeedV1,
  DaoMockFixture,
  DaoMockFixtureId,
  DaoProposal,
  DaoProposalLookup,
  DaoProposalRef,
  DaoProposerState,
} from "./types";

export type DaoMockFixtureCatalogEntry = {
  id: DaoMockFixtureId;
  label: string;
  proposalRef: DaoProposalRef;
};

export class MockDaoClient implements DaoClient {
  private readonly fixtureId: DaoMockFixtureId;
  private readonly latencyMs: number;

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
    const feed = createDaoMockFeed();
    const proposal = findProposal(feed, ref);
    if (!proposal) {
      throw new Error(`Unknown DAO proposal ${serializeDaoProposalRef(ref)}.`);
    }

    const fixture = getDaoMockFixture(this.fixtureId);
    const account = {
      ...structuredClone(fixture.account),
      address,
      isProposer:
        fixture.account.isProposer &&
        address.toLowerCase() === fixture.account.address.toLowerCase(),
      isOperator:
        fixture.account.isOperator &&
        address.toLowerCase() === fixture.account.address.toLowerCase(),
      isGuardian:
        fixture.account.isGuardian &&
        address.toLowerCase() === fixture.account.address.toLowerCase(),
    };
    const vetoEndsAt =
      proposal.ref.proposalId === fixture.proposalRef.proposalId
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

  async getProposerState(address: Address): Promise<DaoProposerState> {
    await this.waitForLatency();
    const fixture = getDaoMockFixture(this.fixtureId);
    return deriveDaoProposerState({
      ...structuredClone(fixture.proposer),
      address,
    });
  }

  private async waitForLatency(): Promise<void> {
    if (this.latencyMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
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
