import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/Toast";
import {
  applyDaoMockFixture,
  DAO_MOCK_ACCOUNT_ADDRESS,
  DAO_MOCK_NOW,
  getDaoMockSnapshot,
  resetDaoMockStore,
  setDaoMockRole,
  setDaoMockTransactionOutcome,
} from "@/lib/clients/dao";
import { daoKeys } from "@/lib/hooks/daoKeys";
import { useDaoProposalActions } from "@/lib/hooks/useDao";
import { renderHookWithProviders } from "@/tests/test-utils";

vi.mock("@/components/ui/Toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "dao-action-toast"),
    success: vi.fn(),
  },
}));

describe("useDaoProposalActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDaoMockStore({ now: DAO_MOCK_NOW });
  });

  it("prepares inside useTx, invalidates DAO reads, and uses production copy", async () => {
    const proposal = selectedProposal();
    const { result, queryClient } = renderHookWithProviders(() =>
      useDaoProposalActions(proposal.ref, DAO_MOCK_ACCOUNT_ADDRESS, {
        submittedMessage: "Transaction submitted.",
      })
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.vote("nay");
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });
    expect(result.current.activeAction).toBe("vote");
    expect(getDaoMockSnapshot().pendingAction).toMatchObject({
      action: "vote",
      direction: "nay",
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: daoKeys.all,
      refetchType: "all",
    });
    expect(toast.success).toHaveBeenCalledWith("Transaction submitted.", {
      id: "dao-action-toast",
    });
    expect(toast.success).not.toHaveBeenCalledWith(
      expect.stringContaining("Mock"),
      expect.anything()
    );
  });

  it("maps a mock revert into shared transaction failure without mutating state", async () => {
    const proposal = selectedProposal();
    setDaoMockTransactionOutcome("revert");
    const { result } = renderHookWithProviders(() =>
      useDaoProposalActions(proposal.ref, DAO_MOCK_ACCOUNT_ADDRESS, {
        submittedMessage: "Transaction submitted.",
      })
    );

    await act(async () => {
      await result.current.vote("yea");
    });

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: "error",
        errorType: "revert",
        errorMessage: "Transaction reverted.",
      });
    });
    expect(getDaoMockSnapshot().pendingAction).toBeNull();
    expect(getDaoMockSnapshot().account.hasVoted).toBe(false);
  });

  it.each([
    ["retract", "discussion", null],
    ["flag", "discussion", "operator"],
    ["veto", "discussion", "guardian"],
    ["execute", "permissionless-execution", null],
  ] as const)(
    "routes %s preparation through the shared transaction state",
    async (action, fixture, role) => {
      applyDaoMockFixture(fixture);
      if (role) setDaoMockRole(role, true);
      const proposal = selectedProposal();
      const actor = getDaoMockSnapshot().account.address;
      const { result } = renderHookWithProviders(() =>
        useDaoProposalActions(proposal.ref, actor, {
          submittedMessage: "Transaction submitted.",
        })
      );

      await act(async () => {
        if (action === "retract") await result.current.retract();
        if (action === "flag") await result.current.flag("Malformed content");
        if (action === "veto") await result.current.veto("Guardian safeguard");
        if (action === "execute") await result.current.executeProposal();
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("success");
      });
      expect(result.current.activeAction).toBe(action);
      expect(getDaoMockSnapshot().pendingAction).toMatchObject({ action });
    }
  );
});

function selectedProposal() {
  const runtime = getDaoMockSnapshot();
  const proposal = runtime.feed.proposals.find(
    (candidate) => candidate.ref.proposalId === runtime.selectedProposalId
  );
  if (!proposal) throw new Error("Selected DAO proposal is unavailable.");
  return proposal;
}
