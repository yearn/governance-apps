import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { YbcFeedSchema } from "@/lib/schemas/ybc-feed";
import { useYbcProposalWrites } from "@/lib/hooks/useYbcProposalWrites";
import { renderWithProviders } from "@/tests/test-utils";

const writeRuntime = vi.hoisted(() => ({
  blockTimestamp: 0n,
  getAccount: vi.fn(),
  getBlock: vi.fn(),
  getBlockNumber: vi.fn(),
  getChainId: vi.fn(),
  getPublicClient: vi.fn(),
  readContract: vi.fn(),
}));

vi.mock("wagmi/actions", () => ({
  getAccount: writeRuntime.getAccount,
  getPublicClient: writeRuntime.getPublicClient,
  waitForTransactionReceipt: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
  },
}));

describe("useYbcProposalWrites preparation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeRuntime.getAccount.mockReturnValue({
      address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      chainId: 1,
    });
    writeRuntime.getBlock.mockImplementation(
      async ({ blockNumber }: { blockNumber: bigint }) => ({
        hash: feedExample.blockHash,
        number: blockNumber,
        timestamp: writeRuntime.blockTimestamp,
      })
    );
    writeRuntime.getBlockNumber.mockResolvedValue(
      BigInt(feedExample.blockNumber)
    );
    writeRuntime.getChainId.mockResolvedValue(1);
    writeRuntime.readContract.mockImplementation(
      async ({ functionName }: { functionName: string }) => {
        const proposal = feedExample.proposals[0]!;
        switch (functionName) {
          case "num_proposals":
            return 1n;
          case "proposals":
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
          case "status":
            return 2n;
          default:
            return null;
        }
      }
    );
    writeRuntime.getPublicClient.mockReturnValue({
      chain: { id: 1 },
      getChainId: writeRuntime.getChainId,
      getBlock: writeRuntime.getBlock,
      getBlockNumber: writeRuntime.getBlockNumber,
      readContract: writeRuntime.readContract,
    });
  });

  it("shows a live proposal-state error without an unhandled rejection", async () => {
    const nowSeconds = Math.floor(Date.now() / 1_000);
    writeRuntime.blockTimestamp = BigInt(nowSeconds - 86_400);
    const feed = createFeed(nowSeconds);

    renderWithProviders(
      <ProposalWriteHarness action="vote" feed={feed} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit action" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no longer ready for voting/i
    );
  });

  it("shows invalid targets through transaction state without an unhandled rejection", async () => {
    const feed = createFeed(Math.floor(Date.now() / 1_000));

    renderWithProviders(
      <ProposalWriteHarness action="invalid-target" feed={feed} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit action" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /enter a valid target address/i
    );
  });
});

function ProposalWriteHarness({
  action,
  feed,
}: {
  action: "invalid-target" | "vote";
  feed: YbcFeed;
}) {
  const writes = useYbcProposalWrites(feed);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (action === "invalid-target") {
            void writes.createProposal("addition", "not-an-address");
          } else {
            void writes.voteOnProposal("YBC-0", "yea");
          }
        }}
      >
        Submit action
      </button>
      {writes.state.status === "error" ? (
        <p role="alert">{writes.state.errorMessage}</p>
      ) : null}
    </div>
  );
}

function createFeed(generatedAt: number): YbcFeed {
  return YbcFeedSchema.parse({
    ...feedExample,
    generatedAt,
  });
}
