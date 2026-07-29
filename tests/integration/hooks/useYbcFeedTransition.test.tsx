import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { useYbcState, ybcKeys } from "@/lib/hooks/useYbc";
import {
  YbcFeedSchema,
  type YbcFeed,
} from "@/lib/schemas/ybc-feed";

const { accountState, mainnetPublicClient } = vi.hoisted(() => ({
  accountState: {
    current: {
      address: "0x1111111111111111111111111111111111111111",
      chainId: 1,
      isConnected: true,
    },
  },
  mainnetPublicClient: {
    chain: { id: 1 },
    getChainId: vi.fn(),
    getBlock: vi.fn(),
    getBlockNumber: vi.fn(),
    readContract: vi.fn(),
  },
}));

vi.mock("wagmi", () => ({
  useAccount: () => accountState.current,
}));

vi.mock("@/state/protocol", () => ({
  useOptionalProtocol: () => ({
    mainnetPublicClient,
    publicClient: null,
    ybcUsesMockBackend: false,
  }),
}));

describe("useYbcState feed refresh trust", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountState.current = {
      address: "0x1111111111111111111111111111111111111111",
      chainId: 1,
      isConnected: true,
    };
    mainnetPublicClient.getChainId.mockResolvedValue(1);
    mainnetPublicClient.getBlock.mockResolvedValue({
      hash: feedExample.blockHash,
      timestamp: BigInt(Math.floor(Date.now() / 1_000)),
    });
    mainnetPublicClient.getBlockNumber.mockResolvedValue(
      BigInt(feedExample.blockNumber)
    );
    mainnetPublicClient.readContract.mockImplementation(
      async ({ functionName }: { functionName: string }) => {
        return ybcReadValue(functionName);
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retains data but pauses proposal actions after a failed refresh", async () => {
    const currentFeed = {
      ...feedExample,
      generatedAt: Math.floor(Date.now() / 1_000),
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse(currentFeed))
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
        })
    );
    const { result, unmount } = renderHook(() => useYbcState(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.backend).toBe("feed");
      expect(result.current.readStatus).toBe("current");
      expect(result.current.data?.proposals.items[0]?.actions.canVote).toBe(
        true
      );
    });
    const trustedFeed = result.current.feed;
    const trustedRoster = result.current.data?.roster;
    const trustedVotes = result.current.data?.proposals.items[0]?.votes;

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.readStatus).toBe("stale");
      expect(result.current.warning?.message).toMatch(/status 503/i);
    });
    expect(result.current.feed).toEqual(trustedFeed);
    expect(result.current.data?.roster).toEqual(trustedRoster);
    expect(result.current.data?.proposals.items[0]?.votes).toEqual(
      trustedVotes
    );
    expect(
      result.current.data?.proposals.items[0]?.actions.canVote
    ).toBe(false);

    unmount();
  });

  it("verifies a disconnected observer through the always-mainnet client", async () => {
    accountState.current = {
      address: undefined,
      chainId: undefined,
      isConnected: false,
    } as unknown as typeof accountState.current;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          ...feedExample,
          generatedAt: Math.floor(Date.now() / 1_000),
        })
      )
    );

    const { result } = renderHook(() => useYbcState(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.readStatus).toBe("current");
      expect(result.current.data?.hero.memberCount).toBe(1);
    });
    expect(
      mainnetPublicClient.readContract.mock.calls.some(
        ([parameters]) => parameters.functionName === "proposals"
      )
    ).toBe(true);
    expect(
      mainnetPublicClient.readContract.mock.calls.some(
        ([parameters]) => parameters.functionName === "members"
      )
    ).toBe(false);
  });

  it("keeps a wrong-chain wallet read-only while verifying mainnet data", async () => {
    accountState.current = {
      address: "0x1111111111111111111111111111111111111111",
      chainId: 10,
      isConnected: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          ...feedExample,
          generatedAt: Math.floor(Date.now() / 1_000),
        })
      )
    );

    const { result } = renderHook(() => useYbcState(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.readStatus).toBe("current");
      expect(result.current.data?.me.isMember).toBe(true);
    });
    expect(result.current.data?.me.canPropose).toBe(false);
    expect(result.current.data?.me.canVote).toBe(false);
    expect(
      result.current.data?.proposals.items[0]?.actions.canVote
    ).toBe(false);
  });

  it("keeps a verified same-key background refetch trusted without action flicker", async () => {
    const feed = createFeed();
    const pendingProposalCount = createDeferred<bigint>();
    let holdNextProposalCount = false;
    let proposalCountHeld = false;
    mainnetPublicClient.readContract.mockImplementation(
      ({
        functionName,
      }: {
        functionName: string;
        blockNumber?: bigint;
      }) => {
        if (
          holdNextProposalCount &&
          functionName === "num_proposals" &&
          !proposalCountHeld
        ) {
          proposalCountHeld = true;
          return pendingProposalCount.promise;
        }
        return Promise.resolve(ybcReadValue(functionName));
      }
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(feed)));
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useYbcState(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.readStatus).toBe("current");
      expect(result.current.data?.me.canPropose).toBe(true);
      expect(result.current.data?.proposals.items[0]?.actions.canVote).toBe(
        true
      );
    });

    holdNextProposalCount = true;
    act(() => {
      void queryClient.invalidateQueries({
        exact: true,
        queryKey: ybcKeys.canonicalSnapshot(feed),
      });
    });

    await waitFor(() => {
      expect(proposalCountHeld).toBe(true);
      expect(result.current.isRefreshing).toBe(true);
    });
    expect(result.current.readStatus).toBe("current");
    expect(result.current.data?.me.canPropose).toBe(true);
    expect(
      result.current.data?.proposals.items[0]?.actions.canVote
    ).toBe(true);

    pendingProposalCount.resolve(1n);
    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.readStatus).toBe("current");
    });
  });

  it("fails cached A authority closed during an A to B to A revalidation", async () => {
    const feedA = createFeed();
    const feedB = createFeed({
      blockHash:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      blockNumber: feedA.blockNumber + 1,
    });
    const pendingProposalCount = createDeferred<bigint>();
    let holdARevalidation = false;
    let aRevalidationHeld = false;
    mainnetPublicClient.getBlock.mockImplementation(
      async ({ blockNumber }: { blockNumber: bigint }) => ({
        hash:
          blockNumber === BigInt(feedB.blockNumber)
            ? feedB.blockHash
            : feedA.blockHash,
        timestamp: BigInt(Math.floor(Date.now() / 1_000)),
      })
    );
    mainnetPublicClient.getBlockNumber.mockResolvedValue(
      BigInt(feedB.blockNumber)
    );
    mainnetPublicClient.readContract.mockImplementation(
      ({
        functionName,
        blockNumber,
      }: {
        functionName: string;
        blockNumber?: bigint;
      }) => {
        if (
          holdARevalidation &&
          functionName === "num_proposals" &&
          blockNumber === BigInt(feedA.blockNumber) &&
          !aRevalidationHeld
        ) {
          aRevalidationHeld = true;
          return pendingProposalCount.promise;
        }
        return Promise.resolve(ybcReadValue(functionName));
      }
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(feedA)));
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useYbcState(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.feed?.blockHash).toBe(feedA.blockHash);
      expect(result.current.readStatus).toBe("current");
      expect(result.current.data?.proposals.items[0]?.actions.canVote).toBe(
        true
      );
    });

    act(() => {
      queryClient.setQueryData(ybcKeys.feed(), feedB);
    });
    await waitFor(() => {
      expect(result.current.feed?.blockHash).toBe(feedB.blockHash);
      expect(result.current.readStatus).toBe("current");
      expect(result.current.data?.proposals.items[0]?.actions.canVote).toBe(
        true
      );
    });

    holdARevalidation = true;
    await act(async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: ybcKeys.canonicalSnapshot(feedA),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          exact: true,
          queryKey: ybcKeys.walletOverlay(
            accountState.current.address,
            feedA
          ),
          refetchType: "none",
        }),
      ]);
      queryClient.setQueryData(ybcKeys.feed(), feedA);
    });

    await waitFor(() => {
      expect(aRevalidationHeld).toBe(true);
      expect(result.current.feed?.blockHash).toBe(feedA.blockHash);
      expect(result.current.readStatus).toBe("stale");
    });
    expect(result.current.data?.me.canPropose).toBe(false);
    expect(result.current.data?.me.canVote).toBe(false);
    expect(
      result.current.data?.proposals.items[0]?.actions
    ).toMatchObject({
      canExecute: false,
      canRetract: false,
      canVote: false,
      nextAction: "none",
    });
    expect(result.current.createProposal).toBeUndefined();
    expect(result.current.executeProposal).toBeUndefined();
    expect(result.current.voteOnProposal).toBeUndefined();

    pendingProposalCount.resolve(1n);
    await waitFor(() => {
      expect(result.current.readStatus).toBe("current");
      expect(result.current.data?.me.canPropose).toBe(true);
      expect(result.current.data?.proposals.items[0]?.actions.canVote).toBe(
        true
      );
    });
  });
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createQueryWrapper(queryClient = createQueryClient()) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function okResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createFeed({
  blockHash = feedExample.blockHash,
  blockNumber = feedExample.blockNumber,
}: {
  blockHash?: string;
  blockNumber?: number;
} = {}): YbcFeed {
  return YbcFeedSchema.parse({
    ...feedExample,
    blockHash,
    blockNumber,
    generatedAt: Math.floor(Date.now() / 1_000),
    events: {
      ...feedExample.events,
      lastIndexedBlock: blockNumber,
    },
  });
}

function ybcReadValue(functionName: string) {
  switch (functionName) {
    case "num_proposals":
      return 1n;
    case "addition_threshold":
      return BigInt(feedExample.config.additionThresholdBps);
    case "expulsion_threshold":
      return BigInt(feedExample.config.expulsionThresholdBps);
    case "proposals":
      return canonicalProposal(feedExample.proposals[0]!);
    case "members":
      return true;
    case "operators":
      return false;
    case "staked":
      return 100n;
    case "weight":
      return 50n;
    case "status":
      return 4n;
    case "voted":
      return false;
    default:
      return null;
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function canonicalProposal(
  proposal: (typeof feedExample.proposals)[number]
) {
  return [
    proposal.account,
    proposal.proposer,
    BigInt(proposal.epoch),
    proposal.addition,
    BigInt(proposal.thresholdBps),
    BigInt(proposal.votes),
    BigInt(proposal.yea),
    proposal.retracted,
    proposal.executed,
  ] as const;
}
