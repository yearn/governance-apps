import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { yethKeys } from "@/lib/hooks/useYeth";
import {
  useYethAccountState,
  useYethClaimAndExit,
  useYethClaimAndStay,
  useYethRedeemToEth,
} from "@/lib/hooks/useYeth";
import { renderHookWithProviders } from "@/tests/test-utils";

describe("yETH write hooks", () => {
  it("claim-and-exit invalidates yETH queries and clears claimable balance", async () => {
    const { result, queryClient } = renderHookWithProviders(() => {
      const account = useYethAccountState();
      const claimExit = useYethClaimAndExit();
      return { account, claimExit };
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await waitFor(() => {
      expect(result.current.account.data?.claimableNowEth).toBeGreaterThan(0n);
    });

    await act(async () => {
      await result.current.claimExit.write();
    });

    await waitFor(() => {
      expect(result.current.account.data?.claimableNowEth).toBe(0n);
      expect(result.current.account.data?.snapshotLossEth).toBe(0n);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: yethKeys.global() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: yethKeys.account(E2E_MOCK_ADDRESS),
    });
  });

  it("claim-and-stay then redeem invalidates queries and updates share state", async () => {
    const { result, queryClient } = renderHookWithProviders(() => {
      const account = useYethAccountState();
      const claimStay = useYethClaimAndStay();
      const redeem = useYethRedeemToEth();
      return { account, claimStay, redeem };
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await waitFor(() => {
      expect(result.current.account.data?.claimableNowEth).toBeGreaterThan(0n);
      expect(result.current.account.data?.recoveryVaultShares).toBe(0n);
    });

    await act(async () => {
      await result.current.claimStay.write();
    });

    await waitFor(() => {
      expect(result.current.account.data?.claimableNowEth).toBe(0n);
      expect(result.current.account.data?.recoveryVaultShares).toBeGreaterThan(0n);
    });

    await act(async () => {
      await result.current.redeem.write();
    });

    await waitFor(() => {
      expect(result.current.account.data?.recoveryVaultShares).toBe(0n);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: yethKeys.global() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: yethKeys.account(E2E_MOCK_ADDRESS),
    });
    expect(invalidateSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});
