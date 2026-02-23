import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { useIdentity } from "@/state/identity";
import { useProtocol } from "@/state/protocol";
import { renderHookWithProviders } from "@/tests/test-utils";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { styfiKeys, useStyfiAccount } from "@/lib/hooks/useStyfi";

describe("identity account dedupe", () => {
  it("shares one stYFI account refetch across identity and account consumers", async () => {
    const { result, queryClient } = renderHookWithProviders(() => ({
      identity: useIdentity(),
      account: useStyfiAccount(),
      protocol: useProtocol(),
    }));

    await waitFor(() => {
      expect(result.current.account.data?.address).toBe(E2E_MOCK_ADDRESS);
      expect(result.current.identity.address).toBe(E2E_MOCK_ADDRESS);
    });

    const spy = vi.spyOn(result.current.protocol.styfi, "getAccountState");

    await queryClient.invalidateQueries({
      queryKey: styfiKeys.account(E2E_MOCK_ADDRESS),
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.current.identity.yfiBalance).toBe(
        result.current.account.data?.yfiBalance ?? 0n
      );
    });
  });
});
