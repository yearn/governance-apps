import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "viem";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import {
  mapTeamsFeedToPageData,
  OnchainTeamsClient,
} from "@/lib/clients/teams";
import { useTeamsWrites } from "@/lib/hooks/useTeamsWrites";
import type { PreparedTransaction } from "@/lib/tx/types";
import { TeamsFeedSchema } from "@/lib/schemas/teams-feed";
import { renderHookWithProviders } from "@/tests/test-utils";

const txHarness = vi.hoisted(() => ({
  execute: vi.fn(),
  prepared: [] as PreparedTransaction[],
  state: {
    status: "idle" as const,
  },
}));

vi.mock("@/lib/tx/useTx", () => ({
  useTx: () => ({
    execute: txHarness.execute,
    state: txHarness.state,
  }),
}));

const RECIPIENT = "0x9999999999999999999999999999999999999999";
const MUTATED_TEAM = "0x8888888888888888888888888888888888888888";
const HASH =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

describe("useTeamsWrites preparation boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    txHarness.prepared.length = 0;
    txHarness.execute.mockReset();
    txHarness.execute.mockImplementation(
      async (prepared: PreparedTransaction) => {
        txHarness.prepared.push(prepared);
      }
    );
  });

  it("defers preparation to useTx and snapshots click-time destinations", async () => {
    const feed = TeamsFeedSchema.parse(feedExample);
    const data = mapTeamsFeedToPageData(feed);
    const sourceTeam = data.teams[0]!;
    const requestedTeam = { ...sourceTeam };
    const approval = {
      ...sourceTeam.fundingApprovals[0]!,
      claimableRaw: "999999999999999999",
      decimals: 18,
      returnableRaw: "1",
    };
    const revenueOption = {
      ...sourceTeam.revenueOptions[0]!,
      decimals: 18,
    };
    const submitDeposit = vi.fn().mockResolvedValue(HASH);
    const submitRevenueApproval = vi.fn().mockResolvedValue(HASH);
    const submitReturnApproval = vi.fn().mockResolvedValue(HASH);
    const submitClaim = vi.fn().mockResolvedValue(HASH);
    const submitReturn = vi.fn().mockResolvedValue(HASH);
    const submitBonus = vi.fn().mockResolvedValue(HASH);
    const depositPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareRevenueDeposit")
      .mockResolvedValue(submitDeposit);
    const revenueApprovalPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareRevenueApproval")
      .mockResolvedValue(submitRevenueApproval);
    const returnApprovalPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareFundingReturnApproval")
      .mockResolvedValue(submitReturnApproval);
    const claimPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareFundingClaim")
      .mockResolvedValue(submitClaim);
    const returnPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareFundingReturn")
      .mockResolvedValue(submitReturn);
    const bonusPrepare = vi
      .spyOn(OnchainTeamsClient.prototype, "prepareBonusClaim")
      .mockResolvedValue(submitBonus);
    const { result } = renderHookWithProviders(() => useTeamsWrites(feed));

    await act(async () => {
      await Promise.all([
        result.current.approveRevenueDeposit(
          requestedTeam,
          revenueOption.tokenAddress,
          "0.000001"
        ),
        result.current.approveFundingReturn(
          requestedTeam,
          approval,
          "0.000001"
        ),
        result.current.depositRevenue(
          requestedTeam,
          revenueOption.tokenAddress,
          "0.000001",
          revenueOption.decimals
        ),
        result.current.claimFunding(
          requestedTeam,
          approval,
          "0.000001",
          RECIPIENT
        ),
        result.current.returnFunding(
          requestedTeam,
          approval,
          "0.000001"
        ),
        result.current.claimBonus(requestedTeam, RECIPIENT),
      ]);
    });

    expect(txHarness.prepared).toHaveLength(6);
    expect(revenueApprovalPrepare).not.toHaveBeenCalled();
    expect(returnApprovalPrepare).not.toHaveBeenCalled();
    expect(depositPrepare).not.toHaveBeenCalled();
    expect(claimPrepare).not.toHaveBeenCalled();
    expect(returnPrepare).not.toHaveBeenCalled();
    expect(bonusPrepare).not.toHaveBeenCalled();

    const requestedTeamAddress = requestedTeam.address as Address;
    requestedTeam.address = MUTATED_TEAM;
    for (const prepared of txHarness.prepared) {
      await prepared();
    }

    expect(depositPrepare).toHaveBeenCalledWith(
      requestedTeamAddress,
      revenueOption.tokenAddress,
      1n
    );
    expect(revenueApprovalPrepare).toHaveBeenCalledWith(
      requestedTeamAddress,
      revenueOption.tokenAddress,
      1n
    );
    expect(returnApprovalPrepare).toHaveBeenCalledWith(
      requestedTeamAddress,
      BigInt(approval.idx),
      1n
    );
    expect(claimPrepare).toHaveBeenCalledWith(
      requestedTeamAddress,
      BigInt(approval.idx),
      1n,
      RECIPIENT
    );
    expect(returnPrepare).toHaveBeenCalledWith(
      requestedTeamAddress,
      BigInt(approval.idx),
      1n
    );
    expect(bonusPrepare).toHaveBeenCalledWith(
      requestedTeamAddress,
      RECIPIENT
    );
    expect(submitDeposit).toHaveBeenCalledTimes(1);
    expect(submitRevenueApproval).toHaveBeenCalledTimes(1);
    expect(submitReturnApproval).toHaveBeenCalledTimes(1);
    expect(submitClaim).toHaveBeenCalledTimes(1);
    expect(submitReturn).toHaveBeenCalledTimes(1);
    expect(submitBonus).toHaveBeenCalledTimes(1);
  });
});
