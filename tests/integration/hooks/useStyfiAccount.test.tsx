import { describe, it, expect } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/tests/test-utils";
import { useStyfiAccount, styfiKeys } from "@/lib/hooks/useStyfi";
import { useProtocol } from "@/state/protocol";
import { E2E_MOCK_ADDRESS } from "@/lib/test/constants";

describe("useStyfiAccount", () => {
  it("returns default mock state and updates after store mutation", async () => {
    const { result, queryClient } = renderHookWithProviders(() => {
      const account = useStyfiAccount();
      const { styfi } = useProtocol();
      return { account, styfi };
    });

    await waitFor(() => {
      expect(result.current.account.data?.styfiActive).toBe(0n);
    });

    result.current.styfi.debugSetBalance?.(
      E2E_MOCK_ADDRESS,
      "stYFI",
      10n * 10n ** 18n
    );
    await queryClient.invalidateQueries({
      queryKey: styfiKeys.account(E2E_MOCK_ADDRESS),
    });

    await waitFor(() => {
      expect(result.current.account.data?.styfiActive).toBe(10n * 10n ** 18n);
    });
  });
});
