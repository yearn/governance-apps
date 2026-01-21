import { describe, it, expect, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/tests/test-utils";
import { useTx } from "@/lib/tx/useTx";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { E2E_MOCK_ADDRESS } from "@/lib/test/constants";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { TransactionHash } from "@/lib/tx/types";

vi.mock("wagmi/actions", () => ({
  waitForTransactionReceipt: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("useTx", () => {
  it("transitions through mining and invalidates queries", async () => {
    const { result, queryClient } = renderHookWithProviders(() => useTx());
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const prepared = vi
      .fn()
      .mockResolvedValue(
        "0x0000000000000000000000000000000000000000000000000000000000000001" as TransactionHash
      );

    let resolveReceipt: () => void;
    const receiptPromise = new Promise((resolve) => {
      resolveReceipt = resolve;
    });
    const mockedWait = vi.mocked(waitForTransactionReceipt);
    mockedWait.mockReturnValueOnce(receiptPromise as never);

    expect(result.current.state.status).toBe("idle");

    const execPromise = result.current.execute(prepared, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: styfiKeys.account(E2E_MOCK_ADDRESS),
        });
      },
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("mining");
    });

    resolveReceipt!();
    await execPromise;

    expect(result.current.state.status).toBe("success");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: styfiKeys.account(E2E_MOCK_ADDRESS),
    });
  });
});
