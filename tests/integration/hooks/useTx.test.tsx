import { beforeEach, describe, it, expect, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/tests/test-utils";
import { useTx } from "@/lib/tx/useTx";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { TransactionHash } from "@/lib/tx/types";
import { toast } from "@/components/ui/Toast";

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions through mining and invalidates queries", async () => {
    const { result, queryClient } = renderHookWithProviders(() => useTx());
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const prepared = vi
      .fn()
      .mockResolvedValue(
        "0x0000000000000000000000000000000000000000000000000000000000000001" as TransactionHash
      );

    let resolveReceipt!: () => void;
    const receiptPromise = new Promise<void>((resolve) => {
      resolveReceipt = () => resolve();
    });
    const mockedWait = vi.mocked(waitForTransactionReceipt);
    mockedWait.mockReturnValueOnce(receiptPromise as never);

    expect(result.current.state.status).toBe("idle");

    let execPromise: Promise<void>;
    await act(async () => {
      execPromise = result.current.execute(prepared, {
        invalidate: async () => {
          await queryClient.invalidateQueries({
            queryKey: styfiKeys.account(E2E_MOCK_ADDRESS),
          });
        },
      });
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("mining");
    });

    await act(async () => {
      resolveReceipt!();
      await execPromise!;
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: styfiKeys.account(E2E_MOCK_ADDRESS),
    });
  });

  it("accepts production-shaped submitted copy without changing the mock default", async () => {
    const { result } = renderHookWithProviders(() => useTx());
    const prepared = vi
      .fn()
      .mockResolvedValue(
        "0x0000000000000000000000000000000000000000000000000000000000000002" as TransactionHash
      );

    await act(async () => {
      await result.current.execute(prepared, {
        skipWaitForReceipt: true,
        submittedMessage: "Transaction submitted.",
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Transaction submitted.", {
      id: "toast-id",
    });
    expect(toast.success).not.toHaveBeenCalledWith(
      expect.stringContaining("Mock"),
      expect.anything()
    );
    expect(result.current.state.status).toBe("success");
  });
});
