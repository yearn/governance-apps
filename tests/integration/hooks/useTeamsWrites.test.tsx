import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import {
  mapTeamsFeedToPageData,
  OnchainTeamsClient,
} from "@/lib/clients/teams";
import { useTeamsWrites } from "@/lib/hooks/useTeamsWrites";
import { TeamsFeedSchema } from "@/lib/schemas/teams-feed";
import { renderHookWithProviders } from "@/tests/test-utils";

vi.mock("@/components/ui/Toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "teams-write-toast"),
    success: vi.fn(),
  },
}));

const RECIPIENT = "0x9999999999999999999999999999999999999999";

describe("useTeamsWrites transaction failures", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes preparation and validation failures through transaction state without rejecting", async () => {
    const feed = TeamsFeedSchema.parse(feedExample);
    const data = mapTeamsFeedToPageData(feed);
    const team = data.teams[0]!;
    const approval = {
      ...team.fundingApprovals[0]!,
      returnableRaw: "1",
    };
    const revenueOption = team.revenueOptions[0]!;
    const revenueApprovalPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareRevenueApproval")
      .mockRejectedValue(new Error("revenue approval preparation failed"));
    const returnApprovalPrepare = vi
      .spyOn(
        OnchainTeamsClient.prototype,
        "prepareFundingReturnApproval"
      )
      .mockRejectedValue(new Error("return approval preparation failed"));
    const depositPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareRevenueDeposit")
      .mockRejectedValue(new Error("deposit preparation failed"));
    const claimPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareFundingClaim")
      .mockRejectedValue(new Error("claim preparation failed"));
    const returnPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareFundingReturn")
      .mockRejectedValue(new Error("return preparation failed"));
    const bonusPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareBonusClaim")
      .mockRejectedValue(new Error("bonus preparation failed"));
    const unhandledRejection = vi.fn();
    window.addEventListener("unhandledrejection", unhandledRejection);
    const { result } = renderHookWithProviders(() => useTeamsWrites(feed));

    try {
      for (const request of [
        () =>
          result.current.approveRevenueDeposit(
            team,
            revenueOption.tokenAddress,
            "0.000001"
          ),
        () =>
          result.current.approveFundingReturn(
            team,
            approval,
            "0.000001"
          ),
        () =>
          result.current.depositRevenue(
            team,
            revenueOption.tokenAddress,
            "0.000001",
            revenueOption.decimals
          ),
        () =>
          result.current.claimFunding(
            team,
            approval,
            "0.000001",
            RECIPIENT
          ),
        () => result.current.returnFunding(team, approval, "0.000001"),
        () => result.current.claimBonus(team, RECIPIENT),
      ]) {
        let submitted: boolean | undefined;
        await act(async () => {
          submitted = await request();
        });

        expect(submitted).toBe(false);
        await waitFor(() => {
          expect(result.current.state.status).toBe("error");
        });
      }

      expect(revenueApprovalPrepare).toHaveBeenCalledTimes(1);
      expect(returnApprovalPrepare).toHaveBeenCalledTimes(1);
      expect(depositPrepare).toHaveBeenCalledTimes(1);
      expect(claimPrepare).toHaveBeenCalledTimes(1);
      expect(returnPrepare).toHaveBeenCalledTimes(1);
      expect(bonusPrepare).toHaveBeenCalledTimes(1);

      for (const invalidRequest of [
        () =>
          result.current.approveRevenueDeposit(
            team,
            revenueOption.tokenAddress,
            "not-an-amount"
          ),
        () =>
          result.current.approveFundingReturn(
            team,
            approval,
            "not-an-amount"
          ),
        () =>
          result.current.depositRevenue(
            team,
            revenueOption.tokenAddress,
            "not-an-amount",
            revenueOption.decimals
          ),
      ]) {
        let invalidSubmitted: boolean | undefined;
        await act(async () => {
          invalidSubmitted = await invalidRequest();
        });
        expect(invalidSubmitted).toBe(false);
        await waitFor(() => {
          expect(result.current.state).toMatchObject({
            status: "error",
            errorMessage: "Enter a valid Teams amount.",
          });
        });
      }
      expect(revenueApprovalPrepare).toHaveBeenCalledTimes(1);
      expect(returnApprovalPrepare).toHaveBeenCalledTimes(1);
      expect(depositPrepare).toHaveBeenCalledTimes(1);

      await act(async () => {
        await Promise.resolve();
      });
      expect(unhandledRejection).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("unhandledrejection", unhandledRejection);
    }
  });
});
